import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  UserX,
  Shield,
  MailCheck,
  Trash2,
  Edit,
  Eye,
  X,
} from 'lucide-react';
import { useAdminStore } from '@/store';
import {
  DataTable,
  Column,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  Avatar,
  DropdownMenu,
} from '@/components/admin';
import type { AdminUser } from '@/types';
import { cn } from '@/utils';

const AdminUsers: React.FC = () => {
  const {
    users,
    pagination,
    filters,
    selectedUserIds,
    selectedUser,
    isUsersLoading,
    isUserDetailsLoading,
    error,
    fetchUsers,
    fetchUserById,
    updateUser,
    deleteUser,
    bulkUpdateUsers,
    setFilters,
    toggleUserSelection,
    clearSelection,
    clearSelectedUser,
    clearError,
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [editModal, setEditModal] = useState<AdminUser | null>(null);
  const [deleteModal, setDeleteModal] = useState<AdminUser | null>(null);
  const [bulkActionModal, setBulkActionModal] = useState<string | null>(null);

  // Form states for edit modal
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: '' as 'user' | 'premium' | 'admin' | '',
    isActive: true,
    isEmailVerified: false,
  });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== filters.search) {
        fetchUsers({ search: searchQuery, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, filters.search, fetchUsers]);

  const handlePageChange = (page: number) => {
    fetchUsers({ page });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value });
    fetchUsers({ [key]: value, page: 1 });
  };

  const handleViewUser = (user: AdminUser) => {
    fetchUserById(user._id);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    });
    setEditModal(user);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    try {
      const updates: Partial<AdminUser> = {
        username: editForm.username,
        email: editForm.email,
        isActive: editForm.isActive,
        isEmailVerified: editForm.isEmailVerified,
      };
      if (editForm.role) {
        updates.role = editForm.role;
      }
      await updateUser(editModal._id, updates);
      setEditModal(null);
    } catch (err) {
      // Error is handled by store
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;
    try {
      await deleteUser(deleteModal._id);
      setDeleteModal(null);
    } catch (err) {
      // Error is handled by store
    }
  };

  const handleBulkAction = async () => {
    if (!bulkActionModal) return;
    try {
      switch (bulkActionModal) {
        case 'activate':
          await bulkUpdateUsers({ isActive: true });
          break;
        case 'deactivate':
          await bulkUpdateUsers({ isActive: false });
          break;
        case 'makePremium':
          await bulkUpdateUsers({ role: 'premium' });
          break;
        case 'removeFromPremium':
          await bulkUpdateUsers({ role: 'user' });
          break;
      }
      setBulkActionModal(null);
    } catch (err) {
      // Error is handled by store
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar} fallback={user.username} />
          <div>
            <p className="font-medium text-white">{user.username}</p>
            <p className="text-sm text-text-secondary">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (user) => (
        <Badge
          variant={
            user.role === 'admin'
              ? 'danger'
              : user.role === 'premium'
              ? 'warning'
              : 'default'
          }
        >
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <div className="flex items-center gap-2">
          <Badge variant={user.isActive ? 'success' : 'danger'}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {user.isEmailVerified && (
            <MailCheck className="w-4 h-4 text-green-500" />
          )}
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Activity',
      render: (user) => (
        <div className="text-sm text-text-secondary">
          {user.stats?.watchCount || 0} watches • {user.stats?.watchlistCount || 0} in list
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (user) => (
        <span className="text-sm text-text-secondary">
          {new Date(user.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-text-secondary mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        {selectedUserIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">
              {selectedUserIds.length} selected
            </span>
            <Button variant="secondary" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkActionModal('activate')}
            >
              Activate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkActionModal('deactivate')}
            >
              Deactivate
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkActionModal('makePremium')}
            >
              Make Premium
            </Button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-500">{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-400">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 bg-surface-dark rounded-lg border border-white/10 
                     focus:border-primary focus:outline-none text-sm text-white
                     placeholder:text-text-secondary"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
            showFilters
              ? 'border-primary text-primary bg-primary/10'
              : 'border-white/10 text-text-secondary hover:text-white'
          )}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>

        <Select
          options={[
            { value: 'createdAt', label: 'Join Date' },
            { value: 'username', label: 'Username' },
            { value: 'email', label: 'Email' },
          ]}
          value={filters.sortBy || 'createdAt'}
          onChange={(value) => handleFilterChange('sortBy', value)}
          className="min-w-[150px]"
        />
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-4 p-4 bg-surface-dark rounded-lg border border-white/5">
              <Select
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'user', label: 'User' },
                  { value: 'premium', label: 'Premium' },
                  { value: 'admin', label: 'Admin' },
                ]}
                value={filters.role || ''}
                onChange={(value) => handleFilterChange('role', value)}
                placeholder="Role"
              />
              <Select
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={filters.status || ''}
                onChange={(value) => handleFilterChange('status', value)}
                placeholder="Status"
              />
              <Select
                options={[
                  { value: 'desc', label: 'Newest First' },
                  { value: 'asc', label: 'Oldest First' },
                ]}
                value={filters.sortOrder || 'desc'}
                onChange={(value) => handleFilterChange('sortOrder', value)}
                placeholder="Sort Order"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(user) => user._id}
        onRowClick={handleViewUser}
        selectable
        selectedIds={selectedUserIds}
        onSelectionChange={(ids) => {
          clearSelection();
          ids.forEach(toggleUserSelection);
        }}
        pagination={
          pagination
            ? {
                page: pagination.page,
                totalPages: pagination.totalPages,
                onPageChange: handlePageChange,
              }
            : undefined
        }
        isLoading={isUsersLoading}
        emptyMessage="No users found"
        actions={(user) => (
          <DropdownMenu
            items={[
              {
                label: 'View Details',
                icon: <Eye className="w-4 h-4" />,
                onClick: () => handleViewUser(user),
              },
              {
                label: 'Edit User',
                icon: <Edit className="w-4 h-4" />,
                onClick: () => handleEditUser(user),
              },
              {
                label: user.isActive ? 'Deactivate' : 'Activate',
                icon: user.isActive ? <UserX className="w-4 h-4" /> : <Shield className="w-4 h-4" />,
                onClick: () => updateUser(user._id, { isActive: !user.isActive }),
              },
              {
                label: 'Delete User',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setDeleteModal(user),
                variant: 'danger',
              },
            ]}
          />
        )}
      />

      {/* User Details Sidebar */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={clearSelectedUser}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-dark border-l 
                       border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">User Details</h2>
                  <button
                    onClick={clearSelectedUser}
                    className="p-2 hover:bg-white/10 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isUserDetailsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={selectedUser.user.avatar}
                        fallback={selectedUser.user.username}
                        size="lg"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {selectedUser.user.username}
                        </h3>
                        <p className="text-text-secondary">{selectedUser.user.email}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-background rounded-lg p-4">
                        <p className="text-2xl font-bold text-white">
                          {selectedUser.stats.totalWatched}
                        </p>
                        <p className="text-sm text-text-secondary">Total Watched</p>
                      </div>
                      <div className="bg-background rounded-lg p-4">
                        <p className="text-2xl font-bold text-white">
                          {selectedUser.stats.completedWatches}
                        </p>
                        <p className="text-sm text-text-secondary">Completed</p>
                      </div>
                      <div className="bg-background rounded-lg p-4">
                        <p className="text-2xl font-bold text-white">
                          {selectedUser.stats.watchlistSize}
                        </p>
                        <p className="text-sm text-text-secondary">Watchlist</p>
                      </div>
                      <div className="bg-background rounded-lg p-4">
                        <p className="text-2xl font-bold text-white">
                          {Math.round(selectedUser.stats.totalWatchTime / 60)}h
                        </p>
                        <p className="text-sm text-text-secondary">Watch Time</p>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-text-secondary uppercase">
                        Account Info
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Role</span>
                          <Badge
                            variant={
                              selectedUser.user.role === 'admin'
                                ? 'danger'
                                : selectedUser.user.role === 'premium'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {selectedUser.user.role}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Status</span>
                          <Badge variant={selectedUser.user.isActive ? 'success' : 'danger'}>
                            {selectedUser.user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Email Verified</span>
                          <Badge variant={selectedUser.user.isEmailVerified ? 'success' : 'warning'}>
                            {selectedUser.user.isEmailVerified ? 'Verified' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Joined</span>
                          <span className="text-white">
                            {new Date(selectedUser.user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Watch History */}
                    {selectedUser.watchHistory.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-text-secondary uppercase">
                          Recent Activity
                        </h4>
                        <div className="space-y-2">
                          {selectedUser.watchHistory.slice(0, 5).map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center gap-3 p-2 bg-background rounded-lg"
                            >
                              <div className="w-12 h-8 bg-white/10 rounded overflow-hidden">
                                {item.posterPath && (
                                  <img
                                    src={`https://image.tmdb.org/t/p/w92${item.posterPath}`}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{item.title}</p>
                                <p className="text-xs text-text-secondary">
                                  {Math.round(item.progress)}% watched
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleEditUser(selectedUser.user)}
                      >
                        Edit User
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={() => setDeleteModal(selectedUser.user)}
                      >
                        Delete User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit User"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Username"
            value={editForm.username}
            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Role
            </label>
            <Select
              options={[
                { value: 'user', label: 'User' },
                { value: 'premium', label: 'Premium' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={editForm.role}
              onChange={(value) => setEditForm({ ...editForm, role: value as 'user' | 'premium' | 'admin' })}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-white/20"
              />
              <span className="text-sm text-white">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isEmailVerified}
                onChange={(e) => setEditForm({ ...editForm, isEmailVerified: e.target.checked })}
                className="w-4 h-4 rounded border-white/20"
              />
              <span className="text-sm text-white">Email Verified</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setEditModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete User"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to delete <span className="text-white font-medium">{deleteModal?.username}</span>?
            This will also delete all their watch history and watchlist.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDeleteUser}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Action Confirmation Modal */}
      <Modal
        isOpen={!!bulkActionModal}
        onClose={() => setBulkActionModal(null)}
        title="Confirm Bulk Action"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Are you sure you want to {bulkActionModal?.replace(/([A-Z])/g, ' $1').toLowerCase()}{' '}
            {selectedUserIds.length} users?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setBulkActionModal(null)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleBulkAction}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
