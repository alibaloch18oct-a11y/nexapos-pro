const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureDiscountCollections(db) {
  db.discounts = Array.isArray(db.discounts) ? db.discounts : [];
  db.discountUsage = Array.isArray(db.discountUsage) ? db.discountUsage : [];
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

function normalizeMethod(method) {
  return String(method || "all").trim().toLowerCase();
}

function calculateSingleDiscount(discount, context) {
  const subtotal = Number(context.subtotal || 0);
  const paymentMethod = normalizeMethod(context.paymentMethod);
  const couponCode = String(context.couponCode || "").trim().toUpperCase();
  const cartItems = Array.isArray(context.items) ? context.items : [];

  if (discount.isActive === false) return null;

  if (Number(discount.minOrderAmount || 0) > subtotal) return null;

  if (discount.type === "payment") {
    const discountMethod = normalizeMethod(discount.paymentMethod);

    if (discountMethod !== "all" && discountMethod !== paymentMethod) {
      return null;
    }
  }

  if (discount.type === "coupon") {
    if (!couponCode || String(discount.code || "").toUpperCase() !== couponCode) {
      return null;
    }
  }

  let baseAmount = subtotal;

  if (discount.type === "item") {
    const targetItems = cartItems.filter((item) => item.id === discount.itemId);

    if (targetItems.length === 0) return null;

    baseAmount = targetItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
      0
    );
  }

  let amount = 0;

  if (discount.valueType === "percent") {
    amount = Math.round(baseAmount * (Number(discount.value || 0) / 100));
  } else {
    amount = Number(discount.value || 0);
  }

  const maxDiscountAmount = Number(discount.maxDiscountAmount || 0);

  if (maxDiscountAmount > 0 && amount > maxDiscountAmount) {
    amount = maxDiscountAmount;
  }

  if (amount <= 0) return null;

  if (amount > subtotal) amount = subtotal;

  return {
    discountId: discount.id,
    name: discount.name,
    type: discount.type,
    code: discount.code || "",
    paymentMethod: discount.paymentMethod || "all",
    valueType: discount.valueType,
    value: Number(discount.value || 0),
    amount
  };
}

function calculateDiscounts(discounts, context) {
  const applied = [];

  for (const discount of discounts) {
    const result = calculateSingleDiscount(discount, context);

    if (result) {
      applied.push(result);
    }
  }

  const totalDiscount = applied.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const subtotal = Number(context.subtotal || 0);
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const tax = Math.round(discountedSubtotal * 0.05);
  const grandTotal = discountedSubtotal + tax;

  return {
    applied,
    subtotal,
    totalDiscount,
    discountedSubtotal,
    tax,
    grandTotal
  };
}

