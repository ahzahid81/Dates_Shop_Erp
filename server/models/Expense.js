const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, trim: true, default: 'General', index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'bank'],
      default: 'cash',
    },
    note: { type: String, trim: true, maxlength: 400 },
    receiptNo: { type: String, trim: true, maxlength: 80 },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true, default: Date.now },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1, employee: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
