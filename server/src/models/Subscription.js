const mongoose = require('mongoose');

/**
 * Subscription Plan Schema
 * Managed by admin - defines available subscription tiers
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
      enum: ['Free', 'Basic', 'Standard', 'Premium']
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      monthly: {
        type: Number,
        required: true,
        min: 0
      },
      yearly: {
        type: Number,
        required: true,
        min: 0
      },
      currency: {
        type: String,
        default: 'INR'
      }
    },
    features: [{
      name: {
        type: String,
        required: true
      },
      included: {
        type: Boolean,
        default: true
      },
      value: {
        type: String, // e.g., "4K+HDR", "2 screens", etc.
        default: null
      }
    }],
    limits: {
      maxStreams: {
        type: Number,
        default: 1 // Concurrent streams allowed
      },
      maxProfiles: {
        type: Number,
        default: 1
      },
      maxDownloads: {
        type: Number,
        default: 0
      },
      videoQuality: {
        type: String,
        enum: ['SD', 'HD', 'FHD', 'UHD'],
        default: 'HD'
      },
      adsEnabled: {
        type: Boolean,
        default: true
      }
    },
    badge: {
      text: String,
      color: String // Tailwind color class
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPopular: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/**
 * User Subscription Schema
 * Tracks user's current subscription status
 */
const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'paused', 'trial'],
      default: 'active'
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly'
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    trialEnd: {
      type: Date,
      default: null
    },
    // Payment info (masked)
    paymentMethod: {
      type: {
        type: String,
        enum: ['card', 'upi', 'paypal', 'other', 'none'],
        default: 'none'
      },
      last4: String,
      brand: String, // visa, mastercard, etc.
      expiryMonth: Number,
      expiryYear: Number
    },
    // Applied coupon
    appliedCoupon: {
      code: String,
      discountAmount: Number,
      discountType: String,
      appliedAt: Date,
      expiresAt: Date
    },
    // Payment history
    paymentHistory: [{
      razorpayPaymentId: String,
      razorpayOrderId: String,
      amount: Number,
      currency: {
        type: String,
        default: 'INR'
      },
      status: {
        type: String,
        enum: ['success', 'failed', 'refunded', 'pending'],
        default: 'success'
      },
      paidAt: {
        type: Date,
        default: Date.now
      },
      description: String
    }],
    // Legacy invoices (for backward compatibility)
    invoices: [{
      invoiceId: String,
      amount: Number,
      currency: String,
      status: {
        type: String,
        enum: ['paid', 'pending', 'failed', 'refunded']
      },
      paidAt: Date,
      description: String
    }]
  },
  {
    timestamps: true
  }
);

// Indexes
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
userSubscriptionSchema.index({ user: 1 });
userSubscriptionSchema.index({ status: 1 });
userSubscriptionSchema.index({ currentPeriodEnd: 1 });

// Methods
userSubscriptionSchema.methods.isExpired = function() {
  return this.currentPeriodEnd < new Date();
};

userSubscriptionSchema.methods.isInTrial = function() {
  return this.status === 'trial' && this.trialEnd && this.trialEnd > new Date();
};

userSubscriptionSchema.methods.canStream = function() {
  return ['active', 'trial'].includes(this.status) && !this.isExpired();
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
const UserSubscription = mongoose.model('UserSubscription', userSubscriptionSchema);

module.exports = { SubscriptionPlan, UserSubscription };
