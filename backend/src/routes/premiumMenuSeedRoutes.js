const express = require("express");
const { v4: uuid } = require("uuid");
const { premiumCategories, premiumMenuItems } = require("../premiumMenuData");

const router = express.Router();

function ensureCollections(db) {
  db.menuCategories = Array.isArray(db.menuCategories) ? db.menuCategories : [];
  db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
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

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

module.exports = function premiumMenuSeedRoutes({ readDb, writeDb }) {
  router.post("/premium-menu", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const tenantId = req.user.tenantId;
    const now = new Date().toISOString();

    const existingTenantItems = db.menuItems.filter((item) => item.tenantId === tenantId);
    const force = req.body?.force === true;

    if (existingTenantItems.length > 0 && !force) {
      return res.json({
        message: "Menu already has items. Send { force: true } to replace premium seed menu.",
        skipped: true,
        existingItems: existingTenantItems.length
      });
    }

    if (force) {
      db.menuItems = db.menuItems.filter((item) => item.tenantId !== tenantId);
      db.menuCategories = db.menuCategories.filter((category) => category.tenantId !== tenantId);
    }

    const categoryByName = new Map();

    premiumCategories.forEach((name, index) => {
      const category = {
        id: `cat-${tenantId}-${slug(name)}`,
        tenantId,
        name,
        description: `${name} menu category`,
        sortOrder: index + 1,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      categoryByName.set(name, category);
      db.menuCategories.push(category);
    });

    premiumMenuItems.forEach((entry, index) => {
      const [categoryName, name, subtitle, price, emoji, imageUrl] = entry;
      const category = categoryByName.get(categoryName);

      db.menuItems.push({
        id: uuid(),
        tenantId,
        categoryId: category.id,
        category: categoryName,
        categoryName,
        name,
        subtitle,
        description: subtitle,
        price: Number(price || 0),
        costPrice: 0,
        emoji,
        imageUrl,
        image: imageUrl,
        sku: `MENU-${String(index + 1).padStart(3, "0")}`,
        isActive: true,
        isAvailable: true,
        preparationTime: 15,
        tags: [categoryName, "premium-menu"],
        createdAt: now,
        updatedAt: now
      });
    });

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId,
      action: "PREMIUM_MENU_SEEDED",
      actor: req.user.username,
      details: {
        categories: premiumCategories.length,
        items: premiumMenuItems.length,
        force
      },
      createdAt: now
    });

    writeDb(db);

    res.json({
      message: "Premium menu seeded successfully.",
      categories: premiumCategories.length,
      items: premiumMenuItems.length
    });
  });

  return router;
};