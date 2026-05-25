const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

function ensureStaffCollections(db) {
  db.staff = Array.isArray(db.staff) ? db.staff : [];
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

function defaultStaffForTenant(tenantId, branchId) {
  const now = new Date().toISOString();

  return [
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Ali Waiter",
      phone: "03000000001",
      email: "",
      role: "waiter",
      pin: "1111",
      salary: 35000,
      shift: "Morning",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Rauf Waiter",
      phone: "03000000002",
      email: "",
      role: "waiter",
      pin: "2222",
      salary: 38000,
      shift: "Evening",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Khan Rider",
      phone: "03000000003",
      email: "",
      role: "rider",
      pin: "3333",
      salary: 32000,
      shift: "Full Day",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Kitchen Master",
      phone: "03000000004",
      email: "",
      role: "kitchen",
      pin: "4444",
      salary: 45000,
      shift: "Night",
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: uuid(),
      tenantId,
      branchId: branchId || null,
      name: "Main Cashier",
      phone: "03000000005",
      email: "",
      role: "cashier",
      pin: "5555",
      salary: 42000,
      shift: "Full Day",
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function ensureTenantStaff(db, tenantId, branchId) {
  ensureStaffCollections(db);

  const existing = db.staff.filter((item) => item.tenantId === tenantId);

  if (existing.length > 0) {
    return existing;
  }

  const defaults = defaultStaffForTenant(tenantId, branchId);
  db.staff.push(...defaults);

  return defaults;
}

module.exports = function staffRoutes({ readDb, writeDb }) {
  router.get("/", tenantOnly, (req, res) => {
    const db = ensureStaffCollections(readDb());

    ensureTenantStaff(db, req.user.tenantId, req.user.branchId || null);
    writeDb(db);

    const staff = db.staff
      .filter((item) => item.tenantId === req.user.tenantId)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({ staff });
  });

  router.get("/active", tenantOnly, (req, res) => {
    const db = ensureStaffCollections(readDb());

    ensureTenantStaff(db, req.user.tenantId, req.user.branchId || null);
    writeDb(db);

    const staff = db.staff
      .filter((item) => item.tenantId === req.user.tenantId && item.isActive !== false)
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      staff,
      waiters: staff.filter((item) => item.role === "waiter"),
      riders: staff.filter((item) => item.role === "rider"),
      cashiers: staff.filter((item) => item.role === "cashier"),
      kitchen: staff.filter((item) => item.role === "kitchen"),
      managers: staff.filter((item) => item.role === "manager")
    });
  });

  router.post("/", tenantOnly, (req, res) => {
    const {
      name,
      phone,
      email,
      role,
      pin,
      salary,
      shift,
      isActive
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Staff name is required."
      });
    }

    const allowedRoles = ["waiter", "rider", "cashier", "kitchen", "manager"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid staff role."
      });
    }

    const db = ensureStaffCollections(readDb());

    ensureTenantStaff(db, req.user.tenantId, req.user.branchId || null);

    const now = new Date().toISOString();

    const staffMember = {
      id: uuid(),
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || null,
      name,
      phone: phone || "",
      email: email || "",
      role,
      pin: pin || "",
      salary: Number(salary || 0),
      shift: shift || "Morning",
      isActive: isActive !== false,
      createdAt: now,
      updatedAt: now
    };

    db.staff.push(staffMember);
    writeDb(db);

    res.status(201).json({
      message: "Staff member created.",
      staffMember
    });
  });

  router.put("/:staffId", tenantOnly, (req, res) => {
    const { staffId } = req.params;

    const {
      name,
      phone,
      email,
      role,
      pin,
      salary,
      shift,
      isActive
    } = req.body;

    const allowedRoles = ["waiter", "rider", "cashier", "kitchen", "manager"];

    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid staff role."
      });
    }

    const db = ensureStaffCollections(readDb());

    const staffMember = db.staff.find(
      (item) => item.id === staffId && item.tenantId === req.user.tenantId
    );

    if (!staffMember) {
      return res.status(404).json({
        message: "Staff member not found."
      });
    }

    staffMember.name = name || staffMember.name;
    staffMember.phone = phone ?? staffMember.phone;
    staffMember.email = email ?? staffMember.email;
    staffMember.role = role || staffMember.role;
    staffMember.pin = pin ?? staffMember.pin;
    staffMember.salary = salary !== undefined ? Number(salary || 0) : staffMember.salary;
    staffMember.shift = shift || staffMember.shift;
    staffMember.isActive = typeof isActive === "boolean" ? isActive : staffMember.isActive;
    staffMember.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Staff member updated.",
      staffMember
    });
  });

  router.patch("/:staffId/toggle", tenantOnly, (req, res) => {
    const { staffId } = req.params;

    const db = ensureStaffCollections(readDb());

    const staffMember = db.staff.find(
      (item) => item.id === staffId && item.tenantId === req.user.tenantId
    );

    if (!staffMember) {
      return res.status(404).json({
        message: "Staff member not found."
      });
    }

    staffMember.isActive = !staffMember.isActive;
    staffMember.updatedAt = new Date().toISOString();

    writeDb(db);

    res.json({
      message: "Staff status updated.",
      staffMember
    });
  });

  router.delete("/:staffId", tenantOnly, (req, res) => {
    const { staffId } = req.params;

    const db = ensureStaffCollections(readDb());

    const staffMember = db.staff.find(
      (item) => item.id === staffId && item.tenantId === req.user.tenantId
    );

    if (!staffMember) {
      return res.status(404).json({
        message: "Staff member not found."
      });
    }

    db.staff = db.staff.filter((item) => item.id !== staffId);

    writeDb(db);

    res.json({
      message: "Staff member deleted."
    });
  });

  return router;
};