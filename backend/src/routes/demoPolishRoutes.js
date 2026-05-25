const express = require("express");
const { v4: uuid } = require("uuid");

const router = express.Router();

const categories = [
  "Burgers",
  "Pizza",
  "Broast",
  "BBQ",
  "Karahi",
  "Rice",
  "Rolls",
  "Shawarma",
  "Fries & Sides",
  "Deals",
  "Drinks",
  "Desserts",
  "Tea & Coffee"
];

const menu = [
  ["Burgers", "Zinger Burger", 650, "https://source.unsplash.com/900x700/?zinger-burger"],
  ["Burgers", "Beef Smash Burger", 950, "https://source.unsplash.com/900x700/?smash-burger"],
  ["Burgers", "Grilled Chicken Burger", 720, "https://source.unsplash.com/900x700/?chicken-burger"],
  ["Burgers", "Double Cheese Burger", 990, "https://source.unsplash.com/900x700/?cheese-burger"],
  ["Pizza", "Chicken Fajita Pizza", 1390, "https://source.unsplash.com/900x700/?fajita-pizza"],
  ["Pizza", "Pepperoni Pizza", 1550, "https://source.unsplash.com/900x700/?pepperoni-pizza"],
  ["Pizza", "BBQ Ranch Pizza", 1590, "https://source.unsplash.com/900x700/?bbq-pizza"],
  ["Pizza", "Cheese Lovers Pizza", 1490, "https://source.unsplash.com/900x700/?cheese-pizza"],
  ["Broast", "Chicken Broast 2 Pc", 560, "https://source.unsplash.com/900x700/?fried-chicken"],
  ["Broast", "Spicy Broast", 620, "https://source.unsplash.com/900x700/?crispy-chicken"],
  ["Broast", "Hot Wings 6 Pc", 590, "https://source.unsplash.com/900x700/?chicken-wings"],
  ["BBQ", "Chicken Tikka", 520, "https://source.unsplash.com/900x700/?chicken-tikka"],
  ["BBQ", "Malai Boti", 980, "https://source.unsplash.com/900x700/?bbq-chicken"],
  ["BBQ", "Seekh Kabab", 760, "https://source.unsplash.com/900x700/?seekh-kebab"],
  ["Karahi", "Chicken Karahi Half", 1390, "https://source.unsplash.com/900x700/?chicken-karahi"],
  ["Karahi", "Mutton Karahi", 3990, "https://source.unsplash.com/900x700/?mutton-karahi"],
  ["Rice", "Chicken Biryani", 430, "https://source.unsplash.com/900x700/?chicken-biryani"],
  ["Rice", "Fried Rice", 640, "https://source.unsplash.com/900x700/?fried-rice"],
  ["Rolls", "Chicken Paratha Roll", 360, "https://source.unsplash.com/900x700/?paratha-roll"],
  ["Rolls", "Zinger Roll", 460, "https://source.unsplash.com/900x700/?chicken-wrap"],
  ["Shawarma", "Chicken Shawarma", 390, "https://source.unsplash.com/900x700/?shawarma"],
  ["Shawarma", "Arabic Shawarma", 590, "https://source.unsplash.com/900x700/?arabic-shawarma"],
  ["Fries & Sides", "Plain Fries", 280, "https://source.unsplash.com/900x700/?french-fries"],
  ["Fries & Sides", "Loaded Fries", 680, "https://source.unsplash.com/900x700/?loaded-fries"],
  ["Deals", "Burger Combo", 990, "https://source.unsplash.com/900x700/?burger-meal"],
  ["Deals", "Family Box", 2890, "https://source.unsplash.com/900x700/?fast-food-combo"],
  ["Drinks", "Mint Margarita", 290, "https://source.unsplash.com/900x700/?mint-margarita"],
  ["Drinks", "Oreo Shake", 490, "https://source.unsplash.com/900x700/?oreo-shake"],
  ["Desserts", "Chocolate Brownie", 390, "https://source.unsplash.com/900x700/?chocolate-brownie"],
  ["Desserts", "Lava Cake", 490, "https://source.unsplash.com/900x700/?lava-cake"],
  ["Tea & Coffee", "Doodh Patti", 160, "https://source.unsplash.com/900x700/?milk-tea"],
  ["Tea & Coffee", "Cappuccino", 380, "https://source.unsplash.com/900x700/?cappuccino"]
];

const demoCustomers = [
  ["Ali Raza", "03001234567", "ali.raza@email.com"],
  ["Hassan Khan", "03012345678", "hassan@email.com"],
  ["Ayesha Noor", "03023456789", "ayesha@email.com"],
  ["Bilal Ahmed", "03034567890", "bilal@email.com"],
  ["Sara Malik", "03045678901", "sara@email.com"],
  ["Hamza Sheikh", "03056789012", "hamza@email.com"],
  ["Fatima Baloch", "03067890123", "fatima@email.com"],
  ["Usman Ali", "03078901234", "usman@email.com"],
  ["Zain Shah", "03089012345", "zain@email.com"],
  ["Maha Khan", "03090123456", "maha@email.com"]
];

const demoStaff = [
  ["Ali Waiter", "waiter", "03001111111"],
  ["Hassan Waiter", "waiter", "03002222222"],
  ["Bilal Cashier", "cashier", "03003333333"],
  ["Usman Rider", "rider", "03004444444"],
  ["Zain Rider", "rider", "03005555555"],
  ["Chef Imran", "chef", "03006666666"],
  ["Manager Ahmed", "manager", "03007777777"]
];

