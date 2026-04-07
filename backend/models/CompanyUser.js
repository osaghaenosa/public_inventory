const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Workers/admins that belong to a company
const companyUserSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  database_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Database' }], // which DBs they can access
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'worker'], default: 'worker' },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Unique email per company
companyUserSchema.index({ company_id: 1, email: 1 }, { unique: true });

companyUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

companyUserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('CompanyUser', companyUserSchema);
