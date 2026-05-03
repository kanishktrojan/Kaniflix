import { create } from 'zustand';
import { featuredService } from '@/services/featuredService';
import type { FeaturedContentItem, PaginatedFeaturedResponse } from '@/services/featuredService';

export interface FeaturedFilters {
  page?: number;
  limit?: number;
  placement?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface FeaturedState {
  adminItems: FeaturedContentItem[];
  adminPagination: PaginatedFeaturedResponse['pagination'] | null;
  adminFilters: FeaturedFilters;
  selectedItem: FeaturedContentItem | null;
  selectedItemIds: string[];
  
  isAdminLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface FeaturedActions {
  fetchAdminItems: (filters?: FeaturedFilters) => Promise<void>;
  fetchAdminItemById: (id: string) => Promise<void>;
  createItem: (data: Partial<FeaturedContentItem>) => Promise<FeaturedContentItem>;
  updateItem: (id: string, data: Partial<FeaturedContentItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  bulkUpdateItems: (updates: Partial<FeaturedContentItem>) => Promise<void>;
  
  setAdminFilters: (filters: FeaturedFilters) => void;
  toggleItemSelection: (itemId: string) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  clearSelectedItem: () => void;
  
  clearError: () => void;
  reset: () => void;
}

type FeaturedStore = FeaturedState & FeaturedActions;

const initialState: FeaturedState = {
  adminItems: [],
  adminPagination: null,
  adminFilters: {
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'priorityOrder',
    sortOrder: 'desc',
  },
  selectedItem: null,
  selectedItemIds: [],
  isAdminLoading: false,
  isSaving: false,
  error: null,
};

export const useFeaturedStore = create<FeaturedStore>()((set, get) => ({
  ...initialState,

  fetchAdminItems: async (filters) => {
    const currentFilters = filters || get().adminFilters;
    set({ isAdminLoading: true, error: null, adminFilters: currentFilters });
    try {
      const data = await featuredService.getAllFeaturedAdmin(currentFilters);
      set({
        adminItems: data.items,
        adminPagination: data.pagination,
        isAdminLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch featured content',
        isAdminLoading: false,
      });
    }
  },

  fetchAdminItemById: async (id) => {
    set({ isAdminLoading: true, error: null });
    try {
      const item = await featuredService.getFeaturedByIdAdmin(id);
      set({ selectedItem: item, isAdminLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch item',
        isAdminLoading: false,
      });
    }
  },

  createItem: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const item = await featuredService.createFeatured(data);
      set((state) => ({
        adminItems: [item, ...state.adminItems],
        isSaving: false,
      }));
      return item;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create item',
        isSaving: false,
      });
      throw error;
    }
  },

  updateItem: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updatedItem = await featuredService.updateFeatured(id, data);
      set((state) => ({
        adminItems: state.adminItems.map((e) =>
          e._id === id ? updatedItem : e
        ),
        selectedItem: updatedItem,
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update item',
        isSaving: false,
      });
      throw error;
    }
  },

  deleteItem: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await featuredService.deleteFeatured(id);
      set((state) => ({
        adminItems: state.adminItems.filter((e) => e._id !== id),
        selectedItem: state.selectedItem?._id === id ? null : state.selectedItem,
        selectedItemIds: state.selectedItemIds.filter((i) => i !== id),
        isSaving: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete item',
        isSaving: false,
      });
      throw error;
    }
  },

  bulkUpdateItems: async (updates) => {
    const { selectedItemIds } = get();
    if (selectedItemIds.length === 0) return;

    set({ isSaving: true, error: null });
    try {
      await featuredService.bulkUpdateFeatured({
        itemIds: selectedItemIds,
        updates,
      });
      await get().fetchAdminItems();
      set({ selectedItemIds: [], isSaving: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update items',
        isSaving: false,
      });
      throw error;
    }
  },

  setAdminFilters: (filters) => {
    set({ adminFilters: { ...get().adminFilters, ...filters } });
  },

  toggleItemSelection: (itemId) => {
    set((state) => ({
      selectedItemIds: state.selectedItemIds.includes(itemId)
        ? state.selectedItemIds.filter((id) => id !== itemId)
        : [...state.selectedItemIds, itemId],
    }));
  },

  selectAllItems: () => {
    const { adminItems } = get();
    set({ selectedItemIds: adminItems.map((e) => e._id) });
  },

  clearSelection: () => {
    set({ selectedItemIds: [] });
  },

  clearSelectedItem: () => {
    set({ selectedItem: null });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));
