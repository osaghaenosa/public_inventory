const express = require('express');
const CompanyUser = require('../models/CompanyUser');
const Database = require('../models/Database');
const { companyAuth, adminOnly } = require('../middleware/saas-auth');
const router = express.Router();

// Get all users for the company
router.get('/', companyAuth, adminOnly, async (req, res) => {
  try {
    const users = await CompanyUser.find({ company_id: req.company._id }).select('-password');
    res.json(users);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Create worker
router.post('/', companyAuth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, database_ids } = req.body;
    const company = req.company;

    const count = await CompanyUser.countDocuments({ company_id: company._id, role: 'worker' });
    if (count >= company.subscription.workers_allowed) {
      return res.status(403).json({ message: `Your plan allows ${company.subscription.workers_allowed} workers. Upgrade to add more.` });
    }

    const existing = await CompanyUser.findOne({ company_id: company._id, email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use in your company' });

    const user = await CompanyUser.create({
      company_id: company._id,
      database_ids: database_ids || [],
      name, email, password, role: 'worker'
    });
    const userObj = user.toObject(); delete userObj.password;
    res.status(201).json(userObj);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// Delete user
router.delete('/:id', companyAuth, adminOnly, async (req, res) => {
  try {
    await CompanyUser.findOneAndDelete({ _id: req.params.id, company_id: req.company._id });
    res.json({ message: 'User deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
