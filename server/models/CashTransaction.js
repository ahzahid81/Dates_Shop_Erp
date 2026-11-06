const mongoose = require('mongoose');

const cashTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['in', 'out'], required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    source: {
      type: String,
      enum: ['sale', 'expense', 'stock', 'adjustment', 'invoice_payment', 'refund'],
      required: true,
      index: true,
    },
    reference: { type: mongoose.Schema.Types.ObjectId },
    referenceModel: { type: String, enum: ['Sale', 'Expense', 'StockEntry', 'Manual'] },
    description: { type: String, trim: true, maxlength: 300 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'bank'],
      default: 'cash',
    },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true, default: Date.now },
  },
  { timestamps: true }
);

cashTransactionSchema.index({ date: -1, type: 1 });
cashTransactionSchema.index({ reference: 1, referenceModel: 1 });

module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