const demoTables = [
  ["T1", "Main Hall", 4, "available", "round"],
  ["T2", "Main Hall", 4, "occupied", "round"],
  ["T3", "Main Hall", 6, "available", "rect"],
  ["T4", "Main Hall", 2, "cleaning", "round"],
  ["VIP 1", "VIP Room", 6, "reserved", "rect"],
  ["VIP 2", "VIP Room", 8, "available", "rect"],
  ["F1", "Family Zone", 6, "occupied", "rect"],
  ["F2", "Family Zone", 4, "available", "round"],
  ["O1", "Outdoor", 4, "available", "round"],
  ["O2", "Outdoor", 2, "available", "round"],
  ["R1", "Rooftop", 6, "reserved", "rect"],
  ["R2", "Rooftop", 8, "available", "rect"]
];

function ensureCollections(db) {
  db.menuCategories = Array.isArray(db.menuCategories) ? db.menuCategories : [];
  db.menuItems = Array.isArray(db.menuItems) ? db.menuItems : [];
  db.customers = Array.isArray(db.customers) ? db.customers : [];
  db.staff = Array.isArray(db.staff) ? db.staff : [];
  db.tables = Array.isArray(db.tables) ? db.tables : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  return db;
}

function tenantOnly(req, res, next) {
  if (!req.user?.tenantId) {
    return res.status(403).json({ message: "Restaurant account required." });
  }

  next();
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

module.exports = function demoPolishRoutes({ readDb, writeDb }) {
  router.post("/seed", tenantOnly, (req, res) => {
    const db = ensureCollections(readDb());
    const tenantId = req.user.tenantId;
    const now = new Date().toISOString();

    db.menuCategories = db.menuCategories.filter((item) => item.tenantId !== tenantId);
    db.menuItems = db.menuItems.filter((item) => item.tenantId !== tenantId);
    db.customers = db.customers.filter((item) => item.tenantId !== tenantId);
    db.staff = db.staff.filter((item) => item.tenantId !== tenantId);
    db.tables = db.tables.filter((item) => item.tenantId !== tenantId);

    const categoryMap = new Map();

    categories.forEach((name, index) => {
      const category = {
        id: `cat-${tenantId}-${slug(name)}`,
        tenantId,
        name,
        sortOrder: index + 1,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };

      categoryMap.set(name, category);
      db.menuCategories.push(category);
    });

    menu.forEach(([categoryName, name, price, imageUrl], index) => {
      db.menuItems.push({
        id: uuid(),
        tenantId,
        categoryId: categoryMap.get(categoryName)?.id,
        category: categoryName,
        categoryName,
        name,
        subtitle: `${categoryName} special item`,
        description: `${name} prepared fresh for demo restaurant menu.`,
        price,
        emoji: "🍽️",
        imageUrl,
        image: imageUrl,
        sku: `DEMO-${String(index + 1).padStart(3, "0")}`,
        isActive: true,
        isAvailable: true,
        preparationTime: 15,
        createdAt: now,
        updatedAt: now
      });
    });

    demoCustomers.forEach(([name, phone, email]) => {
      const [firstName, ...rest] = name.split(" ");

      db.customers.push({
        id: uuid(),
        tenantId,
        name,
        firstName,
        lastName: rest.join(" "),
        phone,
        email,
        loyaltyPoints: Math.floor(Math.random() * 700),
        totalOrders: Math.floor(Math.random() * 20),
        totalSpent: Math.floor(Math.random() * 50000),
        notes: "Demo customer",
        createdAt: now,
        updatedAt: now
      });
    });

    demoStaff.forEach(([name, role, phone], index) => {
      db.staff.push({
        id: uuid(),
        tenantId,
        name,
        role,
        phone,
        email: `${slug(name)}@nexapos.demo`,
        salary: role === "manager" ? 70000 : role === "chef" ? 60000 : role === "cashier" ? 45000 : 35000,
        isActive: true,
        shift: index % 2 === 0 ? "Morning" : "Evening",
        createdAt: now,
        updatedAt: now
      });
    });

    demoTables.forEach(([name, area, seats, status, shape], index) => {
      db.tables.push({
        id: `table-${tenantId}-${index + 1}`,
        tenantId,
        name,
        area,
        seats,
        status,
        shape,
        waiterName: status === "occupied" ? demoStaff[index % demoStaff.length][0] : "",
        currentOrderNo: status === "occupied" ? `C-${String(index + 1).padStart(3, "0")}` : "",
        total: status === "occupied" ? 2500 + index * 300 : 0,
        reservationName: status === "reserved" ? "Reserved Guest" : "",
        reservationPhone: status === "reserved" ? "03000000000" : "",
        reservationTime: status === "reserved" ? "8:30 PM" : "",
        reservationNote: status === "reserved" ? "Demo reservation" : "",
        mergedWith: [],
        mergedMasterId: "",
        createdAt: now,
        updatedAt: now
      });
    });

    db.auditLogs.push({
      id: `audit-${Date.now()}`,
      tenantId,
      action: "DEMO_POLISH_DATA_SEEDED",
      actor: req.user.username,
      details: {
        menuItems: menu.length,
        customers: demoCustomers.length,
        staff: demoStaff.length,
        tables: demoTables.length
      },
      createdAt: now
    });

    writeDb(db);

    res.json({
      message: "Demo data seeded successfully.",
      menuItems: menu.length,
      customers: demoCustomers.length,
      staff: demoStaff.length,
      tables: demoTables.length
    });
  });

  return router;
};