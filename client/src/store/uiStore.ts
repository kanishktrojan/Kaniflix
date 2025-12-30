import { create } from 'zustand';
import type { MediaItem, Genre, MediaType, BrowseFilters } from '@/types';

interface UIState {
  // Search
  searchQuery: string;
  searchResults: MediaItem[];
  isSearching: boolean;

  // Filters
  filters: BrowseFilters;
  selectedGenre: Genre | null;
  selectedMediaType: MediaType | 'all';

  // Modal
  isTrailerModalOpen: boolean;
  trailerKey: string | null;
  
  // Featured content
  featuredItem: MediaItem | null;

  // Sidebar
  isSidebarOpen: boolean;

  // Theme
  theme: 'dark' | 'light';
}

interface UIActions {
  // Search
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: MediaItem[]) => void;
  setIsSearching: (searching: boolean) => void;
  clearSearch: () => void;

  // Filters
  setFilters: (filters: Partial<BrowseFilters>) => void;
  setSelectedGenre: (genre: Genre | null) => void;
  setSelectedMediaType: (type: MediaType | 'all') => void;
  resetFilters: () => void;

  // Modal
  openTrailerModal: (videoKey: string) => void;
  closeTrailerModal: () => void;

  // Featured
  setFeaturedItem: (item: MediaItem | null) => void;

  // Sidebar
  toggleSidebar: () => void;
  closeSidebar: () => void;

  // Theme
  toggleTheme: () => void;
}

type UIStore = UIState & UIActions;

const initialFilters: BrowseFilters = {
  page: 1,
  sort: 'popularity.desc',
};

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  filters: initialFilters,
  selectedGenre: null,
  selectedMediaType: 'all',
  isTrailerModalOpen: false,
  trailerKey: null,
  featuredItem: null,
  isSidebarOpen: false,
  theme: 'dark',

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  clearSearch: () => set({ searchQuery: '', searchResults: [], isSearching: false }),

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  setSelectedGenre: (genre) => set({ selectedGenre: genre }),
  setSelectedMediaType: (type) => set({ selectedMediaType: type }),
  resetFilters: () => set({ filters: initialFilters, selectedGenre: null }),

  openTrailerModal: (videoKey) => set({ isTrailerModalOpen: true, trailerKey: videoKey }),
  closeTrailerModal: () => set({ isTrailerModalOpen: false, trailerKey: null }),

  setFeaturedItem: (item) => set({ featuredItem: item }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}));
