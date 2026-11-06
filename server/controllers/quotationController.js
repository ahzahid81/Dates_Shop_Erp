const Quotation = require('../models/Quotation');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { nextQuotationNo } = require('../utils/sequence');

const listQuotations = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ quotationNo: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
  }
  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 200);

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .populate('employee', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  res.json({ quotations, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

const getQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id).populate('employee', 'name');
  if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
  res.json({ quotation });
});

const buildItems = async (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Add at least one item to the quotation'), { statusCode: 422 });
  }
  const ids = [...new Set(items.filter((i) => i.product).map((i) => String(i.product)))];
  const products = ids.length ? await Product.find({ _id: { $in: ids } }) : [];
  const map = new Map(products.map((p) => [String(p._id), p]));

  return items.map((raw) => {
    const product = raw.product ? map.get(String(raw.product)) : null;
    const name = product?.name || raw.name;
    const sku = product?.sku || raw.sku;
    const quantity = Number(raw.quantity);
    const unitPrice = Number(raw.unitPrice);
    if (!name) throw Object.assign(new Error('Item name is required'), { statusCode: 422 });
    if (!quantity || quantity < 1) throw Object.assign(new Error(`Invalid quantity for ${name}`), { statusCode: 422 });
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw Object.assign(new Error(`Invalid price for ${name}`), { statusCode: 422 });
    }
    return {
      product: product?._id,
      name,
      sku,
      quantity,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
    };
  });
};

const createQuotation = asyncHandler(async (req, res) => {
  const { customer = {}, items = [], discount = 0, validUntil, note, terms, status } = req.body;
  const lineItems = await buildItems(items);
  const subtotal = Number(lineItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  const discountValue = Math.max(Number(discount) || 0, 0);
  if (discountValue > subtotal) return res.status(422).json({ message: 'Discount cannot exceed subtotal' });
  const total = Number((subtotal - discountValue).toFixed(2));

  const quotation = await Quotation.create({
    quotationNo: await nextQuotationNo(),
    customer: {
      name: customer.name?.trim() || 'Customer',
      phone: customer.phone?.trim(),
      email: customer.email?.trim(),
      address: customer.address?.trim(),
    },
    items: lineItems,
    subtotal,
    discount: discountValue,
    total,
    validUntil: validUntil ? new Date(validUntil) : undefined,
    note,
    terms,
    status: status || 'draft',
    employee: req.user._id,
  });

  await writeAudit(req, {
    action: 'QUOTATION_CREATE',
    entity: 'Quotation',
    entityId: quotation._id,
    description: `Created quotation ${quotation.quotationNo} for ${quotation.customer.name}`,
    meta: { total },
  });

  const populated = await Quotation.findById(quotation._id).populate('employee', 'name');
  res.status(201).json({ quotation: populated });
});

const updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Quotation not found' });

  const { customer, items, discount, validUntil, note, terms, status } = req.body;

  if (items) {
    const lineItems = await buildItems(items);
    quotation.items = lineItems;
    quotation.subtotal = Number(lineItems.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2));
  }
  if (discount !== undefined) {
    quotation.discount = Math.max(Number(discount) || 0, 0);
    if (quotation.discount > quotation.subtotal) {
      return res.status(422).json({ message: 'Discount cannot exceed subtotal' });
    }
  }
  if (customer) {
    quotation.customer = {
      name: customer.name?.trim() || quotation.customer.name,
      phone: customer.phone?.trim(),
      email: customer.email?.trim(),
      address: customer.address?.trim(),
    };
  }
  if (validUntil !== undefined) quotation.validUntil = validUntil ? new Date(validUntil) : undefined;
  if (note !== undefined) quotation.note = note;
  if (terms !== undefined) quotation.terms = terms;
  if (status !== undefined) quotation.status = status;
  quotation.total = Number((quotation.subtotal - quotation.discount).toFixed(2));

  await quotation.save();
  await writeAudit(req, {
    action: 'QUOTATION_UPDATE',
    entity: 'Quotation',
    entityId: quotation._id,
    description: `Updated quotation ${quotation.quotationNo}`,
    meta: { status: quotation.status },
  });

  const populated = await Quotation.findById(quotation._id).populate('employee', 'name');
  res.json({ quotation: populated });
});

const deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
  await quotation.deleteOne();
  await writeAudit(req, {
    action: 'QUOTATION_DELETE',
    entity: 'Quotation',
    entityId: quotation._id,
    description: `Deleted quotation ${quotation.quotationNo}`,
  });
  res.json({ message: 'Quotation deleted' });
});

module.exports = { listQuotations, getQuotation, createQuotation, updateQuotation, deleteQuotation };
