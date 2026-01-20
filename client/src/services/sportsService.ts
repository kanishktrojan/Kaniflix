import api from './api';
import type {
  SportsEvent,
  SportsStreamInfo,
  SportsCategoryInfo,
  SportsEventFilters,
  PaginatedSportsResponse,
  SportsStats,
  CreateSportsEventRequest,
  UpdateSportsEventRequest,
  BulkUpdateSportsRequest,
} from '@/types';

/**
 * Sports Service
 * Handles all sports-related API calls
 */

// ==================== PUBLIC ENDPOINTS ====================

export const getAllSportsEvents = async (
  filters: SportsEventFilters = {}
): Promise<PaginatedSportsResponse> => {
  const response = await api.get('/sports', { params: filters });
  return response.data.data;
};

export const getSportsCategories = async (): Promise<SportsCategoryInfo[]> => {
  const response = await api.get('/sports/categories');
  return response.data.data;
};

export const getLiveSportsEvents = async (): Promise<SportsEvent[]> => {
  const response = await api.get('/sports/live');
  return response.data.data;
};

export const getUpcomingSportsEvents = async (
  limit?: number,
  category?: string
): Promise<SportsEvent[]> => {
  const response = await api.get('/sports/upcoming', {
    params: { limit, category },
  });
  return response.data.data;
};

export const getFeaturedSportsEvents = async (
  limit?: number
): Promise<SportsEvent[]> => {
  const response = await api.get('/sports/featured', { params: { limit } });
  return response.data.data;
};

export const getSportsEventsByCategory = async (
  category: string,
  page?: number,
  limit?: number
): Promise<PaginatedSportsResponse> => {
  const response = await api.get(`/sports/category/${category}`, {
    params: { page, limit },
  });
  return response.data.data;
};

export const getSportsEventById = async (id: string): Promise<SportsEvent> => {
  const response = await api.get(`/sports/${id}`);
  return response.data.data;
};

export const getSportsStreamInfo = async (
  id: string
): Promise<SportsStreamInfo> => {
  const response = await api.get(`/sports/${id}/stream`);
  return response.data.data;
};

// ==================== ADMIN ENDPOINTS ====================

export const getAdminSportsStats = async (): Promise<SportsStats> => {
  const response = await api.get('/admin/sports/stats');
  return response.data.data;
};

export const getAdminSportsEvents = async (
  filters: SportsEventFilters = {}
): Promise<PaginatedSportsResponse> => {
  const response = await api.get('/admin/sports', { params: filters });
  return response.data.data;
};

export const getAdminSportsEventById = async (
  id: string
): Promise<SportsEvent> => {
  const response = await api.get(`/admin/sports/${id}`);
  return response.data.data;
};

export const createSportsEvent = async (
  data: CreateSportsEventRequest
): Promise<SportsEvent> => {
  const response = await api.post('/admin/sports', data);
  return response.data.data;
};

export const updateSportsEvent = async (
  id: string,
  data: UpdateSportsEventRequest
): Promise<SportsEvent> => {
  const response = await api.put(`/admin/sports/${id}`, data);
  return response.data.data;
};

export const deleteSportsEvent = async (id: string): Promise<void> => {
  await api.delete(`/admin/sports/${id}`);
};

export const toggleSportsEventLive = async (
  id: string
): Promise<SportsEvent> => {
  const response = await api.patch(`/admin/sports/${id}/toggle-live`);
  return response.data.data;
};

export const updateSportsEventScores = async (
  id: string,
  team1Score: string,
  team2Score: string
): Promise<SportsEvent> => {
  const response = await api.patch(`/admin/sports/${id}/scores`, {
    team1Score,
    team2Score,
  });
  return response.data.data;
};

export const bulkUpdateSportsEvents = async (
  request: BulkUpdateSportsRequest
): Promise<{ modifiedCount: number }> => {
  const response = await api.post('/admin/sports/bulk-update', request);
  return response.data.data;
};

export const sportsService = {
  // Public
  getAllSportsEvents,
  getSportsCategories,
  getLiveSportsEvents,
  getUpcomingSportsEvents,
  getFeaturedSportsEvents,
  getSportsEventsByCategory,
  getSportsEventById,
  getSportsStreamInfo,
  // Admin
  getAdminSportsStats,
  getAdminSportsEvents,
  getAdminSportsEventById,
  createSportsEvent,
  updateSportsEvent,
  deleteSportsEvent,
  toggleSportsEventLive,
  updateSportsEventScores,
  bulkUpdateSportsEvents,
};

export default sportsService;
