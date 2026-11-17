const mongoose = require('mongoose');

const coldStorageTransferSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, maxlength: 400 },
    date: { type: Date, required: true, index: true, default: Date.now },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

coldStorageTransferSchema.index({ date: -1, product: 1 });

module.exports = mongoose.model('ColdStorageTransfer', coldStorageTransferSchema);
