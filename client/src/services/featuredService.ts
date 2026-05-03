import api from './api';

export interface FeaturedContentItem {
  _id: string;
  title: string;
  description: string;
  contentType: 'movie' | 'tv' | 'live';
  genre: string;
  year: number;
  rating: string;
  duration: string;
  badgeLabel: string;
  placement: 'banner' | 'trending' | 'both';
  priorityOrder: number;
  status: 'active' | 'hidden' | 'scheduled';
  scheduledAt: string | null;
  backdropImage: string;
  posterImage: string;
  logoImage: string;
  streamUrl: string;
  trailerUrl: string;
  tmdbId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedFeaturedResponse {
  items: FeaturedContentItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface FeaturedStreamInfo {
  _id: string;
  title: string;
  streamUrl: string;
}

// Admin API
export const getAllFeaturedAdmin = async (params: {
  page?: number;
  limit?: number;
  placement?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<PaginatedFeaturedResponse> => {
  const response = await api.get('/admin/featured', { params });
  return response.data.data;
};

export const getFeaturedByIdAdmin = async (id: string): Promise<FeaturedContentItem> => {
  const response = await api.get(`/admin/featured/${id}`);
  return response.data.data;
};

export const createFeatured = async (data: Partial<FeaturedContentItem>): Promise<FeaturedContentItem> => {
  const response = await api.post('/admin/featured', data);
  return response.data.data;
};

export const updateFeatured = async (id: string, data: Partial<FeaturedContentItem>): Promise<FeaturedContentItem> => {
  const response = await api.put(`/admin/featured/${id}`, data);
  return response.data.data;
};

export const deleteFeatured = async (id: string): Promise<void> => {
  await api.delete(`/admin/featured/${id}`);
};

export const bulkUpdateFeatured = async (data: { itemIds: string[], updates: Partial<FeaturedContentItem> }): Promise<{ modifiedCount: number }> => {
  const response = await api.post('/admin/featured/bulk-update', data);
  return response.data.data;
};

// Public API
export const getActiveFeatured = async (): Promise<FeaturedContentItem[]> => {
  const response = await api.get('/featured');
  return response.data.data;
};

export const getFeaturedStreamInfo = async (id: string): Promise<FeaturedStreamInfo> => {
  const response = await api.get(`/featured/${id}/stream`);
  return response.data.data;
};

export const featuredService = {
  // Admin
  getAllFeaturedAdmin,
  getFeaturedByIdAdmin,
  createFeatured,
  updateFeatured,
  deleteFeatured,
  bulkUpdateFeatured,
  // Public
  getActiveFeatured,
  getFeaturedStreamInfo
};

export default featuredService;
