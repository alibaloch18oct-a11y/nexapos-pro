const express = require("express");

const router = express.Router();

function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({
      message: "Restaurant account access required."
    });
  }

  next();
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.name)
    .map((item, index) => {
      const qty = Math.max(1, Number(item.qty || item.quantity || 1));
      const price = Math.max(0, Number(item.price || 0));

      return {
        ...item,
        id: item.id || `edited-item-${Date.now()}-${index}`,
        name: item.name,
        category: item.category || "Menu",
        subtitle: item.subtitle || item.category || "Menu Item",
        price,
        qty,
        quantity: qty,
        lineTotal: qty * price
      };
    });
}

function recalculateOrder(order, nextItems) {
  const items = normalizeItems(nextItems);
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);

  const systemDiscountAmount = Number(order.systemDiscountAmount || order.discountAmount || 0);
  const loyaltyRedeemedAmount = Number(order.loyaltyRedeemedAmount || 0);
  const safeDiscount = Math.min(subtotal, Math.max(0, systemDiscountAmount));

  const discountedSubtotal = Math.max(0, subtotal - safeDiscount);
  const taxPercent = Number(order.taxPercent || order.restaurantSettings?.taxPercent || 0);
  const serviceChargePercent = Number(order.serviceChargePercent || order.restaurantSettings?.serviceChargePercent || 0);

  const tax = Math.round(discountedSubtotal * (taxPercent / 100));
  const serviceChargeAmount = Math.round(discountedSubtotal * (serviceChargePercent / 100));
  const total = Math.max(0, discountedSubtotal + tax + serviceChargeAmount - loyaltyRedeemedAmount);

  return {
    items,
    subtotal,
    tax,
    serviceChargeAmount,
    total,
    originalTotal: subtotal + tax + serviceChargeAmount,
    discountAmount: safeDiscount + loyaltyRedeemedAmount,
    systemDiscountAmount: safeDiscount,
    loyaltyRedeemedAmount,
    taxPercent,
    serviceChargePercent
  };
}

function normalizePaymentMethod(method) {
  const raw = String(method || "Cash").trim();
  if (!raw) return "Cash";

  const key = raw.toLowerCase();
  if (key.includes("cash on delivery") || key === "cod") return "Cash on Delivery";
  if (key.includes("card")) return "Card";
  if (key.includes("easy")) return "Easypaisa";
  if (key.includes("jazz")) return "JazzCash";
  if (key.includes("bank")) return "Bank Transfer";
  if (key.includes("cash")) return "Cash";
  return raw;
}

