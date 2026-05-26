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

function normalizeStatus(order) {
  const status = order.kitchenStatus || order.orderStatus || "new";

  if (status === "placed" || status === "unconfirmed") return "new";
  if (status === "completed") return "served";

  return status;
}

function statusDurationMs(status, settings) {
  const current = status === "placed" ? "new" : status;

  const minutes = {
    new: settings.newToPreparingMinutes,
    preparing: settings.preparingToReadyMinutes,
    ready: settings.readyToRiderPickedMinutes,
    rider_picked: settings.riderPickedToOnWayMinutes,
    rider_on_way: settings.riderOnWayToDeliveredMinutes,
    rider_delivered: settings.deliveredToCashReceivedMinutes
  }[current];

  return Math.max(1, Number(minutes || 1)) * 60 * 1000;
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
      method.includes("cash on delivery") ||
      method === "cod" ||
      method.includes("pay later") ||
      method.includes("unpaid")
    )
  );
}

function nextStatusFor(order) {
  const current = normalizeStatus(order);

  if (current === "new") return "preparing";
  if (current === "preparing") return "ready";

  if (!isDeliveryOrder(order)) {
    if (current === "ready") return "served";
    return null;
  }

  if (current === "ready") return "rider_picked";
  if (current === "rider_picked") return "rider_on_way";
  if (current === "rider_on_way") return "rider_delivered";
  if (current === "rider_delivered" && isCashDelivery(order)) return "cash_received";

  return null;
}

function setOrderStatus(order, nextStatus, actor = "system-auto-timer", changedAt = new Date().toISOString()) {
  order.kitchenStatus = nextStatus;
  if (order.mode === "delivery") {
    order.delivery = { ...(order.delivery || {}), dispatchStatus: nextStatus };
  }
  order.kitchenStatusChangedAt = changedAt;
  order.kitchenStatusChangedBy = actor;
  order.updatedAt = new Date().toISOString();

  if (nextStatus === "served") {
    order.orderStatus = "served";
  } else if (nextStatus === "cash_received") {
    order.paymentStatus = "paid";
    order.paymentMethod = order.paymentMethod || "Cash on Delivery";
    order.cashReceivedAt = changedAt;
    order.orderStatus = "completed";
  } else if (nextStatus === "rider_delivered") {
    order.deliveredAt = changedAt;
    order.orderStatus = "served";
  } else if (!["cancelled", "held"].includes(order.orderStatus)) {
    order.orderStatus = "placed";
  }
}

function ensureKitchenClock(order) {
  if (!order.kitchenStatus) {
    order.kitchenStatus = normalizeStatus(order);
  }

  if (!order.kitchenStatusChangedAt) {
    order.kitchenStatusChangedAt = order.createdAt || order.date || order.updatedAt || new Date().toISOString();
  }
}

function autoProgressOrder(order, settings) {
  if (!settings.autoEnabled) return [];

  ensureKitchenClock(order);

  const progressed = [];
  const now = Date.now();
  let guard = 0;

  while (guard < 8) {
    guard += 1;

    const current = normalizeStatus(order);

    if (["cancelled", "served", "completed", "cash_received"].includes(current)) {
      break;
    }

    const nextStatus = nextStatusFor(order);

    if (!nextStatus) break;

    const changedAtMs = new Date(order.kitchenStatusChangedAt || order.createdAt || Date.now()).getTime();

    if (Number.isNaN(changedAtMs)) break;

    const dueMs = statusDurationMs(current, settings);
    const nextChangeMs = changedAtMs + dueMs;

    if (now < nextChangeMs) break;

    const nextChangedAt = new Date(nextChangeMs).toISOString();
    setOrderStatus(order, nextStatus, "system-auto-timer", nextChangedAt);
    progressed.push(nextStatus);
  }

  return progressed;
}

function visibleKitchenOrder(order) {
  if (order.paymentStatus === "cancelled" || order.orderStatus === "cancelled") return false;

  return ["paid", "unpaid", "complimentary"].includes(order.paymentStatus);
}

function attachTimerMeta(order, settings) {
  ensureKitchenClock(order);

  const current = normalizeStatus(order);
  const nextStatus = nextStatusFor(order);
  const changedAtMs = new Date(order.kitchenStatusChangedAt || order.createdAt || Date.now()).getTime();
  const durationMs = statusDurationMs(current, settings);
  const dueAtMs = changedAtMs + durationMs;
  const now = Date.now();

  order.kdsTimer = {
    currentStatus: current,
    nextStatus,
    changedAt: order.kitchenStatusChangedAt,
    dueAt: nextStatus ? new Date(dueAtMs).toISOString() : null,
    durationSeconds: Math.round(durationMs / 1000),
    elapsedSeconds: Math.max(0, Math.floor((now - changedAtMs) / 1000)),
    remainingSeconds: nextStatus ? Math.max(0, Math.ceil((dueAtMs - now) / 1000)) : 0,
    autoEnabled: Boolean(settings.autoEnabled)
  };

  return order;
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
      const beforeStatus = normalizeStatus(order);

      ensureKitchenClock(order);

      const progressed = autoProgressOrder(order, settings);

      if (progressed.length > 0 || beforeStatus !== normalizeStatus(order)) {
        changed = true;

        db.auditLogs.push({
          id: `audit-${Date.now()}-${order.id || order.orderNo}`,
          tenantId: req.user.tenantId,
          action: "KDS_AUTO_STATUS_PROGRESS",
          actor: "system-auto-timer",
          details: {
            orderId: order.id,
            orderNo: order.orderNo,
            progressed
          },
          createdAt: new Date().toISOString()
        });
      }

      attachTimerMeta(order, settings);
    });

    const orders = tenantOrders.sort(
      (a, b) => new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0)
    );

    if (changed) {
      writeDb(db);
    }

    res.json({
      settings,
      orders,
      serverTime: new Date().toISOString()
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
    const settings = getTenantSettings(db, req.user.tenantId);
    attachTimerMeta(order, settings);

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


