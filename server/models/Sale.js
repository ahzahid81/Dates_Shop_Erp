const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true, default: 0 },
    returnedQty: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, trim: true, maxlength: 120, default: 'Walk-in Customer' },
      phone: { type: String, trim: true, maxlength: 30 },
      address: { type: String, trim: true, maxlength: 300 },
    },
    items: { type: [saleItemSchema], validate: [(v) => v.length > 0, 'At least one item is required'] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    costTotal: { type: Number, default: 0, min: 0 },
    profit: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'bank', 'credit'],
      default: 'cash',
    },
    note: { type: String, trim: true, maxlength: 500 },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true, default: Date.now },
    status: { type: String, enum: ['completed', 'void'], default: 'completed', index: true },
  },
  { timestamps: true }
);

saleSchema.index({ date: -1, status: 1 });
saleSchema.index({ 'customer.phone': 1 });

module.exports = mongoose.model('Sale', saleSchema);
