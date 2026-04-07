const express = require('express');
const mongoose = require('mongoose');
const Receipt = require('../models/Receipt');
const { companyAuth: auth } = require('../middleware/saas-auth');
const ActivityLog = require('../models/ActivityLog');
const router = express.Router();

// Generate unique receipt number
function generateReceiptNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `RCP-${timestamp}-${random}`;
}

// Log activity
async function logActivity(req, action, data) {
  try {
    await ActivityLog.create({ 
      user_id: req.user ? req.user._id : null,
      company_id: req.company ? req.company._id : null, 
      database_id: req.databaseId,
      action, 
      new_value: data 
    });
  } catch(e) {}
}

// ─── Receipts CRUD ───────────────────────────────────────────────────────

// Get all receipts for a database
router.get('/', auth, async (req, res) => {
  try {
    const { date, customer } = req.query;
    let query = { database_id: req.databaseId };
    
    if (date) query.date = date;
    if (customer) query.customer_name = { $regex: customer, $options: 'i' };

    const receipts = await Receipt.find(query)
      .populate('worker_id', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(receipts);
  } catch (err) {
    console.error('GET /receipts error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get single receipt
router.get('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      database_id: req.databaseId
    }).populate('worker_id', 'name email');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (err) {
    console.error('GET /receipts/:id error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Create receipt
router.post('/', auth, async (req, res) => {
  try {
    const {
      date,
      customer_name,
      customer_phone,
      items,
      subtotal,
      discount,
      discount_percent,
      tax_rate,
      payment_method,
      notes
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Receipt must contain at least one item' });
    }

    // Calculate totals
    const calculatedSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const discountAmount = discount || (calculatedSubtotal * (discount_percent || 0) / 100);
    const taxAmount = (calculatedSubtotal - discountAmount) * (tax_rate || 0) / 100;
    const total = calculatedSubtotal - discountAmount + taxAmount;

    const receipt = new Receipt({
      receipt_number: generateReceiptNumber(),
      date: date || new Date().toLocaleDateString('en-GB'),
      customer_name,
      customer_phone: customer_phone || '',
      items,
      subtotal: calculatedSubtotal,
      discount: discountAmount,
      discount_percent: discount_percent || 0,
      tax_rate: tax_rate || 0,
      tax_amount: taxAmount,
      total,
      payment_method: payment_method || 'cash',
      payment_status: 'paid',
      notes: notes || '',
      worker_id: req.user._id,
      company_id: req.company._id,
      database_id: req.databaseId
    });

    await receipt.save();
    await receipt.populate('worker_id', 'name email');

    await logActivity(req, `Created receipt ${receipt.receipt_number} for ${customer_name}`, {
      receipt_number: receipt.receipt_number,
      customer_name,
      total,
      items: items.length
    });

    const io = req.app.get('io');
    io.to('admin-room').emit('receipt-update', {
      type: 'new',
      receipt,
      worker: req.user.name,
      message: `${req.user.name} created receipt ${receipt.receipt_number}`
    });

    res.status(201).json(receipt);
  } catch (err) {
    console.error('POST /receipts error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Update receipt
router.put('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      database_id: req.databaseId
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    const {
      customer_name,
      customer_phone,
      items,
      discount,
      discount_percent,
      tax_rate,
      payment_method,
      payment_status,
      notes
    } = req.body;

    if (customer_name) receipt.customer_name = customer_name;
    if (customer_phone !== undefined) receipt.customer_phone = customer_phone;
    if (items && items.length > 0) {
      receipt.items = items;
      const calculatedSubtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const discountAmount = discount !== undefined ? discount : (calculatedSubtotal * (discount_percent || 0) / 100);
      const taxAmount = (calculatedSubtotal - discountAmount) * (tax_rate || 0) / 100;
      
      receipt.subtotal = calculatedSubtotal;
      receipt.discount = discountAmount;
      receipt.discount_percent = discount_percent !== undefined ? discount_percent : receipt.discount_percent;
      receipt.tax_rate = tax_rate !== undefined ? tax_rate : receipt.tax_rate;
      receipt.tax_amount = taxAmount;
      receipt.total = calculatedSubtotal - discountAmount + taxAmount;
    }
    if (payment_method) receipt.payment_method = payment_method;
    if (payment_status) receipt.payment_status = payment_status;
    if (notes !== undefined) receipt.notes = notes;

    await receipt.save();
    await receipt.populate('worker_id', 'name email');

    await logActivity(req, `Updated receipt ${receipt.receipt_number}`, {
      receipt_number: receipt.receipt_number,
      customer_name: receipt.customer_name
    });

    const io = req.app.get('io');
    io.to('admin-room').emit('receipt-update', {
      type: 'update',
      receipt,
      worker: req.user.name,
      message: `${req.user.name} updated receipt ${receipt.receipt_number}`
    });

    res.json(receipt);
  } catch (err) {
    console.error('PUT /receipts/:id error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Delete receipt
router.delete('/:id', auth, async (req, res) => {
  try {
    const receipt = await Receipt.findOneAndDelete({
      _id: req.params.id,
      database_id: req.databaseId
    });

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    await logActivity(req, `Deleted receipt ${receipt.receipt_number}`, {
      receipt_number: receipt.receipt_number,
      customer_name: receipt.customer_name
    });

    const io = req.app.get('io');
    io.to('admin-room').emit('receipt-update', {
      type: 'delete',
      receipt,
      worker: req.user.name,
      message: `${req.user.name} deleted receipt ${receipt.receipt_number}`
    });

    res.json({ message: 'Receipt deleted' });
  } catch (err) {
    console.error('DELETE /receipts/:id error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get receipts summary for a date range
router.get('/summary/:dateRange', auth, async (req, res) => {
  try {
    const { dateRange } = req.params;
    const today = new Date();
    let startDate = new Date();

    if (dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'week') {
      startDate.setDate(today.getDate() - today.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'month') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'year') {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const receipts = await Receipt.find({
      database_id: req.databaseId,
      createdAt: { $gte: startDate }
    });

    const summary = {
      total_receipts: receipts.length,
      total_revenue: receipts.reduce((sum, r) => sum + r.total, 0),
      total_discount: receipts.reduce((sum, r) => sum + r.discount, 0),
      total_tax: receipts.reduce((sum, r) => sum + r.tax_amount, 0),
      payment_methods: {},
      daily_breakdown: {}
    };

    receipts.forEach(receipt => {
      // Payment method breakdown
      summary.payment_methods[receipt.payment_method] = 
        (summary.payment_methods[receipt.payment_method] || 0) + receipt.total;

      // Daily breakdown
      const receiptDate = new Date(receipt.createdAt).toLocaleDateString('en-GB');
      summary.daily_breakdown[receiptDate] = 
        (summary.daily_breakdown[receiptDate] || 0) + receipt.total;
    });

    res.json(summary);
  } catch (err) {
    console.error('GET /receipts/summary/:dateRange error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
