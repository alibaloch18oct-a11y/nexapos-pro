const express = require("express");

const router = express.Router();

function ensureCollections(db) {
  db.orders = Array.isArray(db.orders) ? db.orders : [];
  db.inventory = Array.isArray(db.inventory) ? db.inventory : [];
  db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
  db.staff = Array.isArray(db.staff) ? db.staff : [];
  db.expenses = Array.isArray(db.expenses) ? db.expenses : [];
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

function startDateForRange(range) {
  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "7d") {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "30d") {
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (range === "90d") {
    start.setDate(now.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  return null;
}

function normalizeMode(mode) {
  const map = {
    dine_in: "Dine In",
    take_away: "Take Away",
    delivery: "Delivery",
    drive_thru: "Drive Thru",
    walk_in: "Walk In",
    kiosk: "Kiosk"
  };

  return map[mode] || mode || "Unknown";
}

function addToMap(map, key, amount) {
  const safeKey = key || "Unknown";
  map[safeKey] = Number(map[safeKey] || 0) + Number(amount || 0);
}

function getUnitCost(item, inventory, menuItems) {
  const menuItem = menuItems.find((menu) => menu.id === item.id || menu.name === item.name);

  if (menuItem?.costPrice !== undefined) return Number(menuItem.costPrice || 0);
  if (menuItem?.cost !== undefined) return Number(menuItem.cost || 0);

  const stockItem = inventory.find(
    (stock) =>
      String(stock.name || "").toLowerCase() === String(item.name || "").toLowerCase() ||
      String(stock.itemName || "").toLowerCase() === String(item.name || "").toLowerCase()
  );

  if (stockItem?.costPrice !== undefined) return Number(stockItem.costPrice || 0);
  if (stockItem?.unitCost !== undefined) return Number(stockItem.unitCost || 0);

  const price = Number(item.price || 0);
  return Math.round(price * 0.45);
}

module.exports = function analyticsRoutes({ readDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const range = req.query.range || "today";
    const db = ensureCollections(readDb());
    const startDate = startDateForRange(range);

    const tenantOrders = db.orders
      .filter((order) => order.tenantId === req.user.tenantId)
      .filter((order) => {
        if (!startDate) return true;
        const createdAt = new Date(order.createdAt || order.date || Date.now());
        return createdAt >= startDate;
      });

    const tenantExpenses = db.expenses
      .filter((expense) => expense.tenantId === req.user.tenantId)
      .filter((expense) => {
        if (!startDate) return true;
        const expenseDate = new Date(expense.expenseDate || expense.createdAt || Date.now());
        return expenseDate >= startDate;
      });

    const paidOrders = tenantOrders.filter((order) =>
      ["paid", "complimentary"].includes(order.paymentStatus)
    );

    const salesOrders = tenantOrders.filter((order) => order.paymentStatus === "paid");

    const totalSales = salesOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const unpaidAmount = tenantOrders
      .filter((order) => order.paymentStatus === "unpaid")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const totalDiscounts = tenantOrders.reduce(
      (sum, order) => sum + Number(order.discountAmount || 0),
      0
    );

    const totalTax = tenantOrders.reduce((sum, order) => sum + Number(order.tax || 0), 0);

    const totalServiceCharges = tenantOrders.reduce(
      (sum, order) => sum + Number(order.serviceChargeAmount || 0),
      0
    );

    const totalExpenses = tenantExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const unpaidExpenses = tenantExpenses
      .filter((expense) => expense.paymentStatus !== "paid")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const inventory = db.inventory.filter((item) => item.tenantId === req.user.tenantId);
    const menuItems = db.menuItems.filter((item) => item.tenantId === req.user.tenantId);

    const itemStats = {};
    const modeSales = {};
    const paymentSales = {};
    const staffStats = {};
    const riderStats = {};
    const cashierStats = {};
    const expenseCategoryMap = {};

    let estimatedCost = 0;

    paidOrders.forEach((order) => {
      const orderTotal = Number(order.total || 0);

      addToMap(modeSales, normalizeMode(order.mode), orderTotal);
      addToMap(paymentSales, order.paymentMethod || "Unknown", orderTotal);

      if (order.waiterName) {
        if (!staffStats[order.waiterName]) {
          staffStats[order.waiterName] = { name: order.waiterName, orders: 0, sales: 0 };
        }
        staffStats[order.waiterName].orders += 1;
        staffStats[order.waiterName].sales += orderTotal;
      }

      if (order.riderName) {
        if (!riderStats[order.riderName]) {
          riderStats[order.riderName] = { name: order.riderName, orders: 0, sales: 0 };
        }
        riderStats[order.riderName].orders += 1;
        riderStats[order.riderName].sales += orderTotal;
      }

      if (order.cashierName) {
        if (!cashierStats[order.cashierName]) {
          cashierStats[order.cashierName] = { name: order.cashierName, orders: 0, sales: 0 };
        }
        cashierStats[order.cashierName].orders += 1;
        cashierStats[order.cashierName].sales += orderTotal;
      }

      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach((item) => {
        const qty = Number(item.qty || 1);
        const price = Number(item.price || 0);
        const lineTotal = qty * price;
        const unitCost = getUnitCost(item, inventory, menuItems);
        const lineCost = qty * unitCost;

        estimatedCost += lineCost;

        const key = item.id || item.name;

        if (!itemStats[key]) {
          itemStats[key] = {
            id: item.id || key,
            name: item.name || "Unknown Item",
            category: item.category || "Menu",
            qty: 0,
            sales: 0,
            estimatedCost: 0,
            estimatedProfit: 0
          };
        }

        itemStats[key].qty += qty;
        itemStats[key].sales += lineTotal;
        itemStats[key].estimatedCost += lineCost;
        itemStats[key].estimatedProfit = itemStats[key].sales - itemStats[key].estimatedCost;
      });
    });

    tenantExpenses.forEach((expense) => {
      addToMap(expenseCategoryMap, expense.category || "Other", Number(expense.amount || 0));
    });

    const estimatedGrossProfit = totalSales - estimatedCost;
    const estimatedNetProfit = estimatedGrossProfit - totalExpenses;
    const profitMargin = totalSales > 0 ? Math.round((estimatedGrossProfit / totalSales) * 100) : 0;
    const netProfitMargin = totalSales > 0 ? Math.round((estimatedNetProfit / totalSales) * 100) : 0;
    const averageOrderValue = salesOrders.length > 0 ? Math.round(totalSales / salesOrders.length) : 0;

    const topItems = Object.values(itemStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 12);

    const modeBreakdown = Object.entries(modeSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const paymentBreakdown = Object.entries(paymentSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const expenseBreakdown = Object.entries(expenseCategoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const waiterPerformance = Object.values(staffStats).sort((a, b) => b.sales - a.sales).slice(0, 10);
    const riderPerformance = Object.values(riderStats).sort((a, b) => b.sales - a.sales).slice(0, 10);
    const cashierPerformance = Object.values(cashierStats).sort((a, b) => b.sales - a.sales).slice(0, 10);

    const dailySalesMap = {};
    const dailyExpenseMap = {};

    salesOrders.forEach((order) => {
      const date = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10);
      addToMap(dailySalesMap, date, Number(order.total || 0));
    });

    tenantExpenses.forEach((expense) => {
      const date = new Date(expense.expenseDate || expense.createdAt || Date.now()).toISOString().slice(0, 10);
      addToMap(dailyExpenseMap, date, Number(expense.amount || 0));
    });

    const allDates = [...new Set([...Object.keys(dailySalesMap), ...Object.keys(dailyExpenseMap)])];

    const dailySales = allDates
      .map((date) => ({
        date,
        sales: Number(dailySalesMap[date] || 0),
        expenses: Number(dailyExpenseMap[date] || 0),
        net: Number(dailySalesMap[date] || 0) - Number(dailyExpenseMap[date] || 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      range,
      stats: {
        totalOrders: tenantOrders.length,
        paidOrders: salesOrders.length,
        unpaidOrders: tenantOrders.filter((order) => order.paymentStatus === "unpaid").length,
        totalSales,
        unpaidAmount,
        totalDiscounts,
        totalTax,
        totalServiceCharges,
        estimatedCost,
        estimatedGrossProfit,
        totalExpenses,
        unpaidExpenses,
        estimatedNetProfit,
        profitMargin,
        netProfitMargin,
        averageOrderValue
      },
      topItems,
      modeBreakdown,
      paymentBreakdown,
      expenseBreakdown,
      waiterPerformance,
      riderPerformance,
      cashierPerformance,
      dailySales
    });
  });

  return router;
};