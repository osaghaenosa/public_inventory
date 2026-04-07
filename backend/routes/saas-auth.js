const express = require('express');
const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const CompanyUser = require('../models/CompanyUser');
const Database = require('../models/Database');
const TableSchema = require('../models/TableSchema');
const TableRow = require('../models/TableRow');
const ActivityLog = require('../models/ActivityLog');
const seedDefaultTables = require('../utils/seedDynamicTables');
const router = express.Router();

// ── Company signup ────────────────────────────────────────────────────────────
router.post('/company/signup', async (req, res) => {
  try {
    const { name, email, password, industry, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const existing = await Company.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'An account with this email already exists' });

    const company = await Company.create({ name, email, password, industry: industry || '', phone: phone || '' });

    // Create default admin user for the company (with empty database array)
    const adminUser = await CompanyUser.create({
      company_id: company._id,
      database_ids: [],
      name: `${name} Admin`,
      email: email.toLowerCase(),
      password,
      role: 'admin'
    });

    const token = jwt.sign(
      { companyId: company._id, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      company: {
        id: company._id, name: company.name, email: company.email,
        subscription: company.subscription,
        onboarding_dismissed: company.onboarding_dismissed
      }
    });
  } catch(e) {
    console.error('Company signup error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ── Company login ─────────────────────────────────────────────────────────────
router.post('/company/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const company = await Company.findOne({ email: email.toLowerCase() });
    if (!company) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await company.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { companyId: company._id, type: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const databases = await Database.find({ company_id: company._id, is_active: true });

    res.json({
      token,
      company: {
        id: company._id, name: company.name, email: company.email,
        subscription: company.subscription,
        onboarding_dismissed: company.onboarding_dismissed,
        logo_url: company.logo_url
      },
      databases
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Worker/Admin login (scoped to a company) ──────────────────────────────────
router.post('/user/login', async (req, res) => {
  try {
    const { email, password, company_id, database_id } = req.body;
    if (!email || !password || !company_id) return res.status(400).json({ message: 'Email, password and company are required' });

    const user = await CompanyUser.findOne({ email: email.toLowerCase(), company_id, is_active: true });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    // Check subscription
    const company = await Company.findById(company_id);
    if (!company || !company.isSubscriptionActive()) {
      return res.status(403).json({ message: 'Company subscription has expired. Please contact your administrator.' });
    }

    const token = jwt.sign(
      { userId: user._id, companyId: company_id, databaseId: database_id || user.database_ids[0], type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role,
        company_id, database_ids: user.database_ids }
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Admin gate login (company admin accessing a specific database) ─────────────
router.post('/user/admin-login', async (req, res) => {
  try {
    const { email, password, adminPassword, company_id, database_id } = req.body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid admin gate password' });
    }

    const user = await CompanyUser.findOne({
      email: email.toLowerCase(), company_id, role: 'admin', is_active: true
    });
    if (!user) return res.status(401).json({ message: 'Admin account not found' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const company = await Company.findById(company_id);
    if (!company || !company.isSubscriptionActive()) {
      return res.status(403).json({ message: 'Subscription expired. Please renew to continue.' });
    }

    const dbId = database_id || user.database_ids[0];
    const token = jwt.sign(
      { userId: user._id, companyId: company_id, databaseId: dbId, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, company_id, database_ids: user.database_ids }
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Subscription upgrade ──────────────────────────────────────────────────────
const PLANS = {
  starter:    { price: 4999,  databases: 1, workers: 5,   months: 1 },
  pro:        { price: 14999, databases: 3, workers: 20,  months: 1 },
  enterprise: { price: 49999, databases: 10, workers: 100, months: 1 },
};

router.post('/company/subscribe', async (req, res) => {
  try {
    const { plan, token: authToken } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: 'Invalid plan' });

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    if (decoded.type !== 'company') return res.status(401).json({ message: 'Unauthorized' });

    const company = await Company.findById(decoded.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const planConfig = PLANS[plan];
    const now = new Date();
    const expires = new Date(now.getTime() + planConfig.months * 30 * 24 * 60 * 60 * 1000);

    company.subscription.plan = plan;
    company.subscription.status = 'active';
    company.subscription.databases_allowed = planConfig.databases;
    company.subscription.workers_allowed = planConfig.workers;
    company.subscription.started_at = now;
    company.subscription.expires_at = expires;

    await company.save();
    res.json({ message: 'Subscription activated', subscription: company.subscription });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

// ── Dismiss onboarding ────────────────────────────────────────────────────────
router.post('/company/dismiss-onboarding', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    await Company.findByIdAndUpdate(decoded.companyId, { onboarding_dismissed: true });
    res.json({ message: 'Onboarding dismissed' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Database management ───────────────────────────────────────────────────────
router.get('/company/databases', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    const databases = await Database.find({ company_id: decoded.companyId });
    res.json(databases);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/company/databases', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    const company = await Company.findById(decoded.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // (Removed database limit restriction)

    const { name, description, color, icon } = req.body;
    const db = await Database.create({ company_id: decoded.companyId, name, description: description || '', color: color || '#e8ff47', icon: icon || '📦' });
    
    // Seed default customizable tables for this new DB
    await seedDefaultTables(company._id, db._id);

    res.status(201).json(db);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete('/company/databases/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if(decoded.type !== 'company') return res.status(403).json({message: 'Admin access required to delete database'});
    
    const db = await Database.findOne({ _id: req.params.id, company_id: decoded.companyId });
    if (!db) return res.status(404).json({ message: 'Database not found' });
    
    await db.deleteOne();
    
    // Purge related dynamic data
    await TableSchema.deleteMany({ database_id: db._id });
    await TableRow.deleteMany({ database_id: db._id });
    await ActivityLog.deleteMany({ database_id: db._id });
    
    // Remove database from workers' access lists
    await CompanyUser.updateMany(
      { company_id: decoded.companyId },
      { $pull: { database_ids: db._id } }
    );
    res.json({ message: 'Database permanently deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put('/company/databases/:id/suspend', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if(decoded.type !== 'company') return res.status(403).json({message: 'Admin access required to suspend database'});
    
    const db = await Database.findOne({ _id: req.params.id, company_id: decoded.companyId });
    if (!db) return res.status(404).json({ message: 'Database not found' });
    
    db.is_active = !db.is_active; // Toggle suspension state
    await db.save();
    
    res.json({ message: db.is_active ? 'Database activated' : 'Database suspended', is_active: db.is_active });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Company profile ───────────────────────────────────────────────────────────
router.get('/company/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    const company = await Company.findById(decoded.companyId).select('-password');
    const databases = await Database.find({ company_id: decoded.companyId });
    res.json({ company, databases });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Public Database context for worker login ────────────────────────────────────
router.get('/public/database-info/:id', async (req, res) => {
  try {
    const db = await Database.findById(req.params.id);
    if (!db) return res.status(404).json({ message: 'Database not found' });
    
    const company = await Company.findById(db.company_id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    res.json({
      database: { id: db._id, name: db.name, icon: db.icon, color: db.color },
      company: { id: company._id, name: company.name, logo_url: company.logo_url }
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/company/subscribe', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No auth token' });
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    
    const { plan } = req.body;
    let databases_allowed = 1;
    let workers_allowed = 5;
    
    if (plan === 'pro') { databases_allowed = 3; workers_allowed = 20; }
    else if (plan === 'enterprise') { databases_allowed = 10; workers_allowed = 100; }

    const company = await Company.findByIdAndUpdate(decoded.companyId, {
      'subscription.plan': plan,
      'subscription.status': 'active',
      'subscription.databases_allowed': databases_allowed,
      'subscription.workers_allowed': workers_allowed
    }, { new: true });
    
    res.json({ subscription: company.subscription });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── Company Settings ──────────────────────────────────────────────────────────
router.put('/company/update', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No auth token' });
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.type !== 'company') return res.status(403).json({ message: 'Admin access required' });

    const { name, email, phone } = req.body;
    const company = await Company.findById(decoded.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if email is taken by another company
    if (email && email !== company.email) {
      const existing = await Company.findOne({ email: email.toLowerCase(), _id: { $ne: decoded.companyId } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    if (name) company.name = name;
    if (email) company.email = email.toLowerCase();
    if (phone !== undefined) company.phone = phone;
    
    await company.save();
    res.json({ message: 'Company information updated', company: company.toJSON() });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put('/company/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No auth token' });
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.type !== 'company') return res.status(403).json({ message: 'Admin access required' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const company = await Company.findById(decoded.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    company.password = password;
    await company.save();
    res.json({ message: 'Password changed successfully' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.delete('/company/delete', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No auth token' });
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
    if (decoded.type !== 'company') return res.status(403).json({ message: 'Admin access required' });

    const companyId = decoded.companyId;

    // Delete all data associated with company
    await Database.deleteMany({ company_id: companyId });
    await TableSchema.deleteMany({ company_id: companyId });
    await TableRow.deleteMany({ company_id: companyId });
    await CompanyUser.deleteMany({ company_id: companyId });
    await ActivityLog.deleteMany({ company_id: companyId });
    await Company.findByIdAndDelete(companyId);

    res.json({ message: 'Company account deleted' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