function createDefaultDiscounts(tenantId, branchId) {
  const now = new Date().toISOString();

  return [
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Cash Discount",
      type: "payment",
      paymentMethod: "cash",
      valueType: "percent",
      value: 5,
      code: "",
      minOrderAmount: 500,
      maxDiscountAmount: 300,
      itemId: "",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Card Service Adjustment",
      type: "payment",
      paymentMethod: "card",
      valueType: "percent",
      value: 2,
      code: "",
      minOrderAmount: 1000,
      maxDiscountAmount: 500,
      itemId: "",
      isActive: false,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "SAVE10 Promo",
      type: "coupon",
      paymentMethod: "all",
      valueType: "percent",
      value: 10,
      code: "SAVE10",
      minOrderAmount: 1000,
      maxDiscountAmount: 400,
      itemId: "",
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function ensureTenantDiscounts(db, tenantId, branchId) {
  ensureDiscountCollections(db);

  const existing = db.discounts.filter((discount) => discount.tenantId === tenantId);

  if (existing.length > 0) {
    return existing;
  }

  const defaults = createDefaultDiscounts(tenantId, branchId);
  db.discounts.push(...defaults);

  return defaults;
}

module.exports = function discountRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureDiscountCollections(readDb());

    ensureTenantDiscounts(db, req.user.tenantId, req.user.branchId || null);
    writeDb(db);

    const discounts = db.discounts
      .filter((discount) => discount.tenantId === req.user.tenantId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ discounts });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      name,
      type,
      paymentMethod,
      valueType,
      value,
      code,
      minOrderAmount,
      maxDiscountAmount,
      itemId,
      isActive
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Discount name is required."
      });
    }

    const allowedTypes = ["order", "payment", "item", "coupon"];
    const allowedValueTypes = ["percent", "fixed"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid discount type."
      });
    }

    if (!allowedValueTypes.includes(valueType)) {
      return res.status(400).json({
        message: "Invalid value type."
      });
    }

    if (Number(value || 0) <= 0) {
      return res.status(400).json({
        message: "Discount value must be greater than zero."
      });
    }

    if (type === "coupon" && !code) {
      return res.status(400).json({
        message: "Coupon code is required."
      });
    }

    if (type === "item" && !itemId) {
      return res.status(400).json({
        message: "Item discount requires menu item."
      });
    }

    const db = ensureDiscountCollections(readDb());

    ensureTenantDiscounts(db, req.user.tenantId, req.user.branchId || null);

    if (type === "coupon") {
      const codeExists = db.discounts.some(
        (discount) =>
          discount.tenantId === req.user.tenantId &&
          discount.type === "coupon" &&
          String(discount.code || "").toUpperCase() === String(code || "").toUpperCase()
      );

      if (codeExists) {
        return res.status(409).json({
          message: "Coupon code already exists."
        });
      }
    }

    const now = new Date().toISOString();

    const discount = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      name,
      type,
      paymentMethod: paymentMethod || "all",
      valueType,
      value: Number(value || 0),
      code: type === "coupon" ? String(code || "").toUpperCase() : "",
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountAmount: Number(maxDiscountAmount || 0),
      itemId: type === "item" ? itemId : "",
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now
    };

    db.discounts.push(discount);
    writeDb(db);

    res.status(201).json({
      message: "Discount created.",
      discount
    });
  });

  router.put("/:discountId", tenantOnly, (req, res) => {
    const { discountId } = req.params;

    const {
      name,
      type,
      paymentMethod,
      valueType,
      value,
      code,
      minOrderAmount,
      maxDiscountAmount,
      itemId,
      isActive
    } = req.body;

    const db = ensureDiscountCollections(readDb());

    const discount = db.discounts.find(
      (item) => item.id === discountId && item.tenantId === req.user.tenantId
    );

    if (!discount) {
      return res.status(404).json({
        message: "Discount not found."
      });
    }

    const allowedTypes = ["order", "payment", "item", "coupon"];
    const allowedValueTypes = ["percent", "fixed"];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid discount type."
      });
    }

    if (valueType && !allowedValueTypes.includes(valueType)) {
      return res.status(400).json({
        message: "Invalid value type."
      });
    }

    discount.name = name || discount.name;
    discount.type = type || discount.type;
    discount.paymentMethod = paymentMethod || discount.paymentMethod || "all";
    discount.valueType = valueType || discount.valueType;
    discount.value = value !== undefined ? Number(value || 0) : discount.value;
    discount.code = discount.type === "coupon" ? String(code || discount.code || "").toUpperCase() : "";
    discount.minOrderAmount =
      minOrderAmount !== undefined ? Number(minOrderAmount || 0) : discount.minOrderAmount;
    discount.maxDiscountAmount =
      maxDiscountAmount !== undefined ? Number(maxDiscountAmount || 0) : discount.maxDiscountAmount;
    discount.itemId = discount.type === "item" ? itemId || discount.itemId : "";
    discount.isActive = typeof isActive === "boolean" ? isActive : discount.isActive;
    discount.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Discount updated.",
      discount
    });
  });

  router.patch("/:discountId/toggle", tenantOnly, (req, res) => {
    const { discountId } = req.params;

    const db = ensureDiscountCollections(readDb());

    const discount = db.discounts.find(
      (item) => item.id === discountId && item.tenantId === req.user.tenantId
    );

    if (!discount) {
      return res.status(404).json({
        message: "Discount not found."
      });
    }

    discount.isActive = !discount.isActive;
    discount.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Discount status updated.",
      discount
    });
  });

  router.delete("/:discountId", tenantOnly, (req, res) => {
    const { discountId } = req.params;

    const db = ensureDiscountCollections(readDb());

    const discount = db.discounts.find(
      (item) => item.id === discountId && item.tenantId === req.user.tenantId
    );

    if (!discount) {
      return res.status(404).json({
        message: "Discount not found."
      });
    }

    db.discounts = db.discounts.filter((item) => item.id !== discountId);

    writeDb(db);

    res.json({
      message: "Discount deleted."
    });
  });

  router.post("/calculate", tenantOnly, (req, res) => {
    const {
      subtotal,
      items,
      paymentMethod,
      couponCode
    } = req.body;

    const db = ensureDiscountCollections(readDb());

    const discounts = db.discounts.filter(
      (discount) => discount.tenantId === req.user.tenantId && discount.isActive !== false
    );

    const result = calculateDiscounts(discounts, {
      subtotal,
      items,
      paymentMethod,
      couponCode
    });

    res.json(result);
  });

  return router;
};