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
};

export default adminService;
