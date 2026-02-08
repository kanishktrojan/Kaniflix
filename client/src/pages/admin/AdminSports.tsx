import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  Radio,
  Calendar,
  Trophy,
  Play,
  Pause,
  XCircle,
  Star,
  RefreshCw,
  TrendingUp,
  Users,
  Shield,
} from 'lucide-react';
import { useSportsStore } from '@/store';
import { StatCard, DataTable, type Column } from '@/components/admin';
import { cn } from '@/utils';
import type { SportsEvent, SportCategory, SportsEventStatus } from '@/types';

// Sport Category Options
const SPORT_CATEGORIES: { value: SportCategory; label: string; icon: string }[] = [
  { value: 'cricket', label: 'Cricket', icon: '🏏' },
  { value: 'football', label: 'Football', icon: '⚽' },
  { value: 'basketball', label: 'Basketball', icon: '🏀' },
  { value: 'tennis', label: 'Tennis', icon: '🎾' },
  { value: 'hockey', label: 'Hockey', icon: '🏒' },
  { value: 'baseball', label: 'Baseball', icon: '⚾' },
  { value: 'motorsport', label: 'Motorsport', icon: '🏎️' },
  { value: 'mma', label: 'MMA', icon: '🥊' },
  { value: 'boxing', label: 'Boxing', icon: '🥊' },
  { value: 'wrestling', label: 'Wrestling', icon: '🤼' },
  { value: 'golf', label: 'Golf', icon: '⛳' },
  { value: 'esports', label: 'Esports', icon: '🎮' },
  { value: 'olympics', label: 'Olympics', icon: '🏅' },
  { value: 'other', label: 'Other', icon: '🏆' },
];

