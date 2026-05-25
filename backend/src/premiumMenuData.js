const premiumCategories = [
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

const photos = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
  beefBurger: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
  chickenBurger: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=900&q=80",
  pizza: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=900&q=80",
  pepperoni: "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=80",
  friedChicken: "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=900&q=80",
  wings: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=900&q=80",
  bbq: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=900&q=80",
  tikka: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=900&q=80",
  karahi: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  biryani: "https://images.unsplash.com/photo-1631515242808-497c3fbd3972?auto=format&fit=crop&w=900&q=80",
  rice: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
  rolls: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=900&q=80",
  shawarma: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=80",
  fries: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=900&q=80",
  nuggets: "https://images.unsplash.com/photo-1562967916-eb82221dfb36?auto=format&fit=crop&w=900&q=80",
  deal: "https://images.unsplash.com/photo-1610614819513-58e34989848b?auto=format&fit=crop&w=900&q=80",
  drink: "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?auto=format&fit=crop&w=900&q=80",
  mint: "https://images.unsplash.com/photo-1546171753-97d7676e4602?auto=format&fit=crop&w=900&q=80",
  coffee: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
  brownie: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
  cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
  icecream: "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=900&q=80",
  tea: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80"
};

const premiumMenuItems = [
  ["Burgers", "Zinger Burger", "Crispy chicken fillet, lettuce, mayo and special sauce", 650, "🍔", photos.burger],
  ["Burgers", "Mighty Zinger Burger", "Double crispy chicken with cheese and spicy sauce", 890, "🍔", photos.chickenBurger],
  ["Burgers", "Beef Smash Burger", "Double smashed beef patty with cheddar and onions", 950, "🍔", photos.beefBurger],
  ["Burgers", "Classic Chicken Burger", "Grilled chicken patty with fresh lettuce and mayo", 620, "🍔", photos.chickenBurger],
  ["Burgers", "Jalapeno Cheese Burger", "Chicken patty with jalapenos, cheese and spicy sauce", 780, "🌶️", photos.burger],
  ["Burgers", "Double Cheese Burger", "Two patties, double cheese and house sauce", 990, "🧀", photos.beefBurger],

  ["Pizza", "Chicken Fajita Pizza", "Spicy fajita chicken, onions, capsicum and cheese", 1390, "🍕", photos.pizza],
  ["Pizza", "Pepperoni Pizza", "Classic pepperoni, mozzarella and pizza sauce", 1550, "🍕", photos.pepperoni],
  ["Pizza", "Chicken Tikka Pizza", "Tikka chicken chunks with onions and cheese", 1450, "🍕", photos.pizza],
  ["Pizza", "Crown Crust Pizza", "Stuffed crust pizza with premium toppings", 1790, "🍕", photos.pizza],
  ["Pizza", "Cheese Lovers Pizza", "Extra mozzarella, cheddar and creamy cheese blend", 1490, "🧀", photos.pizza],
  ["Pizza", "BBQ Ranch Pizza", "BBQ chicken, ranch sauce and mozzarella", 1590, "🍕", photos.pepperoni],

  ["Broast", "Chicken Broast 2 Pc", "Crispy golden broast with fries and sauce", 560, "🍗", photos.friedChicken],
  ["Broast", "Chicken Broast 4 Pc", "Family crispy broast serving with fries", 1090, "🍗", photos.friedChicken],
  ["Broast", "Spicy Broast", "Spicy crispy chicken broast with garlic sauce", 620, "🔥", photos.friedChicken],
  ["Broast", "Chicken Strips", "Boneless crispy chicken strips", 680, "🍗", photos.friedChicken],
  ["Broast", "Hot Wings 6 Pc", "Crispy hot wings with dip", 590, "🔥", photos.wings],
  ["Broast", "Nuggets 10 Pc", "Golden chicken nuggets with sauce", 520, "🍗", photos.nuggets],

  ["BBQ", "Chicken Tikka", "Charcoal grilled chicken tikka piece", 520, "🍢", photos.tikka],
  ["BBQ", "Malai Boti", "Creamy boneless chicken boti", 980, "🍢", photos.bbq],
  ["BBQ", "Chicken Seekh Kabab", "Juicy chicken seekh kabab", 650, "🥙", photos.bbq],
  ["BBQ", "Beef Seekh Kabab", "Spicy beef seekh kabab", 760, "🥙", photos.bbq],
  ["BBQ", "Bihari Boti", "Tender spicy bihari boti", 1080, "🍢", photos.bbq],
  ["BBQ", "BBQ Platter", "Tikka, boti, kabab and paratha combo", 2290, "🔥", photos.bbq],

  ["Karahi", "Chicken Karahi Half", "Fresh chicken karahi half serving", 1390, "🍲", photos.karahi],
  ["Karahi", "Chicken Karahi Full", "Family size fresh chicken karahi", 2490, "🍲", photos.karahi],
  ["Karahi", "Mutton Karahi Half", "Premium mutton karahi half serving", 2190, "🍲", photos.karahi],
  ["Karahi", "Mutton Karahi Full", "Family size mutton karahi", 3990, "🍲", photos.karahi],
  ["Karahi", "White Chicken Karahi", "Creamy white karahi with green chillies", 1690, "🥘", photos.karahi],
  ["Karahi", "Paneer Karahi", "Vegetarian paneer karahi", 1190, "🥘", photos.karahi],

  ["Rice", "Chicken Biryani", "Traditional spicy chicken biryani", 430, "🍛", photos.biryani],
  ["Rice", "Beef Biryani", "Spiced rice with tender beef", 620, "🍛", photos.biryani],
  ["Rice", "Mutton Pulao", "Fragrant pulao with mutton", 790, "🍚", photos.rice],
  ["Rice", "Chicken Fried Rice", "Chinese style fried rice with chicken", 640, "🍚", photos.rice],
  ["Rice", "Egg Fried Rice", "Classic egg fried rice", 520, "🍚", photos.rice],
  ["Rice", "Thai Rice Bowl", "Rice bowl with chicken and sauce", 740, "🥡", photos.rice],

  ["Rolls", "Chicken Paratha Roll", "Chicken roll with chutney and onion", 360, "🌯", photos.rolls],
  ["Rolls", "Zinger Paratha Roll", "Crispy zinger wrapped in paratha", 460, "🌯", photos.rolls],
  ["Rolls", "Beef Kabab Roll", "Beef kabab with paratha and chutney", 490, "🌯", photos.rolls],
  ["Rolls", "Malai Boti Roll", "Creamy boti roll with sauce", 560, "🌯", photos.rolls],
  ["Rolls", "Cheese Roll", "Chicken roll loaded with cheese", 520, "🧀", photos.rolls],

  ["Shawarma", "Chicken Shawarma", "Classic chicken shawarma with garlic sauce", 390, "🥙", photos.shawarma],
  ["Shawarma", "Arabic Shawarma", "Arabic style shawarma with fries", 590, "🥙", photos.shawarma],
  ["Shawarma", "Zinger Shawarma", "Crispy zinger shawarma", 540, "🥙", photos.shawarma],
  ["Shawarma", "Cheese Shawarma", "Shawarma with creamy cheese sauce", 490, "🧀", photos.shawarma],
  ["Shawarma", "Shawarma Platter", "Chicken shawarma platter with fries", 890, "🥙", photos.shawarma],

  ["Fries & Sides", "Plain Fries", "Crispy salted fries", 280, "🍟", photos.fries],
  ["Fries & Sides", "Masala Fries", "Fries tossed with masala seasoning", 330, "🍟", photos.fries],
  ["Fries & Sides", "Loaded Fries", "Fries loaded with chicken, cheese and sauce", 680, "🍟", photos.fries],
  ["Fries & Sides", "Garlic Mayo Fries", "Fries topped with garlic mayo", 430, "🍟", photos.fries],
  ["Fries & Sides", "Cheese Nuggets", "Cheesy golden nuggets", 490, "🧀", photos.nuggets],
  ["Fries & Sides", "Onion Rings", "Crispy onion rings with dip", 390, "🧅", photos.fries],

  ["Deals", "Burger Combo", "Burger, fries and drink", 990, "🍔", photos.deal],
  ["Deals", "Pizza Combo", "Small pizza with drink", 1190, "🍕", photos.deal],
  ["Deals", "Broast Combo", "Broast, fries, bun and drink", 890, "🍗", photos.deal],
  ["Deals", "Family Box", "Chicken, fries, nuggets and drinks", 2890, "📦", photos.deal],
  ["Deals", "BBQ Family Deal", "BBQ platter, paratha and drinks", 3290, "🔥", photos.deal],
  ["Deals", "Kids Meal", "Mini burger, fries and juice", 590, "🧃", photos.deal],

  ["Drinks", "Mint Margarita", "Fresh mint lemon cooler", 290, "🥤", photos.mint],
  ["Drinks", "Fresh Lime", "Sweet and salty fresh lime", 240, "🍋", photos.mint],
  ["Drinks", "Soft Drink Can", "Chilled soft drink can", 180, "🥤", photos.drink],
  ["Drinks", "Mineral Water", "Chilled bottled water", 100, "💧", photos.drink],
  ["Drinks", "Chocolate Shake", "Creamy chocolate milkshake", 450, "🥤", photos.drink],
  ["Drinks", "Oreo Shake", "Oreo blended milkshake", 490, "🥤", photos.drink],

  ["Desserts", "Chocolate Brownie", "Warm chocolate brownie", 390, "🍫", photos.brownie],
  ["Desserts", "Lava Cake", "Molten chocolate lava cake", 490, "🍮", photos.cake],
  ["Desserts", "Cheesecake Slice", "Creamy cheesecake slice", 540, "🍰", photos.cake],
  ["Desserts", "Ice Cream Cup", "Vanilla ice cream cup", 260, "🍨", photos.icecream],
  ["Desserts", "Chocolate Sundae", "Ice cream sundae with chocolate", 390, "🍨", photos.icecream],

  ["Tea & Coffee", "Doodh Patti", "Traditional milk tea", 160, "☕", photos.tea],
  ["Tea & Coffee", "Green Tea", "Classic green tea", 120, "🍵", photos.tea],
  ["Tea & Coffee", "Cold Coffee", "Creamy iced coffee", 430, "☕", photos.coffee],
  ["Tea & Coffee", "Cappuccino", "Hot cappuccino coffee", 380, "☕", photos.coffee],
  ["Tea & Coffee", "Latte", "Smooth hot latte", 420, "☕", photos.coffee]
];

module.exports = {
  premiumCategories,
  premiumMenuItems
};