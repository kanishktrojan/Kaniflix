import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Eye,
  PlayCircle,
  TrendingUp,
  Film,
  Tv,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAdminStore } from '@/store';
import {
  StatCard,
  ChartCard,
  SimpleBarChart,
  SimpleLineChart,
  DonutChart,
} from '@/components/admin';

const AdminDashboard: React.FC = () => {
  const { dashboardStats, isDashboardLoading, fetchDashboardStats } = useAdminStore();

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (isDashboardLoading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="text-center text-text-secondary py-12">
        Failed to load dashboard data
      </div>
    );
  }

  const { users, content, charts } = dashboardStats;

  // Prepare chart data
  const userGrowthData = charts.userGrowth.map((item) => ({
    label: `${item._id.month}/${item._id.year}`,
    value: item.count,
  }));

  const topContentData = charts.topContent.slice(0, 5).map((item) => ({
    label: item.title.length > 20 ? item.title.slice(0, 20) + '...' : item.title,
    value: item.totalWatches,
  }));

  const mediaDistributionData = charts.mediaDistribution.map((item) => ({
    label: item._id === 'movie' ? 'Movies' : 'TV Shows',
    value: item.count,
    color: item._id === 'movie' ? '#e50914' : '#0284c7',
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Welcome back! Here's what's happening with Kaniflix.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={users.total}
          icon={Users}
          trend={{
            value: Math.round((users.newThisMonth / Math.max(users.total - users.newThisMonth, 1)) * 100),
            isPositive: true,
          }}
        />
        <StatCard
          title="Active Users"
          value={users.active}
          icon={TrendingUp}
          description={`${((users.active / users.total) * 100).toFixed(1)}% of total`}
        />
        <StatCard
          title="Premium Users"
          value={users.premium}
          icon={CheckCircle}
          description={`${((users.premium / users.total) * 100).toFixed(1)}% of total`}
        />
        <StatCard
          title="New This Month"
          value={users.newThisMonth}
          icon={Users}
          trend={{ value: users.newThisMonth > 10 ? 15 : 5, isPositive: users.newThisMonth > 0 }}
        />
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Watches"
          value={content.totalWatched}
          icon={Eye}
        />
        <StatCard
          title="Completed"
          value={content.completedWatches}
          icon={CheckCircle}
        />
        <StatCard
          title="Watchlist Items"
          value={content.totalWatchlistItems}
          icon={Clock}
        />
        <StatCard
          title="Recent Activity (7d)"
          value={content.recentActivity}
          icon={PlayCircle}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <ChartCard title="User Growth">
          {userGrowthData.length > 0 ? (
            <SimpleLineChart data={userGrowthData} height={250} />
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Media Distribution */}
        <ChartCard title="Content Distribution">
          {mediaDistributionData.length > 0 ? (
            <div className="flex items-center justify-center py-4">
              <DonutChart data={mediaDistributionData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              No data available
            </div>
          )}
        </ChartCard>

        {/* Top Content */}
        <ChartCard title="Top Content" className="lg:col-span-2">
          {topContentData.length > 0 ? (
            <SimpleBarChart data={topContentData} />
          ) : (
            <div className="h-32 flex items-center justify-center text-text-secondary">
              No content data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-dark rounded-xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white">Movies</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {charts.mediaDistribution.find((m) => m._id === 'movie')?.count || 0} total watches
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-dark rounded-xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Tv className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">TV Shows</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {charts.mediaDistribution.find((m) => m._id === 'tv')?.count || 0} total watches
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-dark rounded-xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">Verified Users</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {users.verified} users verified ({((users.verified / users.total) * 100).toFixed(1)}%)
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
