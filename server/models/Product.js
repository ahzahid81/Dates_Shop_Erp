const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, trim: true, default: 'General', index: true },
    description: { type: String, trim: true, maxlength: 500 },
    unit: { type: String, trim: true, default: 'pcs' },
    costPrice: { type: Number, required: true, min: 0, default: 0 },
    sellPrice: { type: Number, required: true, min: 0, default: 0 },
    stockQty: { type: Number, default: 0, min: 0, index: true },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', category: 'text', sku: 'text' });

productSchema.virtual('margin').get(function margin() {
  if (!this.sellPrice) return 0;
  return Number((((this.sellPrice - this.costPrice) / this.sellPrice) * 100).toFixed(2));
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
