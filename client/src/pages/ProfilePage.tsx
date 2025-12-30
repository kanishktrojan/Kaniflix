import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  Shield,
  CreditCard,
  LogOut,
  Trash2,
  Edit,
  Check,
  X,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store';
import { cn } from '@/utils';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, updateUser } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setIsEditing(false);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate('/');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen pt-8">
      <div className="container-padding max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-4xl font-bold">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-surface rounded-full hover:bg-white/10 transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
            <p className="text-text-muted">{user.email}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="default">Premium</Badge>
              <span className="text-sm text-text-muted">
                Member since {new Date(user.createdAt || Date.now()).getFullYear()}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            isLoading={logoutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap',
                activeTab === id
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl p-6"
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Profile Information</h2>
                {!isEditing ? (
                  <Button variant="secondary" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      isLoading={updateProfileMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    Username
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border border-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-background rounded-lg">
                      {user.username}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-2">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-background border border-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className="px-4 py-3 bg-background rounded-lg">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Account Settings</h2>

              {/* Change Password */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Password</h3>
                    <p className="text-sm text-text-muted">
                      Change your password to keep your account secure
                    </p>
                  </div>
                  <Button variant="secondary">
                    <Lock className="w-4 h-4 mr-2" />
                    Change
                  </Button>
                </div>
              </div>

              {/* Two-Factor Auth */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-text-muted">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="secondary">Enable</Button>
                </div>
              </div>

              {/* Delete Account */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-red-500">Delete Account</h3>
                    <p className="text-sm text-text-muted">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="ghost" className="text-red-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Notification Preferences</h2>

              {[
                { label: 'New Releases', description: 'Get notified about new movies and shows' },
                { label: 'Recommendations', description: 'Personalized content suggestions' },
                { label: 'Account Updates', description: 'Important updates about your account' },
                { label: 'Marketing', description: 'Promotions and special offers' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg">
                  <div>
                    <h3 className="font-medium">{item.label}</h3>
                    <p className="text-sm text-text-muted">{item.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Billing & Subscription</h2>

              {/* Current Plan */}
              <div className="p-6 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Badge variant="new">Current Plan</Badge>
                    <h3 className="text-2xl font-bold mt-2">Premium</h3>
                    <p className="text-text-muted">$14.99/month</p>
                  </div>
                  <Button variant="secondary">Change Plan</Button>
                </div>
                <div className="text-sm text-text-muted">
                  Next billing date: January 1, 2025
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-surface rounded flex items-center justify-center">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium">•••• •••• •••• 4242</h3>
                      <p className="text-sm text-text-muted">Expires 12/25</p>
                    </div>
                  </div>
                  <Button variant="ghost">Update</Button>
                </div>
              </div>

              {/* Billing History */}
              <div>
                <h3 className="font-medium mb-4">Billing History</h3>
                <div className="space-y-2">
                  {[
                    { date: 'Dec 1, 2024', amount: '$14.99', status: 'Paid' },
                    { date: 'Nov 1, 2024', amount: '$14.99', status: 'Paid' },
                    { date: 'Oct 1, 2024', amount: '$14.99', status: 'Paid' },
                  ].map((invoice, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-background rounded-lg"
                    >
                      <span className="text-text-muted">{invoice.date}</span>
                      <span className="font-medium">{invoice.amount}</span>
                      <Badge variant="default">{invoice.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
