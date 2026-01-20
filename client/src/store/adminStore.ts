import { create } from 'zustand';
import { adminService } from '@/services';
import type {
  AdminDashboardStats,
  AdminUser,
  AdminUserDetails,
  AdminAnalytics,
  AdminActivity,
  PaginatedUsersResponse,
  UserFilters,
} from '@/types';

interface AdminState {
  // Dashboard
  dashboardStats: AdminDashboardStats | null;
  isDashboardLoading: boolean;

  // Users
  users: AdminUser[];
  selectedUser: AdminUserDetails | null;
  pagination: PaginatedUsersResponse['pagination'] | null;
  filters: UserFilters;
  isUsersLoading: boolean;
  isUserDetailsLoading: boolean;

  // Analytics
  analytics: AdminAnalytics | null;
  isAnalyticsLoading: boolean;

  // Activity
  activity: AdminActivity | null;
  isActivityLoading: boolean;

  // Errors
  error: string | null;

  // Selected users for bulk actions
  selectedUserIds: string[];
}

interface AdminActions {
  // Dashboard
  fetchDashboardStats: () => Promise<void>;

  // Users
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  fetchUserById: (id: string) => Promise<void>;
  updateUser: (id: string, updates: Partial<AdminUser>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  bulkUpdateUsers: (updates: { role?: 'user' | 'premium' | 'admin'; isActive?: boolean }) => Promise<void>;
  setFilters: (filters: UserFilters) => void;
  clearSelectedUser: () => void;

  // Selection
  toggleUserSelection: (userId: string) => void;
  selectAllUsers: () => void;
  clearSelection: () => void;

  // Analytics
  fetchAnalytics: (period?: string) => Promise<void>;

  // Activity
  fetchRecentActivity: (limit?: number) => Promise<void>;

  // Clear
  clearError: () => void;
  reset: () => void;
}

type AdminStore = AdminState & AdminActions;

const initialState: AdminState = {
  dashboardStats: null,
  isDashboardLoading: false,
  users: [],
  selectedUser: null,
  pagination: null,
  filters: {
    page: 1,
    limit: 20,
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  isUsersLoading: false,
  isUserDetailsLoading: false,
  analytics: null,
  isAnalyticsLoading: false,
  activity: null,
  isActivityLoading: false,
  error: null,
  selectedUserIds: [],
};

export const useAdminStore = create<AdminStore>()((set, get) => ({
  ...initialState,

  // Dashboard
  fetchDashboardStats: async () => {
    set({ isDashboardLoading: true, error: null });
    try {
      const stats = await adminService.getDashboardStats();
      set({ dashboardStats: stats, isDashboardLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
      set({ error: message, isDashboardLoading: false });
    }
  },

  // Users
  fetchUsers: async (newFilters?: UserFilters) => {
    const { filters } = get();
    const mergedFilters = { ...filters, ...newFilters };
    
    set({ isUsersLoading: true, error: null, filters: mergedFilters });
    try {
      const response = await adminService.getAllUsers(mergedFilters);
      set({
        users: response.users,
        pagination: response.pagination,
        isUsersLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch users';
      set({ error: message, isUsersLoading: false });
    }
  },

  fetchUserById: async (id: string) => {
    set({ isUserDetailsLoading: true, error: null });
    try {
      const userDetails = await adminService.getUserById(id);
      set({ selectedUser: userDetails, isUserDetailsLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user details';
      set({ error: message, isUserDetailsLoading: false });
    }
  },

  updateUser: async (id: string, updates: Partial<AdminUser>) => {
    set({ error: null });
    try {
      const updatedUser = await adminService.updateUser(id, updates);
      
      // Update user in the list
      set((state) => ({
        users: state.users.map((u) =>
          u._id === id ? { ...u, ...updatedUser } : u
        ),
        selectedUser: state.selectedUser?.user._id === id
          ? { ...state.selectedUser, user: { ...state.selectedUser.user, ...updatedUser } }
          : state.selectedUser,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user';
      set({ error: message });
      throw error;
    }
  },

  deleteUser: async (id: string) => {
    set({ error: null });
    try {
      await adminService.deleteUser(id);
      
      // Remove user from list
      set((state) => ({
        users: state.users.filter((u) => u._id !== id),
        selectedUser: state.selectedUser?.user._id === id ? null : state.selectedUser,
        selectedUserIds: state.selectedUserIds.filter((uid) => uid !== id),
        pagination: state.pagination
          ? { ...state.pagination, totalCount: state.pagination.totalCount - 1 }
          : null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      set({ error: message });
      throw error;
    }
  },

  bulkUpdateUsers: async (updates) => {
    const { selectedUserIds } = get();
    if (selectedUserIds.length === 0) return;

    set({ error: null });
    try {
      await adminService.bulkUpdateUsers({ userIds: selectedUserIds, updates });
      
      // Update users in the list
      set((state) => ({
        users: state.users.map((u) =>
          selectedUserIds.includes(u._id)
            ? { ...u, ...updates }
            : u
        ),
        selectedUserIds: [],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update users';
      set({ error: message });
      throw error;
    }
  },

  setFilters: (newFilters: UserFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  clearSelectedUser: () => {
    set({ selectedUser: null });
  },

  // Selection
  toggleUserSelection: (userId: string) => {
    set((state) => ({
      selectedUserIds: state.selectedUserIds.includes(userId)
        ? state.selectedUserIds.filter((id) => id !== userId)
        : [...state.selectedUserIds, userId],
    }));
  },

  selectAllUsers: () => {
    set((state) => ({
      selectedUserIds: state.users.map((u) => u._id),
    }));
  },

  clearSelection: () => {
    set({ selectedUserIds: [] });
  },

  // Analytics
  fetchAnalytics: async (period: string = '30d') => {
    set({ isAnalyticsLoading: true, error: null });
    try {
      const analytics = await adminService.getAnalytics(period);
      set({ analytics, isAnalyticsLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
      set({ error: message, isAnalyticsLoading: false });
    }
  },

  // Activity
  fetchRecentActivity: async (limit: number = 50) => {
    set({ isActivityLoading: true, error: null });
    try {
      const activity = await adminService.getRecentActivity(limit);
      set({ activity, isActivityLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch activity';
      set({ error: message, isActivityLoading: false });
    }
  },

  // Clear
  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
