import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useFeaturedStore } from '@/store';
import { DataTable, type Column } from '@/components/admin';
import { cn } from '@/utils';
import type { FeaturedContentItem } from '@/services/featuredService';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scheduled', label: 'Scheduled' },
];

const PLACEMENT_OPTIONS = [
  { value: 'banner', label: 'Hero Banner' },
  { value: 'trending', label: 'Trending Row' },
  { value: 'both', label: 'Both' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'movie', label: 'Movie' },
  { value: 'tv', label: 'TV Show' },
  { value: 'live', label: 'Live Stream' },
];

const initialFormData: Partial<FeaturedContentItem> = {
  title: '',
  description: '',
  contentType: 'movie',
  genre: '',
  year: new Date().getFullYear(),
  rating: '',
  duration: '',
  badgeLabel: '',
  placement: 'banner',
  priorityOrder: 0,
  status: 'active',
  scheduledAt: '',
  backdropImage: '',
  posterImage: '',
  streamUrl: '',
  trailerUrl: '',
  tmdbId: '',
};

const AdminFeatured: React.FC = () => {
  const {
    adminItems,
    adminPagination,
    adminFilters,
    selectedItem,
    selectedItemIds,
    isAdminLoading,
    isSaving,
    error,
    fetchAdminItems,
    fetchAdminItemById,
    createItem,
    updateItem,
    deleteItem,
    setAdminFilters,
    clearSelectedItem,
    clearError,
  } = useFeaturedStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeaturedContentItem | null>(null);
  const [formData, setFormData] = useState<Partial<FeaturedContentItem>>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAdminItems();
  }, [fetchAdminItems]);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        title: editingItem.title,
        description: editingItem.description,
        contentType: editingItem.contentType,
        genre: editingItem.genre || '',
        year: editingItem.year,
        rating: editingItem.rating || '',
        duration: editingItem.duration || '',
        badgeLabel: editingItem.badgeLabel || '',
        placement: editingItem.placement,
        priorityOrder: editingItem.priorityOrder,
        status: editingItem.status,
        scheduledAt: editingItem.scheduledAt
          ? new Date(editingItem.scheduledAt).toISOString().slice(0, 16)
          : '',
        backdropImage: editingItem.backdropImage,
        posterImage: editingItem.posterImage,
        streamUrl: editingItem.streamUrl,
        trailerUrl: editingItem.trailerUrl || '',
        tmdbId: editingItem.tmdbId || '',
      });
    }
  }, [editingItem]);

  const handleSearch = () => {
    setAdminFilters({ search: searchQuery, page: 1 });
    fetchAdminItems({ ...adminFilters, search: searchQuery, page: 1 });
  };

  const handleFilterChange = (key: string, value: string | number) => {
    const newFilters = { ...adminFilters, [key]: value, page: 1 };
    setAdminFilters(newFilters);
    fetchAdminItems(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...adminFilters, page };
    setAdminFilters(newFilters);
    fetchAdminItems(newFilters);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (item: FeaturedContentItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
    clearError();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseInt(value, 10) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingItem) {
        await updateItem(editingItem._id, formData);
      } else {
        await createItem(formData);
      }
      closeModal();
      fetchAdminItems();
    } catch {
      // Error handled in store
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteItem(selectedItem._id);
      setIsDeleteModalOpen(false);
      clearSelectedItem();
    } catch {
      // Error handled in store
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      hidden: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      scheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
          statusStyles[status] || statusStyles.hidden
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: Column<FeaturedContentItem>[] = [
    {
      key: 'posterImage',
      header: 'Content',
      render: (item) => (
        <div className="flex items-center gap-3">
          <img
            src={item.posterImage}
            alt={item.title}
            className="w-12 h-16 object-cover rounded-lg"
          />
          <div className="min-w-0">
            <p className="font-medium text-white truncate max-w-[200px]">
              {item.title}
            </p>
            <p className="text-xs text-text-secondary capitalize">
              {item.contentType} • {item.year}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'placement',
      header: 'Placement',
      render: (item) => (
        <span className="capitalize text-white">
          {item.placement === 'both' ? 'Banner & Trending' : item.placement}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => (
        <div className="flex flex-col gap-1">
          {getStatusBadge(item.status)}
          {item.status === 'scheduled' && item.scheduledAt && (
            <span className="text-xs text-text-secondary">
              {new Date(item.scheduledAt).toLocaleDateString()}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'priorityOrder',
      header: 'Priority',
      render: (item) => (
        <span className="text-white">{item.priorityOrder}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              fetchAdminItemById(item._id);
              setIsDeleteModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Featured Content</h1>
          <p className="text-text-secondary mt-1">
            Manage custom hero banners and trending row items
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Featured Item
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-surface rounded-xl p-4 border border-white/5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 bg-background border border-white/10 rounded-lg text-white placeholder:text-text-secondary focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              Search
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
              showFilters
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-background border-white/10 text-text-secondary hover:text-white'
            )}
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>

          <button
            onClick={() => fetchAdminItems()}
            disabled={isAdminLoading}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-white/10 text-text-secondary hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5', isAdminLoading && 'animate-spin')} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/5">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Placement
                  </label>
                  <select
                    value={adminFilters.placement || ''}
                    onChange={(e) => handleFilterChange('placement', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">All</option>
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Status
                  </label>
                  <select
                    value={adminFilters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">All</option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Sort By
                  </label>
                  <select
                    value={adminFilters.sortBy || 'priorityOrder'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="priorityOrder">Priority</option>
                    <option value="createdAt">Created Date</option>
                    <option value="title">Title</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Items Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={adminItems}
          keyExtractor={(item) => item._id}
          isLoading={isAdminLoading}
          selectable
          selectedIds={selectedItemIds}
          onSelectionChange={(ids) => {
            useFeaturedStore.setState({ selectedItemIds: ids });
          }}
          emptyMessage="No featured items found"
        />

        {adminPagination && adminPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-text-secondary">
              Showing {(adminPagination.page - 1) * adminPagination.limit + 1} to{' '}
              {Math.min(adminPagination.page * adminPagination.limit, adminPagination.totalCount)} of{' '}
              {adminPagination.totalCount} items
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(adminPagination.page - 1)}
                disabled={adminPagination.page === 1}
                className="px-3 py-1 bg-background border border-white/10 text-white rounded-lg disabled:opacity-50 hover:border-primary"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(adminPagination.page + 1)}
                disabled={!adminPagination.hasMore}
                className="px-3 py-1 bg-background border border-white/10 text-white rounded-lg disabled:opacity-50 hover:border-primary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-surface rounded-xl shadow-2xl m-4"
            >
              <div className="sticky top-0 bg-surface border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-white">
                  {editingItem ? 'Edit Featured Item' : 'Create Featured Item'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-6 h-6 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Content Type</label>
                    <select
                      name="contentType"
                      value={formData.contentType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {CONTENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Placement *</label>
                    <select
                      name="placement"
                      value={formData.placement}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {PLACEMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {formData.status === 'scheduled' && (
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        name="scheduledAt"
                        value={formData.scheduledAt || ''}
                        onChange={handleInputChange}
                        required={formData.status === 'scheduled'}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Priority Order (Higher = First)</label>
                    <input
                      type="number"
                      name="priorityOrder"
                      value={formData.priorityOrder}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Year</label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Genre</label>
                    <input
                      type="text"
                      name="genre"
                      value={formData.genre}
                      onChange={handleInputChange}
                      placeholder="e.g. Action, Sci-Fi"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Rating</label>
                    <input
                      type="text"
                      name="rating"
                      value={formData.rating}
                      onChange={handleInputChange}
                      placeholder="e.g. 8.5/10, TV-MA"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Duration</label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="e.g. 2h 15m, 1 Season"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">Badge Label</label>
                    <input
                      type="text"
                      name="badgeLabel"
                      value={formData.badgeLabel}
                      onChange={handleInputChange}
                      placeholder="e.g. New Episode, Premium"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-text-secondary mb-1">TMDB ID (Optional)</label>
                    <input
                      type="text"
                      name="tmdbId"
                      value={formData.tmdbId}
                      onChange={handleInputChange}
                      placeholder="For logo/metadata fallback"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Backdrop Image URL *</label>
                    <input
                      type="url"
                      name="backdropImage"
                      value={formData.backdropImage}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Poster Image URL *</label>
                    <input
                      type="url"
                      name="posterImage"
                      value={formData.posterImage}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Stream URL *</label>
                    <input
                      type="url"
                      name="streamUrl"
                      value={formData.streamUrl}
                      onChange={handleInputChange}
                      required
                      placeholder="M3U8 / MP4 stream link"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm text-text-secondary mb-1">Trailer URL (Optional)</label>
                    <input
                      type="url"
                      name="trailerUrl"
                      value={formData.trailerUrl}
                      onChange={handleInputChange}
                      placeholder="YouTube link or direct mp4"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                    />
                  </div>

                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-2 bg-background border border-white/10 hover:border-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70"
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-surface border border-white/10 rounded-xl shadow-2xl p-6 m-4"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Item</h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete "{selectedItem.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-background border border-white/10 hover:border-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Deleting...' : 'Delete Item'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminFeatured;
