const mongoose = require('mongoose');

/**
 * Coupon Code Schema
 * Managed by admin - promotional and discount codes
 */
const couponCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [4, 'Coupon code must be at least 4 characters'],
      maxlength: [20, 'Coupon code cannot exceed 20 characters']
    },
    description: {
      type: String,
      required: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'trial_extension', 'free_month', 'free_subscription'],
      required: true
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    // Applicability
    applicablePlans: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan'
    }], // Empty means all plans
    minPurchaseAmount: {
      type: Number,
      default: 0
    },
    // Validity
    validFrom: {
      type: Date,
      default: Date.now
    },
    validUntil: {
      type: Date,
      required: true
    },
    // Usage limits
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
    // Users who have used this coupon
    usedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usedAt: {
        type: Date,
        default: Date.now
      },
      orderId: String
    }],
    // For first-time users only
    firstTimeOnly: {
      type: Boolean,
      default: false
    },
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    campaign: {
      type: String,
      default: null // For tracking marketing campaigns
    }
  },
  {
    timestamps: true
  }
);

// Indexes
couponCodeSchema.index({ code: 1 });
couponCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
couponCodeSchema.index({ 'usedBy.user': 1 });

// Virtual for checking if coupon is valid
couponCodeSchema.virtual('isValid').get(function() {
  const now = new Date();
  return (
    this.isActive &&
    this.validFrom <= now &&
    this.validUntil > now &&
    (this.maxUses === null || this.currentUses < this.maxUses)
  );
});

// Methods
couponCodeSchema.methods.canBeUsedBy = async function(userId) {
  // Check if coupon is valid
  if (!this.isValid) {
    return { valid: false, reason: 'Coupon is no longer valid' };
  }

  // Check if user has already used this coupon
  const userUsage = this.usedBy.filter(u => u.user.toString() === userId.toString()).length;
  if (userUsage >= this.maxUsesPerUser) {
    return { valid: false, reason: 'You have already used this coupon' };
  }

  // Check first-time only restriction
  if (this.firstTimeOnly) {
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    // Check if user has any previous subscriptions
    const UserSubscription = mongoose.model('UserSubscription');
    const previousSubs = await UserSubscription.countDocuments({ 
      user: userId,
      status: { $in: ['active', 'cancelled', 'expired'] }
    });
    if (previousSubs > 0) {
      return { valid: false, reason: 'This coupon is only for first-time subscribers' };
    }
  }

  return { valid: true };
};

couponCodeSchema.methods.calculateDiscount = function(originalAmount) {
  switch (this.discountType) {
    case 'percentage':
      return (originalAmount * this.discountValue) / 100;
    case 'fixed':
      return Math.min(this.discountValue, originalAmount);
    case 'free_month':
    case 'free_subscription':
      return originalAmount; // Full amount off
    default:
      return 0;
  }
};

couponCodeSchema.methods.markUsed = async function(userId, orderId = null) {
  this.usedBy.push({ user: userId, orderId, usedAt: new Date() });
  this.currentUses += 1;
  await this.save();
};

// Statics
couponCodeSchema.statics.findValidByCode = async function(code) {
  const coupon = await this.findOne({ 
    code: code.toUpperCase(),
    isActive: true
  });

  if (!coupon) {
    return null;
  }

  if (!coupon.isValid) {
    return null;
  }

  return coupon;
};

const CouponCode = mongoose.model('CouponCode', couponCodeSchema);

module.exports = CouponCode;
