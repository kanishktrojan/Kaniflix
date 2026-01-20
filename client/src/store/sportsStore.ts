import { create } from 'zustand';
import { sportsService } from '@/services';
import type {
  SportsEvent,
  SportsCategoryInfo,
  SportsEventFilters,
  PaginatedSportsResponse,
  SportsStats,
  CreateSportsEventRequest,
  UpdateSportsEventRequest,
} from '@/types';

interface SportsState {
  // Public data
  events: SportsEvent[];
  liveEvents: SportsEvent[];
  upcomingEvents: SportsEvent[];
  featuredEvents: SportsEvent[];
  categories: SportsCategoryInfo[];
  currentEvent: SportsEvent | null;
  
  // Pagination
  pagination: PaginatedSportsResponse['pagination'] | null;
  
  // Admin data
  adminEvents: SportsEvent[];
  adminPagination: PaginatedSportsResponse['pagination'] | null;
  adminFilters: SportsEventFilters;
  sportsStats: SportsStats | null;
  selectedEvent: SportsEvent | null;
  selectedEventIds: string[];
  
  // Loading states
  isLoading: boolean;
  isLiveLoading: boolean;
  isUpcomingLoading: boolean;
  isFeaturedLoading: boolean;
  isCategoriesLoading: boolean;
  isAdminLoading: boolean;
  isStatsLoading: boolean;
  isEventLoading: boolean;
  isSaving: boolean;
  
  // Error
  error: string | null;
}

interface SportsActions {
  // Public actions
  fetchAllEvents: (filters?: SportsEventFilters) => Promise<void>;
  fetchLiveEvents: () => Promise<void>;
  fetchUpcomingEvents: (limit?: number, category?: string) => Promise<void>;
  fetchFeaturedEvents: (limit?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  fetchEventsByCategory: (category: string, page?: number) => Promise<void>;
  
  // Admin actions
  fetchAdminEvents: (filters?: SportsEventFilters) => Promise<void>;
  fetchAdminEventById: (id: string) => Promise<void>;
  fetchSportsStats: () => Promise<void>;
  createEvent: (data: CreateSportsEventRequest) => Promise<SportsEvent>;
  updateEvent: (id: string, data: UpdateSportsEventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEventLive: (id: string) => Promise<void>;
  updateEventScores: (id: string, team1Score: string, team2Score: string) => Promise<void>;
  bulkUpdateEvents: (updates: { isActive?: boolean; isFeatured?: boolean; status?: string }) => Promise<void>;
  
  // Selection
  setAdminFilters: (filters: SportsEventFilters) => void;
  toggleEventSelection: (eventId: string) => void;
  selectAllEvents: () => void;
  clearSelection: () => void;
  clearSelectedEvent: () => void;
  
  // Utility
  clearError: () => void;
  reset: () => void;
}

type SportsStore = SportsState & SportsActions;

const initialState: SportsState = {
  events: [],
  liveEvents: [],
  upcomingEvents: [],
  featuredEvents: [],
  categories: [],
  currentEvent: null,
  pagination: null,
  adminEvents: [],
  adminPagination: null,
  adminFilters: {
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  sportsStats: null,
  selectedEvent: null,
  selectedEventIds: [],
  isLoading: false,
  isLiveLoading: false,
  isUpcomingLoading: false,
  isFeaturedLoading: false,
  isCategoriesLoading: false,
  isAdminLoading: false,
  isStatsLoading: false,
  isEventLoading: false,
  isSaving: false,
  error: null,
};

export const useSportsStore = create<SportsStore>()((set, get) => ({
  ...initialState,

  // ==================== PUBLIC ACTIONS ====================

  fetchAllEvents: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await sportsService.getAllSportsEvents(filters);
      set({
        events: data.events,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  fetchLiveEvents: async () => {
    set({ isLiveLoading: true, error: null });
    try {
      const events = await sportsService.getLiveSportsEvents();
      set({ liveEvents: events, isLiveLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch live events',
        isLiveLoading: false,
      });
    }
  },

  fetchUpcomingEvents: async (limit, category) => {
    set({ isUpcomingLoading: true, error: null });
    try {
      const events = await sportsService.getUpcomingSportsEvents(limit, category);
      set({ upcomingEvents: events, isUpcomingLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch upcoming events',
        isUpcomingLoading: false,
      });
    }
  },

  fetchFeaturedEvents: async (limit) => {
    set({ isFeaturedLoading: true, error: null });
    try {
      const events = await sportsService.getFeaturedSportsEvents(limit);
      set({ featuredEvents: events, isFeaturedLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch featured events',
        isFeaturedLoading: false,
      });
    }
  },

  fetchCategories: async () => {
    set({ isCategoriesLoading: true, error: null });
    try {
      const categories = await sportsService.getSportsCategories();
      set({ categories, isCategoriesLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        isCategoriesLoading: false,
      });
    }
  },

  fetchEventById: async (id) => {
    set({ isEventLoading: true, error: null });
    try {
      const event = await sportsService.getSportsEventById(id);
      set({ currentEvent: event, isEventLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch event',
        isEventLoading: false,
      });
    }
  },

  fetchEventsByCategory: async (category, page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const data = await sportsService.getSportsEventsByCategory(category, page);
      set({
        events: data.events,
        pagination: data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isLoading: false,
      });
    }
  },

  // ==================== ADMIN ACTIONS ====================

  fetchAdminEvents: async (filters) => {
    const currentFilters = filters || get().adminFilters;
    set({ isAdminLoading: true, error: null, adminFilters: currentFilters });
    try {
      const data = await sportsService.getAdminSportsEvents(currentFilters);
      set({
        adminEvents: data.events,
        adminPagination: data.pagination,
        isAdminLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch events',
        isAdminLoading: false,
      });
    }
  },

  fetchAdminEventById: async (id) => {
    set({ isEventLoading: true, error: null });
    try {
      const event = await sportsService.getAdminSportsEventById(id);
      set({ selectedEvent: event, isEventLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch event',
        isEventLoading: false,
      });
    }
  },

  fetchSportsStats: async () => {
    set({ isStatsLoading: true, error: null });
    try {
      const stats = await sportsService.getAdminSportsStats();
      set({ sportsStats: stats, isStatsLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
        isStatsLoading: false,
      });
    }
  },

  createEvent: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const event = await sportsService.createSportsEvent(data);
      set((state) => ({
        adminEvents: [event, ...state.adminEvents],
        isSaving: false,
      }));
      return event;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create event',
        isSaving: false,
      });
      throw error;
    }
  },

  updateEvent: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedEvent = await sportsService.updateSportsEvent(id, data);
      set((state) => ({
        adminEvents: state.adminEvents.map((e) =>
          e._id === id ? updatedEvent : e
        ),
        selectedEvent: updatedEvent,
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update event',
        isSaving: false,
      });
      throw error;
    }
  },

  deleteEvent: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await sportsService.deleteSportsEvent(id);
      set((state) => ({
        adminEvents: state.adminEvents.filter((e) => e._id !== id),
        selectedEvent: state.selectedEvent?._id === id ? null : state.selectedEvent,
        selectedEventIds: state.selectedEventIds.filter((i) => i !== id),
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete event',
        isSaving: false,
      });
      throw error;
    }
  },

