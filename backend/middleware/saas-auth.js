const jwt = require('jsonwebtoken');
const Company = require('../models/Company');
const CompanyUser = require('../models/CompanyUser');

// Middleware for company-level auth
const companyAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'company') {
      const company = await Company.findById(decoded.companyId).select('-password');
      if (!company) return res.status(401).json({ message: 'Company not found' });
      if (!company.isSubscriptionActive()) {
        return res.status(403).json({
          message: 'Subscription expired',
          subscriptionExpired: true,
          expires_at: company.subscription.expires_at
        });
      }
      req.company = company;
      req.user = null;
      req.databaseId = req.header('x-database-id') || null;
    } else if (decoded.type === 'user') {
      const user = await CompanyUser.findById(decoded.userId).select('-password');
      if (!user || !user.is_active) return res.status(401).json({ message: 'User not found or inactive' });

      const company = await Company.findById(decoded.companyId).select('-password');
      if (!company) return res.status(401).json({ message: 'Company not found' });
      if (!company.isSubscriptionActive()) {
        return res.status(403).json({
          message: 'Your company subscription has expired. Contact your admin.',
          subscriptionExpired: true
        });
      }

      req.user = user;
      req.company = company;
      req.databaseId = decoded.databaseId;
    } else {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    next();
  } catch(e) {
    console.error('SaaS auth error:', e.message);
    res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

const adminOnly = (req, res, next) => {
  const role = req.user?.role || (req.company ? 'company' : null);
  if (role !== 'admin' && role !== 'company') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { companyAuth, adminOnly };
