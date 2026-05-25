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
  "Chinese",
  "Pasta",
  "Steaks",
  "Breakfast",
  "Drinks",
  "Desserts",
  "Tea & Coffee"
];

const img = {
  zinger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
  smash: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
  chickenBurger: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80",
  cheeseBurger: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=900&q=80",
  pizza1: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=80",
  pizza2: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80",
  pizza3: "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=900&q=80",
  pizza4: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80",
  friedChicken: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80",
  wings: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=80",
  nuggets: "https://images.unsplash.com/photo-1562967916-eb82221dfb36?auto=format&fit=crop&w=900&q=80",
  bbq: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
  tikka: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
  kabab: "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=900&q=80",
  karahi: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  curry: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
  biryani: "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=900&q=80",
  rice: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
  roll: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80",
  shawarma: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80",
  fries: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=900&q=80",
  loadedFries: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
  deal: "https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=900&q=80",
  noodles: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80",
  chowmein: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=900&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?auto=format&fit=crop&w=900&q=80",
  steak: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80",
  breakfast: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=900&q=80",
  pancakes: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80",
  drink: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=900&q=80",
  mint: "https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=900&q=80",
  shake: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=80",
  brownie: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
  cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
  icecream: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=900&q=80",
  coffee: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
  tea: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80"
};

