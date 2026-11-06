require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const StockEntry = require('./models/StockEntry');
const CashTransaction = require('./models/CashTransaction');
const { nextSku } = require('./utils/sequence');

const SAMPLE_PRODUCTS = [
  { name: 'Premium Medjool Dates', category: 'Dates', unit: 'kg', costPrice: 850, sellPrice: 1100, stockQty: 40, threshold: 10 },
  { name: 'Ajwa Dates', category: 'Dates', unit: 'kg', costPrice: 1200, sellPrice: 1500, stockQty: 30, threshold: 8 },
  { name: 'Sukkari Dates', category: 'Dates', unit: 'kg', costPrice: 620, sellPrice: 850, stockQty: 50, threshold: 10 },
  { name: 'Golden Raisins', category: 'Dry Fruits', unit: 'kg', costPrice: 400, sellPrice: 550, stockQty: 25, threshold: 6 },
  { name: 'Cashew Nuts', category: 'Dry Fruits', unit: 'kg', costPrice: 1050, sellPrice: 1350, stockQty: 20, threshold: 5 },
  { name: 'Almonds', category: 'Dry Fruits', unit: 'kg', costPrice: 900, sellPrice: 1200, stockQty: 35, threshold: 8 },
  { name: 'Pistachios', category: 'Dry Fruits', unit: 'kg', costPrice: 1500, sellPrice: 1900, stockQty: 15, threshold: 5 },
  { name: 'Date Gift Box (Large)', category: 'Gift Box', unit: 'box', costPrice: 1800, sellPrice: 2400, stockQty: 12, threshold: 4 },
  { name: 'Date Gift Box (Small)', category: 'Gift Box', unit: 'box', costPrice: 950, sellPrice: 1300, stockQty: 18, threshold: 5 },
  { name: 'Honey 500g', category: 'Others', unit: 'jar', costPrice: 550, sellPrice: 750, stockQty: 22, threshold: 6 },
];

const seed = async () => {
  await connectDB();

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@datesshop.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const adminName = process.env.ADMIN_NAME || 'Shop Admin';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({ name: adminName, email: adminEmail, password: adminPassword, role: 'admin' });
    console.log(`Admin created: ${admin.email}`);
  } else {
    console.log(`Admin already exists: ${admin.email}`);
  }

  if (process.env.SEED_SAMPLE_EMPLOYEE !== 'false') {
    const empEmail = (process.env.EMPLOYEE_EMAIL || 'employee@datesshop.com').toLowerCase();
    const existing = await User.findOne({ email: empEmail });
    if (!existing) {
      await User.create({
        name: process.env.EMPLOYEE_NAME || 'Shop Employee',
        email: empEmail,
        password: process.env.EMPLOYEE_PASSWORD || 'Employee@12345',
        role: 'employee',
      });
      console.log(`Employee created: ${empEmail}`);
    }
  }

  if (process.env.SEED_SAMPLE_PRODUCTS !== 'false') {
    const count = await Product.countDocuments();
    if (count === 0) {
      for (const item of SAMPLE_PRODUCTS) {
        const sku = await nextSku();
        const product = await Product.create({
          name: item.name,
          sku,
          category: item.category,
          unit: item.unit,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          stockQty: 0,
          lowStockThreshold: item.threshold,
          description: 'Demo product created by seed script',
        });
        const totalCost = item.costPrice * item.stockQty;
        product.stockQty = item.stockQty;
        await product.save();
        const entry = await StockEntry.create({
          product: product._id,
          productName: product.name,
          quantity: item.stockQty,
          unitCost: item.costPrice,
          totalCost,
          supplier: 'Opening Stock',
          note: 'Seed opening stock',
          paid: true,
          paymentMethod: 'cash',
          employee: admin._id,
          date: new Date(),
        });
        await CashTransaction.create({
          type: 'out',
          amount: totalCost,
          source: 'stock',
          reference: entry._id,
          referenceModel: 'StockEntry',
          description: `Opening stock: ${product.name}`,
          paymentMethod: 'cash',
          employee: admin._id,
          date: new Date(),
        });
      }
      console.log(`Seeded ${SAMPLE_PRODUCTS.length} sample products with opening stock`);
    } else {
      console.log(`Products already exist (${count}); skipping sample products`);
    }
  }

  console.log('Seed complete');
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
