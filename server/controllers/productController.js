const Product = require('../models/Product');
const Sale = require('../models/Sale');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { nextSku } = require('../utils/sequence');

const listProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock, page = 1, limit = 100, includeInactive } = req.query;
  const filter = {};
  if (includeInactive !== 'true') filter.isActive = true;
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { category: rx }];
  }
  if (lowStock === 'true') {
    filter.$expr = { $lte: ['$stockQty', '$lowStockThreshold'] };
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  res.json({ products, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, description, unit, costPrice, sellPrice, stockQty, lowStockThreshold } = req.body;
  const generatedSku = sku && String(sku).trim() ? String(sku).toUpperCase().trim() : await nextSku();

  const product = await Product.create({
    name,
    sku: generatedSku,
    category,
    description,
    unit,
    costPrice,
    sellPrice,
    stockQty: Number(stockQty) || 0,
    lowStockThreshold,
  });

  await writeAudit(req, {
    action: 'CREATE',
    entity: 'Product',
    entityId: product._id,
    description: `Created product ${product.name} (${product.sku})`,
    meta: { stockQty: product.stockQty, costPrice: product.costPrice, sellPrice: product.sellPrice },
  });

  res.status(201).json({ product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const fields = ['name', 'category', 'description', 'unit', 'costPrice', 'sellPrice', 'lowStockThreshold', 'isActive'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });
  if (req.body.sku) product.sku = String(req.body.sku).toUpperCase().trim();
  if (req.body.stockQty !== undefined && req.user.role === 'admin') {
    product.stockQty = Math.max(Number(req.body.stockQty) || 0, 0);
  }

  await product.save();
  await writeAudit(req, {
    action: 'UPDATE',
    entity: 'Product',
    entityId: product._id,
    description: `Updated product ${product.name}`,
  });

  res.json({ product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const salesCount = await Sale.countDocuments({ 'items.product': product._id });
  if (salesCount > 0) {
    product.isActive = false;
    await product.save();
    await writeAudit(req, {
      action: 'ARCHIVE',
      entity: 'Product',
      entityId: product._id,
      description: `Archived product ${product.name} (linked to ${salesCount} sales)`,
    });
    return res.json({ message: 'Product archived to preserve sales history', archived: true });
  }

  await product.deleteOne();
  await writeAudit(req, {
    action: 'DELETE',
    entity: 'Product',
    entityId: product._id,
    description: `Deleted product ${product.name}`,
  });
  res.json({ message: 'Product deleted', archived: false });
});

const productCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category', { isActive: true });
  res.json({ categories: categories.filter(Boolean).sort() });
});

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  productCategories,
};
