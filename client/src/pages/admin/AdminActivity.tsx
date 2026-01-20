import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, User, Play, Clock } from 'lucide-react';
import { useAdminStore } from '@/store';
import { Avatar, Badge } from '@/components/admin';

const AdminActivity: React.FC = () => {
  const { activity, isActivityLoading, fetchRecentActivity } = useAdminStore();

  useEffect(() => {
    fetchRecentActivity(50);
  }, [fetchRecentActivity]);

  if (isActivityLoading && !activity) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Activity</h1>
        <p className="text-text-secondary mt-1">
          Recent platform activity and user actions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Watch Activity */}
        <div className="lg:col-span-2 bg-surface-dark rounded-xl border border-white/5">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-white">Recent Watches</h2>
            </div>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {activity?.recentWatches.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                No recent watch activity
              </div>
            ) : (
              activity?.recentWatches.map((watch, index) => (
                <motion.div
                  key={watch._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Poster */}
                    <div className="w-16 h-24 bg-background rounded overflow-hidden flex-shrink-0">
                      {watch.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${watch.posterPath}`}
                          alt={watch.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-text-secondary" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-white truncate">
                            {watch.title}
                          </h3>
                          {watch.episodeTitle && (
                            <p className="text-sm text-text-secondary">
                              S{watch.seasonNumber} E{watch.episodeNumber}: {watch.episodeTitle}
                            </p>
                          )}
                        </div>
                        <Badge variant={watch.mediaType === 'movie' ? 'danger' : 'info'} size="sm">
                          {watch.mediaType}
                        </Badge>
                      </div>

                      {/* User Info */}
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar
                          src={watch.user?.avatar}
                          fallback={watch.user?.username || '?'}
                          size="sm"
                        />
                        <span className="text-sm text-white">
                          {watch.user?.username || 'Unknown User'}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-text-secondary">Progress</span>
                          <span className="text-white">{Math.round(watch.progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${watch.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(watch.updatedAt)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Registrations */}
        <div className="bg-surface-dark rounded-xl border border-white/5">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-white">New Users</h2>
            </div>
          </div>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {activity?.recentRegistrations.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                No recent registrations
              </div>
            ) : (
              activity?.recentRegistrations.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={user.avatar}
                      fallback={user.username}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {user.username}
                      </p>
                      <p className="text-sm text-text-secondary truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />
                    Joined {formatTimeAgo(user.createdAt)}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminActivity;