  toggleEventLive: async (id) => {
    set({ isSaving: true, error: null });
    try {
      const updatedEvent = await sportsService.toggleSportsEventLive(id);
      set((state) => ({
        adminEvents: state.adminEvents.map((e) =>
          e._id === id ? updatedEvent : e
        ),
        selectedEvent:
          state.selectedEvent?._id === id ? updatedEvent : state.selectedEvent,
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to toggle live status',
        isSaving: false,
      });
      throw error;
    }
  },

  updateEventScores: async (id, team1Score, team2Score) => {
    set({ isSaving: true, error: null });
    try {
      const updatedEvent = await sportsService.updateSportsEventScores(
        id,
        team1Score,
        team2Score
      );
      set((state) => ({
        adminEvents: state.adminEvents.map((e) =>
          e._id === id ? updatedEvent : e
        ),
        selectedEvent:
          state.selectedEvent?._id === id ? updatedEvent : state.selectedEvent,
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update scores',
        isSaving: false,
      });
      throw error;
    }
  },

  bulkUpdateEvents: async (updates) => {
    const { selectedEventIds } = get();
    if (selectedEventIds.length === 0) return;

    set({ isSaving: true, error: null });
    try {
      await sportsService.bulkUpdateSportsEvents({
        eventIds: selectedEventIds,
        updates: updates as { isActive?: boolean; isFeatured?: boolean; status?: 'upcoming' | 'live' | 'ended' | 'cancelled' },
      });
      // Refresh the list
      await get().fetchAdminEvents();
      set({ selectedEventIds: [], isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update events',
        isSaving: false,
      });
      throw error;
    }
  },

  // ==================== SELECTION & FILTERS ====================

  setAdminFilters: (filters) => {
    set({ adminFilters: { ...get().adminFilters, ...filters } });
  },

  toggleEventSelection: (eventId) => {
    set((state) => ({
      selectedEventIds: state.selectedEventIds.includes(eventId)
        ? state.selectedEventIds.filter((id) => id !== eventId)
        : [...state.selectedEventIds, eventId],
    }));
  },

  selectAllEvents: () => {
    const { adminEvents } = get();
    set({ selectedEventIds: adminEvents.map((e) => e._id) });
  },

  clearSelection: () => {
    set({ selectedEventIds: [] });
  },

  clearSelectedEvent: () => {
    set({ selectedEvent: null });
  },

  // ==================== UTILITY ====================

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));

export default useSportsStore;