const menu = [
  ["Burgers", "Classic Zinger Burger", 650, img.zinger],
  ["Burgers", "Mighty Zinger Burger", 890, img.chickenBurger],
  ["Burgers", "Beef Smash Burger", 950, img.smash],
  ["Burgers", "Double Cheese Burger", 990, img.cheeseBurger],
  ["Burgers", "Jalapeno Chicken Burger", 780, img.zinger],
  ["Burgers", "Grilled Chicken Burger", 720, img.chickenBurger],
  ["Burgers", "Crispy Fish Burger", 820, img.cheeseBurger],
  ["Burgers", "Nexa Signature Burger", 1150, img.smash],

  ["Pizza", "Chicken Fajita Pizza", 1390, img.pizza1],
  ["Pizza", "Pepperoni Pizza", 1550, img.pizza2],
  ["Pizza", "Chicken Tikka Pizza", 1450, img.pizza3],
  ["Pizza", "BBQ Ranch Pizza", 1590, img.pizza4],
  ["Pizza", "Cheese Lovers Pizza", 1490, img.pizza1],
  ["Pizza", "Crown Crust Pizza", 1790, img.pizza2],
  ["Pizza", "Veggie Supreme Pizza", 1290, img.pizza3],
  ["Pizza", "Nexa Special Pizza", 1890, img.pizza4],

  ["Broast", "Chicken Broast 2 Pc", 560, img.friedChicken],
  ["Broast", "Chicken Broast 4 Pc", 1090, img.friedChicken],
  ["Broast", "Spicy Broast", 620, img.friedChicken],
  ["Broast", "Chicken Strips", 680, img.nuggets],
  ["Broast", "Hot Wings 6 Pc", 590, img.wings],
  ["Broast", "Hot Wings 12 Pc", 1080, img.wings],
  ["Broast", "Nuggets 10 Pc", 520, img.nuggets],
  ["Broast", "Crispy Bucket", 2290, img.friedChicken],

  ["BBQ", "Chicken Tikka", 520, img.tikka],
  ["BBQ", "Malai Boti", 980, img.bbq],
  ["BBQ", "Chicken Seekh Kabab", 650, img.kabab],
  ["BBQ", "Beef Seekh Kabab", 760, img.kabab],
  ["BBQ", "Bihari Boti", 1080, img.bbq],
  ["BBQ", "Reshmi Kabab", 890, img.kabab],
  ["BBQ", "BBQ Platter", 2290, img.bbq],
  ["BBQ", "Family BBQ Platter", 3990, img.bbq],

  ["Karahi", "Chicken Karahi Half", 1390, img.karahi],
  ["Karahi", "Chicken Karahi Full", 2490, img.karahi],
  ["Karahi", "Mutton Karahi Half", 2190, img.curry],
  ["Karahi", "Mutton Karahi Full", 3990, img.curry],
  ["Karahi", "White Chicken Karahi", 1690, img.karahi],
  ["Karahi", "Green Masala Karahi", 1690, img.curry],
  ["Karahi", "Paneer Karahi", 1190, img.karahi],

  ["Rice", "Chicken Biryani", 430, img.biryani],
  ["Rice", "Beef Biryani", 620, img.biryani],
  ["Rice", "Mutton Pulao", 790, img.rice],
  ["Rice", "Chicken Fried Rice", 640, img.rice],
  ["Rice", "Egg Fried Rice", 520, img.rice],
  ["Rice", "Thai Rice Bowl", 740, img.rice],
  ["Rice", "Chinese Rice Combo", 890, img.rice],

  ["Rolls", "Chicken Paratha Roll", 360, img.roll],
  ["Rolls", "Zinger Paratha Roll", 460, img.roll],
  ["Rolls", "Beef Kabab Roll", 490, img.roll],
  ["Rolls", "Malai Boti Roll", 560, img.roll],
  ["Rolls", "Cheese Roll", 520, img.roll],
  ["Rolls", "Nexa Special Roll", 650, img.roll],

  ["Shawarma", "Chicken Shawarma", 390, img.shawarma],
  ["Shawarma", "Arabic Shawarma", 590, img.shawarma],
  ["Shawarma", "Zinger Shawarma", 540, img.shawarma],
  ["Shawarma", "Cheese Shawarma", 490, img.shawarma],
  ["Shawarma", "Shawarma Platter", 890, img.shawarma],

  ["Fries & Sides", "Plain Fries", 280, img.fries],
  ["Fries & Sides", "Masala Fries", 330, img.fries],
  ["Fries & Sides", "Loaded Fries", 680, img.loadedFries],
  ["Fries & Sides", "Garlic Mayo Fries", 430, img.loadedFries],
  ["Fries & Sides", "Onion Rings", 390, img.fries],
  ["Fries & Sides", "Mozzarella Sticks", 590, img.nuggets],

  ["Deals", "Burger Combo", 990, img.deal],
  ["Deals", "Pizza Combo", 1190, img.deal],
  ["Deals", "Broast Combo", 890, img.deal],
  ["Deals", "Family Box", 2890, img.deal],
  ["Deals", "BBQ Family Deal", 3290, img.deal],
  ["Deals", "Kids Meal", 590, img.deal],
  ["Deals", "Student Deal", 780, img.deal],
  ["Deals", "Mega Party Deal", 5490, img.deal],

  ["Chinese", "Chicken Chow Mein", 780, img.chowmein],
  ["Chinese", "Chicken Manchurian", 890, img.noodles],
  ["Chinese", "Chicken Shashlik", 950, img.noodles],
  ["Chinese", "Kung Pao Chicken", 1090, img.noodles],
  ["Chinese", "Vegetable Noodles", 620, img.chowmein],
  ["Chinese", "Dynamite Chicken", 990, img.nuggets],

  ["Pasta", "Alfredo Pasta", 990, img.pasta],
  ["Pasta", "Chicken Fettuccine", 1090, img.pasta],
  ["Pasta", "Spicy Arrabbiata", 890, img.pasta],
  ["Pasta", "Creamy Mushroom Pasta", 980, img.pasta],

  ["Steaks", "Chicken Steak", 1490, img.steak],
  ["Steaks", "Beef Steak", 2490, img.steak],
  ["Steaks", "Mushroom Steak", 1690, img.steak],
  ["Steaks", "Pepper Steak", 1790, img.steak],

  ["Breakfast", "English Breakfast", 890, img.breakfast],
  ["Breakfast", "Omelette Platter", 590, img.breakfast],
  ["Breakfast", "Pancakes", 690, img.pancakes],
  ["Breakfast", "French Toast", 620, img.pancakes],
  ["Breakfast", "Desi Nashta Platter", 790, img.breakfast],

  ["Drinks", "Mint Margarita", 290, img.mint],
  ["Drinks", "Fresh Lime", 240, img.mint],
  ["Drinks", "Soft Drink Can", 180, img.drink],
  ["Drinks", "Mineral Water", 100, img.drink],
  ["Drinks", "Chocolate Shake", 450, img.shake],
  ["Drinks", "Oreo Shake", 490, img.shake],
  ["Drinks", "Strawberry Shake", 460, img.shake],
  ["Drinks", "Cold Coffee", 430, img.coffee],

  ["Desserts", "Chocolate Brownie", 390, img.brownie],
  ["Desserts", "Lava Cake", 490, img.cake],
  ["Desserts", "Cheesecake Slice", 540, img.cake],
  ["Desserts", "Ice Cream Cup", 260, img.icecream],
  ["Desserts", "Chocolate Sundae", 390, img.icecream],
  ["Desserts", "Waffle with Ice Cream", 690, img.icecream],

  ["Tea & Coffee", "Doodh Patti", 160, img.tea],
  ["Tea & Coffee", "Green Tea", 120, img.tea],
  ["Tea & Coffee", "Cappuccino", 380, img.coffee],
  ["Tea & Coffee", "Latte", 420, img.coffee],
  ["Tea & Coffee", "Espresso", 300, img.coffee],
  ["Tea & Coffee", "Americano", 350, img.coffee]
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
  ["Maha Khan", "03090123456", "maha@email.com"],
  ["Danish Qureshi", "03111234567", "danish@email.com"],
  ["Hira Fatima", "03122345678", "hira@email.com"],
  ["Noman Siddiqui", "03133456789", "noman@email.com"],
  ["Sana Tariq", "03144567890", "sana@email.com"],
  ["Waqas Memon", "03155678901", "waqas@email.com"],
  ["Laiba Sheikh", "03166789012", "laiba@email.com"],
  ["Arslan Malik", "03177890123", "arslan@email.com"],
  ["Maryam Ali", "03188901234", "maryam@email.com"],
  ["Owais Khan", "03199012345", "owais@email.com"],
  ["Iqra Noor", "03210123456", "iqra@email.com"]
];

