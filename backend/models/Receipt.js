const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receipt_number: { type: String, required: true, unique: true }, // Auto-generated
  date: { type: String, required: true },
  customer_name: { type: String, required: true, trim: true },
  customer_phone: { type: String, default: '', trim: true },
  items: [{
    item_number: { type: String, required: true },
    item_name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit_price: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 } // quantity * unit_price
  }],
  subtotal: { type: Number, required: true, min: 0 }, // sum of all items
  discount: { type: Number, default: 0, min: 0 },
  discount_percent: { type: Number, default: 0, min: 0, max: 100 },
  tax_rate: { type: Number, default: 0, min: 0, max: 100 },
  tax_amount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 }, // subtotal - discount + tax
  payment_method: { type: String, enum: ['cash', 'card', 'cheque', 'bank_transfer', 'other'], default: 'cash' },
  payment_status: { type: String, enum: ['paid', 'partially_paid', 'pending'], default: 'paid' },
  notes: { type: String, default: '', trim: true },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  database_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Database', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', receiptSchema);
