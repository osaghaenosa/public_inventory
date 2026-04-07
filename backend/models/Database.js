const mongoose = require('mongoose');

// Each company can have multiple "databases" (inventory workspaces)
const databaseSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '#e8ff47' }, // accent color for this db
  icon: { type: String, default: '📦' },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

module.exports = mongoose.model('Database', databaseSchema);