module.exports = function orderEditRoutes({ readDb, writeDb, findOrderForTenant, saveOrderRecord, addAuditLog }) {
  router.patch("/:orderId", tenantOnly, async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await findOrderForTenant(req.user.tenantId, orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found."
        });
      }

      if (order.orderStatus === "cancelled" || order.paymentStatus === "cancelled") {
        return res.status(400).json({
          message: "Cancelled order cannot be edited."
        });
      }

      const before = {
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        serviceChargeAmount: order.serviceChargeAmount,
        total: order.total,
        orderStatus: order.orderStatus,
        kitchenStatus: order.kitchenStatus
      };

      const recalculated = recalculateOrder(order, req.body.items);

      order.items = recalculated.items;
      order.subtotal = recalculated.subtotal;
      order.tax = recalculated.tax;
      order.serviceChargeAmount = recalculated.serviceChargeAmount;
      order.total = recalculated.total;
      order.originalTotal = recalculated.originalTotal;
      order.discountAmount = recalculated.discountAmount;
      order.systemDiscountAmount = recalculated.systemDiscountAmount;
      order.loyaltyRedeemedAmount = recalculated.loyaltyRedeemedAmount;

      order.orderInstructions = req.body.orderInstructions ?? order.orderInstructions;
      order.customer = req.body.customer ?? order.customer;
      order.phone = req.body.phone ?? order.phone;

      const requestedOrderStatus = String(req.body.orderStatus || order.orderStatus || "placed").trim().toLowerCase();
      const requestedKitchenStatus = String(req.body.kitchenStatus || order.kitchenStatus || "placed").trim().toLowerCase();

      order.orderStatus = requestedOrderStatus === "served" ? "completed" : requestedOrderStatus;
      order.kitchenStatus = requestedKitchenStatus === "served" ? "completed" : requestedKitchenStatus;
      order.editedAt = new Date().toISOString();
      order.editedBy = req.user.username;
      order.updatedAt = new Date().toISOString();

      const savedOrder = await saveOrderRecord(order);

      await addAuditLog({
        tenantId: req.user.tenantId,
        action: "ORDER_EDITED",
        actor: req.user.username,
        details: {
          orderId: savedOrder.id,
          orderNo: savedOrder.orderNo,
          before,
          after: {
            items: savedOrder.items,
            subtotal: savedOrder.subtotal,
            tax: savedOrder.tax,
            serviceChargeAmount: savedOrder.serviceChargeAmount,
            total: savedOrder.total,
            orderStatus: savedOrder.orderStatus,
            kitchenStatus: savedOrder.kitchenStatus
          }
        }
      });

      res.json({
        message: "Order updated successfully.",
        order: savedOrder
      });
    } catch (error) {
      console.error("Order edit error:", error);
      res.status(500).json({ message: "Failed to edit order." });
    }
  });

  router.patch("/:orderId/pay", tenantOnly, async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await findOrderForTenant(req.user.tenantId, orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found."
        });
      }

      if (order.paymentStatus === "cancelled" || order.orderStatus === "cancelled") {
        return res.status(400).json({
          message: "Cancelled order cannot be paid."
        });
      }

      if (order.paymentStatus === "paid" || order.paymentStatus === "complimentary") {
        return res.status(400).json({
          message: "Order is already paid."
        });
      }

      const paymentMethod = normalizePaymentMethod(req.body.paymentMethod || order.paymentMethod);
      const amountReceived = Number(req.body.amountReceived || order.total || 0);

      const before = {
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt
      };

      order.paymentStatus = "paid";
      order.paymentMethod = paymentMethod;
      order.amountReceived = amountReceived;
      order.paymentReference = req.body.paymentReference || "";
      order.paymentNote = req.body.note || "Marked paid from Orders Panel";
      order.paidAt = new Date().toISOString();
      order.paidBy = req.user.username;
      order.updatedAt = new Date().toISOString();

      if (order.kitchenStatus === "cash_received" || order.kitchenStatus === "served") {
        order.orderStatus = "completed";
        order.kitchenStatus = "completed";
      } else if (order.orderStatus === "served") {
        order.orderStatus = "completed";
      } else if (!["completed"].includes(order.orderStatus)) {
        order.orderStatus = order.orderStatus || "placed";
      }

      const savedOrder = await saveOrderRecord(order);

      await addAuditLog({
        tenantId: req.user.tenantId,
        action: "ORDER_MARKED_PAID",
        actor: req.user.username,
        details: {
          orderId: savedOrder.id,
          orderNo: savedOrder.orderNo,
          before,
          after: {
            paymentStatus: savedOrder.paymentStatus,
            paymentMethod: savedOrder.paymentMethod,
            amountReceived: savedOrder.amountReceived,
            paidAt: savedOrder.paidAt
          }
        }
      });

      res.json({
        message: "Order marked as paid successfully.",
        order: savedOrder
      });
    } catch (error) {
      console.error("Order pay error:", error);
      res.status(500).json({ message: "Failed to mark order paid." });
    }
  });

  router.patch("/:orderId/cancel", tenantOnly, async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await findOrderForTenant(req.user.tenantId, orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found."
        });
      }

      const before = {
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        kitchenStatus: order.kitchenStatus
      };

      order.paymentStatus = "cancelled";
      order.orderStatus = "cancelled";
      order.kitchenStatus = "cancelled";
      order.cancelReason = req.body.reason || "Cancelled from Orders Panel";
      order.cancelledAt = new Date().toISOString();
      order.cancelledBy = req.user.username;
      order.updatedAt = new Date().toISOString();

      const savedOrder = await saveOrderRecord(order);

      await addAuditLog({
        tenantId: req.user.tenantId,
        action: "ORDER_CANCELLED",
        actor: req.user.username,
        details: {
          orderId: savedOrder.id,
          orderNo: savedOrder.orderNo,
          before,
          reason: savedOrder.cancelReason
        }
      });

      res.json({
        message: "Order cancelled successfully.",
        order: savedOrder
      });
    } catch (error) {
      console.error("Order cancel error:", error);
      res.status(500).json({ message: "Failed to cancel order." });
    }
  });

  return router;
};
