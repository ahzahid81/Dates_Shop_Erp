const mongoose = require('mongoose');

const stockEntrySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    supplier: { type: String, trim: true, maxlength: 150 },
    note: { type: String, trim: true, maxlength: 400 },
    paid: { type: Boolean, default: true },
    paymentMethod: { type: String, enum: ['cash', 'bkash', 'card', 'bank'], default: 'cash' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true, default: Date.now },
  },
  { timestamps: true }
);

stockEntrySchema.index({ date: -1, product: 1 });

module.exports = mongoose.model('StockEntry', stockEntrySchema);
