import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Eye,
  Clock,
  Calendar,
} from 'lucide-react';
import { useAdminStore } from '@/store';
import {
  StatCard,
  ChartCard,
  SimpleLineChart,
  SimpleBarChart,
  Select,
} from '@/components/admin';

const AdminAnalytics: React.FC = () => {
  const { analytics, isAnalyticsLoading, fetchAnalytics } = useAdminStore();
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchAnalytics(period);
  }, [fetchAnalytics, period]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  if (isAnalyticsLoading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Prepare chart data
  const dailyActiveData = analytics?.dailyActiveUsers.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.activeUsers,
  })) || [];

  const registrationsData = analytics?.registrations.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.registrations,
  })) || [];

  const watchByHourData = analytics?.watchByHour.map((item) => ({
    label: `${item._id}:00`,
    value: item.count,
  })) || [];

  const totalActiveUsers = dailyActiveData.reduce((sum, d) => sum + d.value, 0);
  const avgActiveUsers = dailyActiveData.length > 0 
    ? Math.round(totalActiveUsers / dailyActiveData.length) 
    : 0;
  const totalRegistrations = registrationsData.reduce((sum, d) => sum + d.value, 0);
  const peakHour = watchByHourData.length > 0
    ? watchByHourData.reduce((max, d) => d.value > max.value ? d : max, watchByHourData[0])
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-text-secondary mt-1">
            Track user engagement and platform activity
          </p>
        </div>
        <Select
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
            { value: '1y', label: 'Last year' },
          ]}
          value={period}
          onChange={handlePeriodChange}
          className="min-w-[150px]"
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg. Daily Active Users"
          value={avgActiveUsers}
          icon={Users}
        />
        <StatCard
          title="Total Active Sessions"
          value={totalActiveUsers}
          icon={Eye}
        />
        <StatCard
          title="New Registrations"
          value={totalRegistrations}
          icon={TrendingUp}
        />
        <StatCard
          title="Peak Activity Hour"
          value={peakHour ? `${peakHour.label}` : 'N/A'}
          icon={Clock}
          description={peakHour ? `${peakHour.value} sessions` : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users */}
        <ChartCard title="Daily Active Users" className="lg:col-span-2">
          {dailyActiveData.length > 0 ? (
            <SimpleLineChart data={dailyActiveData} height={300} />
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              No activity data for this period
            </div>
          )}
        </ChartCard>

        {/* New Registrations */}
        <ChartCard title="New Registrations">
          {registrationsData.length > 0 ? (
            <SimpleLineChart 
              data={registrationsData} 
              height={250} 
              lineColor="#22c55e"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              No registration data for this period
            </div>
          )}
        </ChartCard>

        {/* Watch Activity by Hour */}
        <ChartCard title="Activity by Hour">
          {watchByHourData.length > 0 ? (
            <SimpleBarChart 
              data={watchByHourData.slice(0, 12)} 
              barColor="bg-blue-500"
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              No hourly data available
            </div>
          )}
        </ChartCard>
      </div>

      {/* Genre/Media Type Stats */}
      {analytics?.genrePopularity && analytics.genrePopularity.length > 0 && (
        <ChartCard title="Content Type Performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.genrePopularity.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-background rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white capitalize">
                    {item._id === 'movie' ? 'Movies' : 'TV Shows'}
                  </h4>
                  <span className="text-2xl font-bold text-primary">
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Total Views</span>
                    <span className="text-white">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Avg. Completion</span>
                    <span className="text-white">{Math.round(item.avgProgress || 0)}%</span>
                  </div>
                </div>
                <div className="mt-4 h-2 bg-surface-dark rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.avgProgress || 0}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      item._id === 'movie' ? 'bg-primary' : 'bg-blue-500'
                    }`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-dark rounded-xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-semibold text-white">Growth Trend</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {totalRegistrations > 0
              ? `${totalRegistrations} new users joined in the selected period.`
              : 'No new registrations in this period.'}
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
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-white">Engagement</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {avgActiveUsers > 0
              ? `Average of ${avgActiveUsers} active users per day.`
              : 'No engagement data available.'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-dark rounded-xl p-6 border border-white/5"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="font-semibold text-white">Peak Time</h3>
          </div>
          <p className="text-text-secondary text-sm">
            {peakHour
              ? `Most activity occurs at ${peakHour.label} with ${peakHour.value} sessions.`
              : 'Not enough data to determine peak hours.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
