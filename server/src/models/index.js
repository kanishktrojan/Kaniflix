const User = require('./User');
const WatchHistory = require('./WatchHistory');
const Watchlist = require('./Watchlist');
const OtpVerification = require('./OtpVerification');
const SportsEvent = require('./SportsEvent');
const Settings = require('./Settings');
const { SubscriptionPlan, UserSubscription } = require('./Subscription');
const CouponCode = require('./CouponCode');
const DeviceSession = require('./DeviceSession');
const RedeemCode = require('./RedeemCode');

module.exports = {
  User,
  WatchHistory,
  Watchlist,
  OtpVerification,
  SportsEvent,
  Settings,
  SubscriptionPlan,
  UserSubscription,
  CouponCode,
  DeviceSession,
  RedeemCode
};
