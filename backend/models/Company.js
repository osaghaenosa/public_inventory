const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  logo_url: { type: String, default: '' },
  industry: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  verified: { type: Boolean, default: true },
  subscription: {
    plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'expired', 'cancelled', 'trial'], default: 'trial' },
    databases_allowed: { type: Number, default: 1 },
    workers_allowed: { type: Number, default: 3 },
    started_at: { type: Date },
    expires_at: { type: Date },
    trial_ends_at: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
  },
  onboarding_dismissed: { type: Boolean, default: false }
}, { timestamps: true });

companySchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

companySchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

companySchema.methods.isSubscriptionActive = function() {
  const sub = this.subscription;
  if (sub.status === 'trial') {
    return sub.trial_ends_at && new Date() < sub.trial_ends_at;
  }
  if (sub.status === 'active') {
    return sub.expires_at && new Date() < sub.expires_at;
  }
  return false;
};

module.exports = mongoose.model('Company', companySchema);
