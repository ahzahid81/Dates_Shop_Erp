const Counter = require('../models/Counter');

const offset = () => '+03:00';

const localDateKey = (date = new Date()) => {
  const sign = offset().startsWith('-') ? -1 : 1;
  const [h, m] = offset().replace(/[+-]/, '').split(':').map(Number);
  const shifted = new Date(date.getTime() + sign * (h * 60 + m) * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

const nextSequence = async (key) => {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
};

const nextInvoiceNo = async () => {
  const day = localDateKey().replace(/-/g, '');
  const seq = await nextSequence(`invoice-${day}`);
  return `INV-${day}-${String(seq).padStart(4, '0')}`;
};

const nextQuotationNo = async () => {
  const day = localDateKey().replace(/-/g, '');
  const seq = await nextSequence(`quotation-${day}`);
  return `QUO-${day}-${String(seq).padStart(4, '0')}`;
};

const nextSku = async () => {
  const seq = await nextSequence('product-sku');
  return `PRD-${String(seq).padStart(4, '0')}`;
};

module.exports = { nextSequence, nextInvoiceNo, nextQuotationNo, nextSku, localDateKey };
