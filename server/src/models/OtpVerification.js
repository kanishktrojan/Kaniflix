const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * OTP Verification Schema
 * Stores pending signup data until OTP is verified
 */
const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    otp: {
      type: String,
      required: true
    },
    otpExpires: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index - document expires when otpExpires is reached
    },
    attempts: {
      type: Number,
      default: 0
    },
    lastResendAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Generate a 6-digit OTP
 */
otpVerificationSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP before saving
 */
otpVerificationSchema.pre('save', async function(next) {
  if (this.isModified('otp')) {
    this.otp = await bcrypt.hash(this.otp, 10);
  }
  next();
});

/**
 * Verify OTP
 */
otpVerificationSchema.methods.verifyOTP = async function(otp) {
  return bcrypt.compare(otp, this.otp);
};

/**
 * Check if OTP is expired
 */
otpVerificationSchema.methods.isExpired = function() {
  return Date.now() > this.otpExpires;
};

/**
 * Check if can resend OTP (1 minute cooldown)
 */
otpVerificationSchema.methods.canResend = function() {
  if (!this.lastResendAt) return true;
  const cooldownMs = 60 * 1000; // 1 minute
  return Date.now() - this.lastResendAt > cooldownMs;
};

const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema);

module.exports = OtpVerification;
