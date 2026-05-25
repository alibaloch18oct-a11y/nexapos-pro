const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureCollections(db) {
  db.expenses = Array.isArray(db.expenses) ? db.expenses : [];
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

module.exports = function expenseRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const range = req.query.range || "all";
    const startDate = startDateForRange(range);

    const db = ensureCollections(readDb());

    const expenses = db.expenses
      .filter((expense) => expense.tenantId === req.user.tenantId)
      .filter((expense) => {
        if (!startDate) return true;

        const expenseDate = new Date(expense.expenseDate || expense.createdAt || Date.now());
        return expenseDate >= startDate;
      })
      .sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt));

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const paidExpenses = expenses
      .filter((expense) => expense.paymentStatus === "paid")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const unpaidExpenses = expenses
      .filter((expense) => expense.paymentStatus !== "paid")
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const categoryMap = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      categoryMap[category] = Number(categoryMap[category] || 0) + Number(expense.amount || 0);
    });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({
      expenses,
      stats: {
        totalExpenses,
        paidExpenses,
        unpaidExpenses,
        totalRecords: expenses.length
      },
      categoryBreakdown
    });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      title,
      category,
      amount,
      paymentMethod,
      paymentStatus,
      expenseDate,
      vendorName,
      notes
    } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        message: "Expense title and amount are required."
      });
    }

    const db = ensureCollections(readDb());
    const now = new Date().toISOString();

    const expense = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      title,
      category: category || "Other",
      amount: Number(amount || 0),
      paymentMethod: paymentMethod || "Cash",
      paymentStatus: paymentStatus || "paid",
      expenseDate: expenseDate || now.slice(0, 10),
      vendorName: vendorName || "",
      notes: notes || "",
      createdBy: req.user.username,
      createdAt: now,
      updatedAt: now
    };

    db.expenses.push(expense);

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "EXPENSE_CREATED",
      actor: req.user.username,
      details: {
        expenseId: expense.id,
        title: expense.title,
        category: expense.category,
        amount: expense.amount
      },
      createdAt: now
    });

    writeDb(db);

    res.status(201).json({
      message: "Expense created successfully.",
      expense
    });
  });

  router.put("/:expenseId", tenantOnly, (req, res) => {
    const { expenseId } = req.params;

    const {
      title,
      category,
      amount,
      paymentMethod,
      paymentStatus,
      expenseDate,
      vendorName,
      notes
    } = req.body;

    const db = ensureCollections(readDb());

    const expense = db.expenses.find(
      (item) => item.id === expenseId && item.tenantId === req.user.tenantId
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found."
      });
    }

    expense.title = title || expense.title;
    expense.category = category || expense.category;
    expense.amount = amount !== undefined ? Number(amount || 0) : expense.amount;
    expense.paymentMethod = paymentMethod || expense.paymentMethod;
    expense.paymentStatus = paymentStatus || expense.paymentStatus;
    expense.expenseDate = expenseDate || expense.expenseDate;
    expense.vendorName = vendorName ?? expense.vendorName;
    expense.notes = notes ?? expense.notes;
    expense.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Expense updated successfully.",
      expense
    });
  });

  router.delete("/:expenseId", tenantOnly, (req, res) => {
    const { expenseId } = req.params;

    const db = ensureCollections(readDb());

    const expense = db.expenses.find(
      (item) => item.id === expenseId && item.tenantId === req.user.tenantId
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found."
      });
    }

    db.expenses = db.expenses.filter(
      (item) => !(item.id === expenseId && item.tenantId === req.user.tenantId)
    );

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId: req.user.tenantId,
      action: "EXPENSE_DELETED",
      actor: req.user.username,
      details: {
        expenseId,
        title: expense.title,
        amount: expense.amount
      },
      createdAt: new Date().toISOString()
    });

    writeDb(db);

    res.json({
      message: "Expense deleted successfully."
    });
  });

  return router;
};