const STATUS_OPTIONS: { value: SportsEventStatus; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'ended', label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface FormData {
  title: string;
  description: string;
  thumbnail: string;
  banner: string;
  category: SportCategory;
  team1Name: string;
  team1Logo: string;
  team1Score: string;
  team2Name: string;
  team2Logo: string;
  team2Score: string;
  status: SportsEventStatus;
  scheduledAt: string;
  endedAt: string;
  streamUrl: string;
  useProxy: boolean;
  drmEnabled: boolean;
  drmType: 'clearkey' | 'widevine' | 'fairplay';
  drmLicenseUrl: string;
  clearkeyKeyId: string;
  clearkeyKey: string;
  venue: string;
  tournament: string;
  isActive: boolean;
  isFeatured: boolean;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  thumbnail: '',
  banner: '',
  category: 'cricket',
  team1Name: '',
  team1Logo: '',
  team1Score: '',
  team2Name: '',
  team2Logo: '',
  team2Score: '',
  status: 'upcoming',
  scheduledAt: '',
  endedAt: '',
  streamUrl: '',
  useProxy: false,
  drmEnabled: false,
  drmType: 'clearkey',
  drmLicenseUrl: '',
  clearkeyKeyId: '',
  clearkeyKey: '',
  venue: '',
  tournament: '',
  isActive: true,
  isFeatured: false,
};

const AdminSports: React.FC = () => {
  const {
    adminEvents,
    adminPagination,
    adminFilters,
    sportsStats,
    selectedEvent,
    selectedEventIds,
    isAdminLoading,
    isSaving,
    error,
    fetchAdminEvents,
    fetchSportsStats,
    fetchAdminEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleEventLive,
    setAdminFilters,
    clearSelectedEvent,
    clearError,
  } = useSportsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportsEvent | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAdminEvents();
    fetchSportsStats();
  }, [fetchAdminEvents, fetchSportsStats]);

  useEffect(() => {
    if (editingEvent) {
      setFormData({
        title: editingEvent.title,
        description: editingEvent.description,
        thumbnail: editingEvent.thumbnail,
        banner: editingEvent.banner || '',
        category: editingEvent.category,
        team1Name: editingEvent.team1?.name || '',
        team1Logo: editingEvent.team1?.logo || '',
        team1Score: editingEvent.team1?.score || '',
        team2Name: editingEvent.team2?.name || '',
        team2Logo: editingEvent.team2?.logo || '',
        team2Score: editingEvent.team2?.score || '',
        status: editingEvent.status,
        scheduledAt: editingEvent.scheduledAt
          ? new Date(editingEvent.scheduledAt).toISOString().slice(0, 16)
          : '',
        endedAt: editingEvent.endedAt
          ? new Date(editingEvent.endedAt).toISOString().slice(0, 16)
          : '',
        streamUrl: editingEvent.streamUrl || '',
        useProxy: editingEvent.useProxy || false,
        drmEnabled: editingEvent.drmEnabled,
        drmType: editingEvent.drmConfig?.type || 'clearkey',
        drmLicenseUrl: editingEvent.drmConfig?.licenseUrl || '',
        clearkeyKeyId: editingEvent.drmConfig?.clearkey?.keyId || '',
        clearkeyKey: editingEvent.drmConfig?.clearkey?.key || '',
        venue: editingEvent.venue || '',
        tournament: editingEvent.tournament || '',
        isActive: editingEvent.isActive,
        isFeatured: editingEvent.isFeatured,
      });
    }
  }, [editingEvent]);

  const handleSearch = () => {
    setAdminFilters({ search: searchQuery, page: 1 });
    fetchAdminEvents({ ...adminFilters, search: searchQuery, page: 1 });
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...adminFilters, [key]: value, page: 1 };
    setAdminFilters(newFilters);
    fetchAdminEvents(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...adminFilters, page };
    setAdminFilters(newFilters);
    fetchAdminEvents(newFilters);
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (event: SportsEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setFormData(initialFormData);
    clearError();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData = {
      title: formData.title,
      description: formData.description,
      thumbnail: formData.thumbnail,
      banner: formData.banner || undefined,
      category: formData.category,
      team1: {
        name: formData.team1Name,
        logo: formData.team1Logo,
        score: formData.team1Score,
      },
      team2: {
        name: formData.team2Name,
        logo: formData.team2Logo,
        score: formData.team2Score,
      },
      status: formData.status,
      isLive: formData.status === 'live',
      scheduledAt: formData.scheduledAt,
      endedAt: formData.endedAt || null,
      streamUrl: formData.streamUrl,
      useProxy: formData.useProxy,
      drmEnabled: formData.drmEnabled,
      drmConfig: formData.drmEnabled
        ? {
            type: formData.drmType,
            licenseUrl: formData.drmLicenseUrl,
            clearkey: {
              keyId: formData.clearkeyKeyId,
              key: formData.clearkeyKey,
            },
          }
        : undefined,
      venue: formData.venue || undefined,
      tournament: formData.tournament || undefined,
      isActive: formData.isActive,
      isFeatured: formData.isFeatured,
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent._id, eventData);
      } else {
        await createEvent(eventData);
      }
      closeModal();
      fetchAdminEvents();
      fetchSportsStats();
    } catch {
      // Error is handled in store
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await deleteEvent(selectedEvent._id);
      setIsDeleteModalOpen(false);
      clearSelectedEvent();
      fetchSportsStats();
    } catch {
      // Error handled in store
    }
  };

  const handleToggleLive = async (id: string) => {
    try {
      await toggleEventLive(id);
      fetchSportsStats();
    } catch {
      // Error handled in store
    }
  };

  const getStatusBadge = (status: SportsEventStatus, isLive: boolean) => {
    if (isLive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>
      );
    }

    const statusStyles: Record<SportsEventStatus, string> = {
      upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      live: 'bg-red-500/20 text-red-400 border-red-500/30',
      ended: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      cancelled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
          statusStyles[status]
        )}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const columns: Column<SportsEvent>[] = [
    {
      key: 'thumbnail',
      header: 'Event',
      render: (event) => (
        <div className="flex items-center gap-3">
          <img
            src={event.thumbnail}
            alt={event.title}
            className="w-16 h-10 object-cover rounded-lg"
          />
          <div className="min-w-0">
            <p className="font-medium text-white truncate max-w-[200px]">
              {event.title}
            </p>
            <p className="text-xs text-text-secondary">
              {SPORT_CATEGORIES.find((c) => c.value === event.category)?.icon}{' '}
              {event.tournament || event.category}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (event) => (
        <div className="text-sm">
          <span className="text-white">{event.team1?.name || '-'}</span>
          <span className="text-text-secondary mx-1">vs</span>
          <span className="text-white">{event.team2?.name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(event.status, event.isLive)}
          {event.useProxy && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30" title="Using Proxy">
              <Shield className="w-3 h-3" />
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'scheduledAt',
      header: 'Schedule',
      render: (event) => (
        <div className="text-sm">
          <p className="text-white">
            {new Date(event.scheduledAt).toLocaleDateString()}
          </p>
          <p className="text-text-secondary">
            {new Date(event.scheduledAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'viewCount',
      header: 'Views',
      render: (event) => (
        <span className="text-text-secondary">{event.viewCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'isFeatured',
      header: 'Featured',
      render: (event) =>
        event.isFeatured ? (
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <Star className="w-4 h-4 text-text-secondary" />
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (event) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleLive(event._id)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              event.isLive
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            )}
            title={event.isLive ? 'End Live' : 'Go Live'}
          >
            {event.isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => openEditModal(event)}
            className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              fetchAdminEventById(event._id);
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
          <h1 className="text-2xl font-bold text-white">Sports Management</h1>
          <p className="text-text-secondary mt-1">
            Manage live sports events and streaming content
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={sportsStats?.totalEvents || 0}
          icon={Trophy}
        />
        <StatCard
          title="Live Now"
          value={sportsStats?.liveEvents || 0}
          icon={Radio}
          description="Currently streaming"
        />
        <StatCard
          title="Upcoming"
          value={sportsStats?.upcomingEvents || 0}
          icon={Calendar}
        />
        <StatCard
          title="Total Views"
          value={sportsStats?.totalViews || 0}
          icon={TrendingUp}
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-surface rounded-xl p-4 border border-white/5">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                placeholder="Search events..."
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

          {/* Filter Toggle */}
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

          {/* Refresh */}
          <button
            onClick={() => fetchAdminEvents()}
            disabled={isAdminLoading}
            className="flex items-center gap-2 px-4 py-2 bg-background border border-white/10 text-text-secondary hover:text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5', isAdminLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Filter Options */}
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
                    Category
                  </label>
                  <select
                    value={adminFilters.category || ''}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="">All Categories</option>
                    {SPORT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
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
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">
                    Sort By
                  </label>
                  <select
                    value={adminFilters.sortBy || 'createdAt'}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="scheduledAt">Schedule Date</option>
                    <option value="title">Title</option>
                    <option value="viewCount">Views</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Events Table */}
      <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
        <DataTable
          columns={columns}
          data={adminEvents}
          keyExtractor={(event) => event._id}
          isLoading={isAdminLoading}
          selectable
          selectedIds={selectedEventIds}
          onSelectionChange={(ids) => {
            // Update selection
            useSportsStore.setState({ selectedEventIds: ids });
          }}
          emptyMessage="No sports events found"
        />

        {/* Pagination */}
        {adminPagination && adminPagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-text-secondary">
              Showing {(adminPagination.page - 1) * adminPagination.limit + 1} to{' '}
              {Math.min(adminPagination.page * adminPagination.limit, adminPagination.totalCount)} of{' '}
              {adminPagination.totalCount} events
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(adminPagination.page - 1)}
                disabled={adminPagination.page === 1}
                className="px-3 py-1 bg-background border border-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(adminPagination.page + 1)}
                disabled={!adminPagination.hasMore}
                className="px-3 py-1 bg-background border border-white/10 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
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
              <div className="sticky top-0 bg-surface border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm text-text-secondary mb-1">
                        Event Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="e.g., India vs Australia - T20 World Cup Final"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-text-secondary mb-1">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary resize-none"
                        placeholder="Brief description of the event..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      >
                        {SPORT_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Status *
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Tournament
                      </label>
                      <input
                        type="text"
                        name="tournament"
                        value={formData.tournament}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="e.g., ICC T20 World Cup 2026"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Venue
                      </label>
                      <input
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="e.g., Melbourne Cricket Ground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Scheduled Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        name="scheduledAt"
                        value={formData.scheduledAt}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        End Date & Time <span className="text-white/40">(Optional - auto-ends stream)</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="endedAt"
                        value={formData.endedAt}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      />
                      {formData.endedAt && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, endedAt: '' })}
                          className="text-xs text-red-400 hover:text-red-300 mt-1"
                        >
                          Clear end date
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Media
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Thumbnail URL *
                      </label>
                      <input
                        type="url"
                        name="thumbnail"
                        value={formData.thumbnail}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-secondary mb-1">
                        Banner URL (Optional)
                      </label>
                      <input
                        type="url"
                        name="banner"
                        value={formData.banner}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  {formData.thumbnail && (
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Thumbnail Preview</p>
                        <img
                          src={formData.thumbnail}
                          alt="Thumbnail preview"
                          className="w-32 h-20 object-cover rounded-lg border border-white/10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/320x180?text=Invalid+URL';
                          }}
                        />
                      </div>
                      {formData.banner && (
                        <div>
                          <p className="text-xs text-text-secondary mb-1">Banner Preview</p>
                          <img
                            src={formData.banner}
                            alt="Banner preview"
                            className="w-48 h-20 object-cover rounded-lg border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/480x180?text=Invalid+URL';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Teams */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Teams / Participants
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team 1 */}
                    <div className="space-y-3 p-4 bg-background/50 rounded-lg border border-white/5">
                      <h4 className="font-medium text-white">Team 1 / Home</h4>
                      <input
                        type="text"
                        name="team1Name"
                        value={formData.team1Name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Team Name"
                      />
                      <input
                        type="url"
                        name="team1Logo"
                        value={formData.team1Logo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Logo URL"
                      />
                      <input
                        type="text"
                        name="team1Score"
                        value={formData.team1Score}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Score (optional)"
                      />
                    </div>

                    {/* Team 2 */}
                    <div className="space-y-3 p-4 bg-background/50 rounded-lg border border-white/5">
                      <h4 className="font-medium text-white">Team 2 / Away</h4>
                      <input
                        type="text"
                        name="team2Name"
                        value={formData.team2Name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Team Name"
                      />
                      <input
                        type="url"
                        name="team2Logo"
                        value={formData.team2Logo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Logo URL"
                      />
                      <input
                        type="text"
                        name="team2Score"
                        value={formData.team2Score}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                        placeholder="Score (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Streaming */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Streaming Configuration
                  </h3>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1">
                      Stream URL (m3u8) *
                    </label>
                    <input
                      type="url"
                      name="streamUrl"
                      value={formData.streamUrl}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                      placeholder="https://example.com/stream.m3u8"
                    />
                  </div>

                  {/* Proxy Toggle */}
                  <div className="p-4 bg-background/50 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="useProxy"
                        name="useProxy"
                        checked={formData.useProxy}
                        onChange={handleInputChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <label htmlFor="useProxy" className="text-white font-medium">
                        Use Proxy Server
                      </label>
                    </div>
                    <p className="text-xs text-text-secondary mt-2 ml-7">
                      Route stream through proxy to bypass CORS restrictions. Enable this if the stream doesn't play due to cross-origin issues.
                    </p>
                  </div>

                  {/* DRM Toggle */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="drmEnabled"
                      name="drmEnabled"
                      checked={formData.drmEnabled}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="drmEnabled" className="text-white">
                      Enable DRM Protection
                    </label>
                  </div>

                  {/* DRM Config */}
                  {formData.drmEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 p-4 bg-background/50 rounded-lg border border-white/5"
                    >
                      <div>
                        <label className="block text-sm text-text-secondary mb-1">
                          DRM Type
                        </label>
                        <select
                          name="drmType"
                          value={formData.drmType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                        >
                          <option value="clearkey">Clearkey</option>
                          <option value="widevine">Widevine</option>
                          <option value="fairplay">FairPlay</option>
                        </select>
                      </div>

                      {formData.drmType === 'widevine' && (
                        <div>
                          <label className="block text-sm text-text-secondary mb-1">
                            License URL
                          </label>
                          <input
                            type="url"
                            name="drmLicenseUrl"
                            value={formData.drmLicenseUrl}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary"
                            placeholder="https://license.server.com/widevine"
                          />
                        </div>
                      )}

                      {formData.drmType === 'clearkey' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-text-secondary mb-1">
                              Key ID
                            </label>
                            <input
                              type="text"
                              name="clearkeyKeyId"
                              value={formData.clearkeyKeyId}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary font-mono text-sm"
                              placeholder="Enter Key ID"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-text-secondary mb-1">
                              Key
                            </label>
                            <input
                              type="text"
                              name="clearkeyKey"
                              value={formData.clearkeyKey}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary font-mono text-sm"
                              placeholder="Enter Key"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-white">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-white">Featured</span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 bg-background border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && selectedEvent && (
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
              className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl m-4 p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Event</h3>
                <p className="text-text-secondary mb-6">
                  Are you sure you want to delete "{selectedEvent.title}"? This action cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2 bg-background border border-white/10 text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSports;