const demoStaff = [
  ["Ali Waiter", "waiter", "03001111111"],
  ["Hassan Waiter", "waiter", "03002222222"],
  ["Adeel Waiter", "waiter", "03008888111"],
  ["Kamran Waiter", "waiter", "03008888222"],
  ["Sajid Waiter", "waiter", "03008888333"],
  ["Bilal Cashier", "cashier", "03003333333"],
  ["Noman Cashier", "cashier", "03003333444"],
  ["Usman Rider", "rider", "03004444444"],
  ["Zain Rider", "rider", "03005555555"],
  ["Danish Rider", "rider", "03006666111"],
  ["Owais Rider", "rider", "03006666222"],
  ["Chef Imran", "chef", "03006666666"],
  ["Chef Yasir", "chef", "03007777111"],
  ["Chef Rafiq", "chef", "03007777222"],
  ["Manager Ahmed", "manager", "03007777777"],
  ["Supervisor Salman", "manager", "03008888888"]
];

const demoTables = [
  ["T1", "Main Hall", 4, "available", "round"],
  ["T2", "Main Hall", 4, "occupied", "round"],
  ["T3", "Main Hall", 6, "available", "rect"],
  ["T4", "Main Hall", 2, "cleaning", "round"],
  ["T5", "Main Hall", 8, "available", "rect"],
  ["VIP 1", "VIP Room", 6, "reserved", "rect"],
  ["VIP 2", "VIP Room", 8, "available", "rect"],
  ["VIP 3", "VIP Room", 10, "available", "rect"],
  ["F1", "Family Zone", 6, "occupied", "rect"],
  ["F2", "Family Zone", 4, "available", "round"],
  ["F3", "Family Zone", 8, "available", "rect"],
  ["O1", "Outdoor", 4, "available", "round"],
  ["O2", "Outdoor", 2, "available", "round"],
  ["O3", "Outdoor", 6, "reserved", "rect"],
  ["R1", "Rooftop", 6, "reserved", "rect"],
  ["R2", "Rooftop", 8, "available", "rect"],
  ["R3", "Rooftop", 4, "available", "round"]
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
        salary: role === "manager" ? 70000 : role === "chef" ? 60000 : role === "cashier" ? 45000 : role === "rider" ? 40000 : 35000,
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
      message: "Large demo data seeded successfully.",
      menuItems: menu.length,
      customers: demoCustomers.length,
      staff: demoStaff.length,
      tables: demoTables.length
    });
  });

  return router;
};