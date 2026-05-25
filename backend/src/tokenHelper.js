function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ensureTokenStore(db) {
  db.tokenCounters = Array.isArray(db.tokenCounters) ? db.tokenCounters : [];
  return db;
}

function nextToken(db, tenantId, type) {
  ensureTokenStore(db);

  const date = todayKey();

  let counter = db.tokenCounters.find(
    (item) => item.tenantId === tenantId && item.date === date && item.type === type
  );

  if (!counter) {
    counter = {
      id: `token-${tenantId}-${type}-${date}`,
      tenantId,
      type,
      date,
      current: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.tokenCounters.push(counter);
  }

  counter.current += 1;
  counter.updatedAt = new Date().toISOString();

  const prefix = type === "kitchen" ? "K" : "C";
  return `${prefix}-${String(counter.current).padStart(3, "0")}`;
}

function attachOrderTokens(db, order, tenantId) {
  if (!order.customerToken) {
    order.customerToken = nextToken(db, tenantId, "customer");
  }

  if (!order.kitchenToken) {
    order.kitchenToken = nextToken(db, tenantId, "kitchen");
  }

  order.tokenDate = todayKey();
  return order;
}

module.exports = {
  attachOrderTokens,
  nextToken,
  todayKey
};