const express = require("express");

const router = express.Router();

const defaultKdsSettings = {
  autoEnabled: true,
  newToPreparingMinutes: 2,
  preparingToReadyMinutes: 8,
  readyToRiderPickedMinutes: 2,
  riderPickedToOnWayMinutes: 2,
  riderOnWayToDeliveredMinutes: 20,
  deliveredToCashReceivedMinutes: 3
};

const allowedStatuses = [
  "new",
  "placed",
  "preparing",
  "ready",
  "served",
  "completed",
  "cancelled",
  "rider_picked",
  "rider_on_way",
  "rider_delivered",
  "cash_received"
];

function ensureCollections(db) {
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.kdsSettings = Array.isArray(db.kdsSettings) ? db.kdsSettings : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({
      message: "Restaurant account access required."
    });
  }

  next();
}

function getTenantSettings(db, tenantId) {
  let settings = db.kdsSettings.find((item) => item.tenantId === tenantId);

  if (!settings) {
    settings = {
      id: `kds-settings-${tenantId}`,
      tenantId,
      ...defaultKdsSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.kdsSettings.push(settings);
  }

  return {
    ...defaultKdsSettings,
    ...settings
  };
}

function minutesSince(value) {
  const date = new Date(value || Date.now()).getTime();

  if (Number.isNaN(date)) return 0;

  return Math.max(0, Math.floor((Date.now() - date) / 60000));
}

function normalizeStatus(order) {
  const status = order.kitchenStatus || order.orderStatus || "new";

  if (status === "placed" || status === "unconfirmed") return "new";
  if (status === "completed") return "served";

  return status;
}

function isDeliveryOrder(order) {
  return order.mode === "delivery";
}

function isCashDelivery(order) {
  const method = String(order.paymentMethod || "").toLowerCase();
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();

  return (
    isDeliveryOrder(order) &&
    (
      paymentStatus === "unpaid" ||
      method.includes("cash") ||
      method.includes("cod") ||
      method.includes("pay later") ||
      method.includes("unpaid")
    )
  );
}

function setOrderStatus(order, nextStatus, actor = "system-auto-timer") {
  order.kitchenStatus = nextStatus;
  order.kitchenStatusChangedAt = new Date().toISOString();
  order.kitchenStatusChangedBy = actor;
  order.updatedAt = new Date().toISOString();

  if (nextStatus === "served") {
    order.orderStatus = "served";
  } else if (nextStatus === "cash_received") {
    order.paymentStatus = "paid";
    order.paymentMethod = order.paymentMethod || "Cash on Delivery";
    order.orderStatus = "completed";
  } else if (["rider_delivered"].includes(nextStatus)) {
    order.orderStatus = "served";
  } else if (!["cancelled", "held"].includes(order.orderStatus)) {
    order.orderStatus = "placed";
  }
}

function autoProgressOrder(order, settings) {
  if (!settings.autoEnabled) return null;

  const current = normalizeStatus(order);

  if (["cancelled", "served", "completed", "cash_received"].includes(current)) {
    return null;
  }

  const changedAt = order.kitchenStatusChangedAt || order.updatedAt || order.createdAt || order.date || new Date().toISOString();
  const elapsed = minutesSince(changedAt);

  if (current === "new" && elapsed >= Number(settings.newToPreparingMinutes || 2)) {
    setOrderStatus(order, "preparing");
    return "preparing";
  }

  if (current === "preparing" && elapsed >= Number(settings.preparingToReadyMinutes || 8)) {
    setOrderStatus(order, "ready");
    return "ready";
  }

  if (isDeliveryOrder(order)) {
    if (current === "ready" && elapsed >= Number(settings.readyToRiderPickedMinutes || 2)) {
      setOrderStatus(order, "rider_picked");
      return "rider_picked";
    }

    if (current === "rider_picked" && elapsed >= Number(settings.riderPickedToOnWayMinutes || 2)) {
      setOrderStatus(order, "rider_on_way");
      return "rider_on_way";
    }

    if (current === "rider_on_way" && elapsed >= Number(settings.riderOnWayToDeliveredMinutes || 20)) {
      setOrderStatus(order, "rider_delivered");
      return "rider_delivered";
    }

    if (
      current === "rider_delivered" &&
      isCashDelivery(order) &&
      elapsed >= Number(settings.deliveredToCashReceivedMinutes || 3)
    ) {
      setOrderStatus(order, "cash_received");
      return "cash_received";
    }
  }

  return null;
}

function visibleKitchenOrder(order) {
  if (order.paymentStatus === "cancelled" || order.orderStatus === "cancelled") return false;

  return ["paid", "unpaid", "complimentary"].includes(order.paymentStatus);
}

module.exports = function kdsAutoRoutes({ readDb, writeDb }) {
  router.get("/settings", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const settings = getTenantSettings(db, req.user.tenantId);

    writeDb(db);

    res.json({ settings });
  });

  router.patch("/settings", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const settings = getTenantSettings(db, req.user.tenantId);

    const numericKeys = [
      "newToPreparingMinutes",
      "preparingToReadyMinutes",
      "readyToRiderPickedMinutes",
      "riderPickedToOnWayMinutes",
      "riderOnWayToDeliveredMinutes",
      "deliveredToCashReceivedMinutes"
    ];

    if (typeof req.body.autoEnabled === "boolean") {
      settings.autoEnabled = req.body.autoEnabled;
    }

    numericKeys.forEach((key) => {
      if (req.body[key] !== undefined) {
        settings[key] = Math.max(1, Number(req.body[key] || defaultKdsSettings[key]));
      }
    });

    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = req.user.username;

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "KDS_SETTINGS_UPDATED",
      actor: req.user.username,
      details: settings,
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "KDS timer settings updated.",
      settings
    });
  });

  router.get("/board", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const settings = getTenantSettings(db, req.user.tenantId);

    let changed = false;

    const tenantOrders = db.orders.filter(
      (order) => order.tenantId === req.user.tenantId && visibleKitchenOrder(order)
    );

    tenantOrders.forEach((order) => {
      if (!order.kitchenStatusChangedAt) {
        order.kitchenStatusChangedAt = order.createdAt || order.date || new Date().toISOString();
        order.kitchenStatus = normalizeStatus(order);
        changed = true;
      }

      const nextStatus = autoProgressOrder(order, settings);

      if (nextStatus) {
        changed = true;

        db.auditLogs.push({
          id: `audit-${Date.now()}-${order.id}`,
          tenantId: req.user.tenantId,
          action: "KDS_AUTO_STATUS_PROGRESS",
          actor: "system-auto-timer",
          details: {
            orderId: order.id,
            orderNo: order.orderNo,
            nextStatus
          },
          createdAt: new Date().toISOString()
        });
      }
    });

    const orders = tenantOrders.sort(
      (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date)
    );

    if (changed) {
      writeDb(db);
    }

    res.json({
      settings,
      orders
    });
  });

  router.patch("/orders/:orderId/status", tenantOnly, (req, res) => {
    const { orderId } = req.params;
    const { kitchenStatus } = req.body;

    if (!allowedStatuses.includes(kitchenStatus)) {
      return res.status(400).json({
        message: "Invalid kitchen status."
      });
    }

    const db = ensureCollections(readDb());

    const order = db.orders.find(
      (item) =>
        item.tenantId === req.user.tenantId &&
        (item.id === orderId || item.orderNo === orderId)
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    setOrderStatus(order, kitchenStatus, req.user.username);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "KDS_MANUAL_STATUS_UPDATE",
      actor: req.user.username,
      details: {
        orderId: order.id,
        orderNo: order.orderNo,
        kitchenStatus
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Kitchen status updated.",
      order
    });
  });

  return router;
};