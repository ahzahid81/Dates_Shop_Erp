const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, required: true, unique: true, index: true },
    customer: {
      name: { type: String, required: true, trim: true, maxlength: 120 },
      phone: { type: String, trim: true, maxlength: 30 },
      email: { type: String, trim: true, lowercase: true, maxlength: 120 },
      address: { type: String, trim: true, maxlength: 300 },
    },
    items: {
      type: [quotationItemSchema],
      validate: [(v) => v.length > 0, 'At least one item is required'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    validUntil: { type: Date },
    note: { type: String, trim: true, maxlength: 600 },
    terms: { type: String, trim: true, maxlength: 600 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft',
      index: true,
    },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

quotationSchema.index({ createdAt: -1, status: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
