const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { companyAuth, adminOnly } = require('../middleware/saas-auth');
const router = express.Router();

router.get('/', companyAuth, async (req, res) => {
  try {
    const filter = { };
    if (req.company) filter.company_id = req.company._id;
    if (req.databaseId) filter.database_id = req.databaseId;
    if (req.user && req.user.role === 'worker') filter.user_id = req.user._id;
    
    const logs = await ActivityLog.find(filter)
      .populate('user_id', 'name email')
      .sort({ timestamp: -1 })
      .limit(200);
    res.json(logs);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
