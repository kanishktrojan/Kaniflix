import api from './api';
import type {
  AdminDashboardStats,
  AdminUser,
  AdminUserDetails,
  AdminAnalytics,
  AdminActivity,
  PaginatedUsersResponse,
  UserFilters,
  BulkUpdateRequest,
  RateLimitSettings,
  SubscriptionPlan,
  SubscriptionStats,
  CouponCode,
  RedeemCode,
} from '@/types';

/**
 * Admin Service
 * Handles all admin-related API calls
 */

// Dashboard
export const getDashboardStats = async (): Promise<AdminDashboardStats> => {
  const response = await api.get('/admin/dashboard');
  return response.data.data;
};

// Analytics
export const getAnalytics = async (period: string = '30d'): Promise<AdminAnalytics> => {
  const response = await api.get('/admin/analytics', { params: { period } });
  return response.data.data;
};

// Activity
export const getRecentActivity = async (limit: number = 50): Promise<AdminActivity> => {
  const response = await api.get('/admin/activity', { params: { limit } });
  return response.data.data;
};

// Users
export const getAllUsers = async (filters: UserFilters = {}): Promise<PaginatedUsersResponse> => {
  const response = await api.get('/admin/users', { params: filters });
  return response.data.data;
};

export const getUserById = async (id: string): Promise<AdminUserDetails> => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data.data;
};

export const updateUser = async (id: string, updates: Partial<AdminUser>): Promise<AdminUser> => {
  const response = await api.put(`/admin/users/${id}`, updates);
  return response.data.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};

export const bulkUpdateUsers = async (request: BulkUpdateRequest): Promise<{ modifiedCount: number }> => {
  const response = await api.post('/admin/users/bulk-update', request);
  return response.data.data;
};

// Rate Limit Settings
export const getRateLimitSettings = async (): Promise<RateLimitSettings> => {
  const response = await api.get('/admin/settings/rate-limits');
  return response.data.data;
};

export const updateRateLimitSettings = async (updates: Partial<RateLimitSettings>): Promise<RateLimitSettings> => {
  const response = await api.put('/admin/settings/rate-limits', updates);
  return response.data.data;
};

export const resetRateLimitSettings = async (): Promise<RateLimitSettings> => {
  const response = await api.post('/admin/settings/rate-limits/reset');
  return response.data.data;
};

// Subscription Plans
export const getSubscriptionStats = async (): Promise<SubscriptionStats> => {
  const response = await api.get('/admin/subscriptions/stats');
  const data = response.data.data;
  // Transform API response to expected format
  return {
    totalSubscribers: data.overview?.activeSubscriptions || 0,
    activeSubscriptions: data.overview?.activeSubscriptions || 0,
    monthlyRevenue: data.totalMonthlyRevenue || 0,
    yearlyRevenue: (data.totalMonthlyRevenue || 0) * 12,
    activeTrials: data.planDistribution?.find((p: { name: string }) => p.name === 'Trial')?.count || 0,
    activeCoupons: 0, // Will be fetched separately if needed
    cancelledThisMonth: 0,
    overview: data.overview,
    planDistribution: data.planDistribution || [],
    revenueByPlan: data.revenueByPlan || [],
    totalMonthlyRevenue: data.totalMonthlyRevenue || 0,
  };
};

export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get('/admin/subscriptions/plans');
  return response.data.data;
};

export const createSubscriptionPlan = async (data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  const response = await api.post('/admin/subscriptions/plans', data);
  return response.data.data;
};

export const updateSubscriptionPlan = async (id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
  const response = await api.put(`/admin/subscriptions/plans/${id}`, data);
  return response.data.data;
};

export const deleteSubscriptionPlan = async (id: string): Promise<void> => {
  await api.delete(`/admin/subscriptions/plans/${id}`);
};

// Coupon Codes
export const getCoupons = async (): Promise<CouponCode[]> => {
  const response = await api.get('/admin/subscriptions/coupons');
  // API returns { coupons, pagination }, extract just the coupons array
  return response.data.data.coupons || response.data.data;
};

export const createCoupon = async (data: Partial<CouponCode>): Promise<CouponCode> => {
  const response = await api.post('/admin/subscriptions/coupons', data);
  return response.data.data;
};

export const updateCoupon = async (id: string, data: Partial<CouponCode>): Promise<CouponCode> => {
  const response = await api.put(`/admin/subscriptions/coupons/${id}`, data);
  return response.data.data;
};

export const deleteCoupon = async (id: string): Promise<void> => {
  await api.delete(`/admin/subscriptions/coupons/${id}`);
};

export const getCouponUsage = async (id: string): Promise<{ coupon: CouponCode; usage: unknown[] }> => {
  const response = await api.get(`/admin/subscriptions/coupons/${id}/usage`);
  return response.data.data;
};

// Redeem Codes (Free Subscriptions - SEPARATE from Coupons)
export const getRedeemCodes = async (): Promise<RedeemCode[]> => {
  const response = await api.get('/admin/subscriptions/redeem-codes');
  return response.data.data.redeemCodes || response.data.data;
};

export const createRedeemCode = async (data: Partial<RedeemCode>): Promise<RedeemCode> => {
  const response = await api.post('/admin/subscriptions/redeem-codes', data);
  return response.data.data;
};

export const updateRedeemCode = async (id: string, data: Partial<RedeemCode>): Promise<RedeemCode> => {
  const response = await api.put(`/admin/subscriptions/redeem-codes/${id}`, data);
  return response.data.data;
};

export const deleteRedeemCode = async (id: string): Promise<void> => {
  await api.delete(`/admin/subscriptions/redeem-codes/${id}`);
};

export const getRedeemCodeUsage = async (id: string): Promise<{ code: string; usage: unknown[] }> => {
  const response = await api.get(`/admin/subscriptions/redeem-codes/${id}/usage`);
  return response.data.data;
};

export const bulkCreateRedeemCodes = async (data: {
  count: number;
  prefix?: string;
  plan: string;
  duration?: { value: number; unit: string };
  validFrom?: Date;
  validUntil?: Date;
  description?: string;
}): Promise<{ count: number; codes: string[] }> => {
  const response = await api.post('/admin/subscriptions/redeem-codes/bulk', data);
  return response.data.data;
};

export const adminService = {
  getDashboardStats,
  getAnalytics,
  getRecentActivity,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
  getRateLimitSettings,
  updateRateLimitSettings,
  resetRateLimitSettings,
  // Subscriptions
  getSubscriptionStats,
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  // Coupons
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
  // Redeem Codes
  getRedeemCodes,
  createRedeemCode,
  updateRedeemCode,
  deleteRedeemCode,
  getRedeemCodeUsage,
  bulkCreateRedeemCodes,
};

export default adminService;
