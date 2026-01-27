const mongoose = require('mongoose');

/**
 * RedeemCode Schema
 * Separate from coupons (which give discounts)
 * Managed by admin - codes that give free subscription access
 */
const redeemCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Redeem code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    minlength: [4, 'Redeem code must be at least 4 characters'],
    maxlength: [20, 'Redeem code cannot exceed 20 characters']
  },
  description: {
    type: String,
    required: false
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: [true, 'Plan is required for redeem code']
  },
  duration: {
    value: { type: Number, required: true, default: 1 },
    unit: { type: String, enum: ['day', 'week', 'month', 'year', 'days', 'weeks', 'months', 'years'], default: 'month' }
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  maxUses: {
    type: Number,
    default: null // null means unlimited
  },
  maxUsesPerUser: {
    type: Number,
    default: 1
  },
  currentUses: {
    type: Number,
    default: 0
  },
  usedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSubscription' },
    usedAt: { type: Date, default: Date.now }
  }],
  firstTimeOnly: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  campaign: {
    type: String,
    default: null // For tracking marketing campaigns
  }
}, {
  timestamps: true
});

// Virtual for checking if code is valid
redeemCodeSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validUntil > now &&
    (this.maxUses === null || this.currentUses < this.maxUses)
  );
});

// Statics
redeemCodeSchema.statics.findValidByCode = async function(code) {
  const redeemCode = await this.findOne({ code: code.toUpperCase() }).populate('plan');
  if (!redeemCode) return null;
  if (!redeemCode.isValid) return null;
  return redeemCode;
};

// Methods
redeemCodeSchema.methods.canBeUsedBy = async function(userId) {
  // Check if code is valid
  if (!this.isValid) return { valid: false, reason: 'This code is no longer valid or has expired' };
  // Check if user has already used this code
  const userUsage = this.usedBy.filter(u => u.user.toString() === userId.toString()).length;
  if (userUsage >= this.maxUsesPerUser) {
    return { valid: false, reason: 'You have already used this code' };
  }
  // Check first-time only restriction
  if (this.firstTimeOnly) {
    const UserSubscription = mongoose.model('UserSubscription');
    const previousSubs = await UserSubscription.countDocuments({
      user: userId,
      status: { $in: ['active', 'cancelled', 'expired'] }
    });
    if (previousSubs > 0) {
      return { valid: false, reason: 'This code is only for first-time subscribers' };
    }
  }
  return { valid: true };
};

redeemCodeSchema.methods.calculateEndDate = function(startDate = new Date()) {
  const endDate = new Date(startDate);
  switch (this.duration.unit) {
    case 'days':
      endDate.setDate(endDate.getDate() + this.duration.value);
      break;
    case 'weeks':
      endDate.setDate(endDate.getDate() + (this.duration.value * 7));
      break;
    case 'months':
      endDate.setMonth(endDate.getMonth() + this.duration.value);
      break;
    case 'years':
      endDate.setFullYear(endDate.getFullYear() + this.duration.value);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + this.duration.value);
  }
  return endDate;
};

redeemCodeSchema.methods.markUsed = async function(userId, subscriptionId = null) {
  this.currentUses += 1;
  this.usedBy.push({ user: userId, subscriptionId, usedAt: new Date() });
  await this.save();
};

redeemCodeSchema.index({ code: 1 });
redeemCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
redeemCodeSchema.index({ 'usedBy.user': 1 });

const RedeemCode = mongoose.model('RedeemCode', redeemCodeSchema);
module.exports = RedeemCode;
