import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  Play,
  Monitor,
  Smartphone,
  Tablet,
  Tv,
  Globe,
  Volume2,
  Subtitles,
  Gift,
  Clock,
  Film,
  TrendingUp,
  Calendar,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Camera,
  Wifi,
  Tag,
  Sparkles,
  PartyPopper,
  Ticket,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { profileService, paymentService } from '@/services';
import { useAuthStore } from '@/store';
import { cn } from '@/utils';
import type {
  ExtendedUserPreferences,
  DeviceSession,
  SubscriptionPlan,
} from '@/types';

// Language options
const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
];

// Video quality options
const videoQualities = [
  { value: 'auto', label: 'Auto', description: 'Best quality for your connection' },
  { value: '4k', label: '4K Ultra HD', description: 'Best quality (requires Premium)' },
  { value: '1080p', label: '1080p Full HD', description: 'Great for large screens' },
  { value: '720p', label: '720p HD', description: 'Good quality, less data' },
  { value: '480p', label: '480p SD', description: 'Standard definition' },
  { value: '360p', label: '360p', description: 'Data saver mode' },
];

// Maturity ratings
const maturityRatings = [
  { value: 'G', label: 'G - General Audiences', description: 'All ages' },
  { value: 'PG', label: 'PG - Parental Guidance', description: 'Some material may not be suitable for children' },
  { value: 'PG-13', label: 'PG-13', description: 'Some material may be inappropriate for children under 13' },
  { value: 'R', label: 'R - Restricted', description: 'Under 17 requires accompanying parent' },
  { value: 'NC-17', label: 'NC-17 - Adults Only', description: 'No one 17 and under admitted' },
];

// Device icon mapping
const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    case 'tv':
      return Tv;
    default:
      return Monitor;
  }
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout, isAuthenticated, updateUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const [checkoutCoupon, setCheckoutCoupon] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [couponValidation, setCouponValidation] = useState<{
    valid: boolean;
    discountAmount: number;
    finalPrice: number;
    error?: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    planName: string;
    features: Array<{ name: string; included?: boolean; value?: string | null; _id?: string }> | string[];
    expiresAt: string;
  } | null>(null);

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Profile edit form
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch profile data
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
    enabled: isAuthenticated,
  });

  // Fetch devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: profileService.getDevices,
    enabled: isAuthenticated && activeTab === 'devices',
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['profile-stats'],
    queryFn: profileService.getStats,
    enabled: isAuthenticated,
  });

  // Fetch subscription
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: profileService.getSubscription,
    enabled: isAuthenticated && activeTab === 'subscription',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: { username?: string; profile?: { bio?: string } }) =>
      profileService.updateProfile(updates),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: profileService.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: profileService.updateNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  // Logout device mutation
  const logoutDeviceMutation = useMutation({
    mutationFn: profileService.logoutDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Logout all devices mutation
  const logoutAllDevicesMutation = useMutation({
    mutationFn: profileService.logoutAllDevices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });



  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: profileService.deleteAccount,
    onSuccess: async () => {
      await logout();
      navigate('/');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate('/');
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      username: formData.username,
      profile: { bio: formData.bio },
    });
  };

  const handlePreferenceChange = (key: keyof ExtendedUserPreferences, value: unknown) => {
    const currentPrefs = profileData?.user?.preferences || {};
    updatePreferencesMutation.mutate({ ...currentPrefs, [key]: value });
  };

  const handleNotificationChange = (
    category: 'email' | 'push',
    key: string,
    value: boolean
  ) => {
    const currentNotifs = profileData?.user?.notifications || {
      email: { newReleases: true, recommendations: true, accountUpdates: true, marketing: false, watchlistReminders: true },
      push: { enabled: true, newEpisodes: true, continueWatching: true },
    };
    updateNotificationsMutation.mutate({
      ...currentNotifs,
      [category]: {
        ...(currentNotifs[category] as Record<string, boolean>),
        [key]: value,
      },
    } as Parameters<typeof updateNotificationsMutation.mutate>[0]);
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  // Currency helper
  const getCurrencySymbol = (currency?: string) => {
    switch (currency) {
      case 'INR': return '₹';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '$';
    }
  };

  // Checkout handlers
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowCheckoutModal(true);
    setCheckoutCoupon('');
    setCouponValidation(null);
    setBillingCycle('monthly');
  };

  const handleValidateCoupon = async () => {
    if (!checkoutCoupon || !selectedPlan) return;

    try {
      const result = await paymentService.validateCoupon(
        checkoutCoupon,
        selectedPlan._id,
        billingCycle
      );
      setCouponValidation({
        valid: true,
        discountAmount: result.discount.discountAmount,
        finalPrice: result.discount.finalPrice,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid coupon code';
      setCouponValidation({
        valid: false,
        discountAmount: 0,
        finalPrice: selectedPlan.price[billingCycle],
        error: errorMessage,
      });
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    setIsProcessingPayment(true);
    // Close the checkout modal immediately - Razorpay will open its own fullscreen modal
    setShowCheckoutModal(false);

    try {
      await paymentService.checkout(
        selectedPlan._id,
        billingCycle,
        couponValidation?.valid ? checkoutCoupon : undefined,
        {
          name: user?.username,
          email: user?.email,
        },
        (newSubscription) => {
          // Success - show celebration modal!
          setIsProcessingPayment(false);
          setSelectedPlan(null);
          setCouponValidation(null);
          setCheckoutCoupon('');

          // Use the celebration modal for successful payment
          setCelebrationData({
            planName: newSubscription?.plan?.displayName || selectedPlan.displayName || 'Premium',
            features: newSubscription?.plan?.features || selectedPlan.features || [],
            expiresAt: newSubscription?.currentPeriodEnd || '',
          });
          setShowCelebration(true);

          // Refresh subscription data
          queryClient.invalidateQueries({ queryKey: ['subscription'] });
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        (error) => {
          // Error - reset state and show error in checkout modal
          setIsProcessingPayment(false);
          setShowCheckoutModal(true); // Re-open checkout modal
          setCouponValidation({
            valid: false,
            discountAmount: 0,
            finalPrice: selectedPlan.price[billingCycle],
            error: error.message || 'Payment failed. Please try again.',
          });
        },
        () => {
          // Dismissed by user - just reset and show checkout modal again
          setIsProcessingPayment(false);
          setShowCheckoutModal(true); // Re-open checkout modal so user can retry
        }
      );
    } catch (error: any) {
      // Catch any uncaught errors
      console.error('Checkout failed:', error);
      setIsProcessingPayment(false);
      setShowCheckoutModal(true); // Re-open checkout modal
      setCouponValidation({
        valid: false,
        discountAmount: 0,
        finalPrice: selectedPlan.price[billingCycle],
        error: error.message || 'Payment failed. Please try again.',
      });
    }
  };

  // Handle redeem code
  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) {
      setRedeemError('Please enter a redemption code');
      return;
    }

    setIsRedeeming(true);
    setRedeemError('');

    try {
      const result = await paymentService.redeemCode(redeemCode.trim());

      if (result.requiresPayment) {
        // Code gives discount but not 100% - show message
        setRedeemError(`This code gives you ${result.discountValue}% off. Please select a plan above to apply it during checkout.`);
        setIsRedeeming(false);
        return;
      }

      // Success! Show celebration
      setCelebrationData({
        planName: result.subscription?.plan?.name || result.plan?.name || 'Premium',
        features: result.subscription?.features || [],
        expiresAt: result.subscription?.currentPeriodEnd || '',
      });
      setShowCelebration(true);
      setShowCouponModal(false); // Close the redeem modal
      setRedeemCode('');

      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

    } catch (error: any) {
      setRedeemError(error.response?.data?.message || error.message || 'Invalid or expired code');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Create confetti particles
  const createConfetti = useCallback(() => {
    const colors = ['#E50914', '#FFD700', '#00FF00', '#00BFFF', '#FF69B4', '#FFA500'];
    const particles: React.ReactNode[] = [];

    for (let i = 0; i < 100; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const animationDelay = Math.random() * 0.5;
      const size = Math.random() * 10 + 5;

      particles.push(
        <motion.div
          key={i}
          initial={{
            opacity: 1,
            y: -20,
            x: 0,
            rotate: 0,
            scale: 1
          }}
          animate={{
            opacity: 0,
            y: window.innerHeight + 100,
            x: (Math.random() - 0.5) * 200,
            rotate: Math.random() * 720 - 360,
            scale: Math.random() * 0.5 + 0.5
          }}
          transition={{
            duration: Math.random() * 2 + 2,
            delay: animationDelay,
            ease: 'easeOut'
          }}
          style={{
            position: 'absolute',
            left: `${left}%`,
            top: 0,
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      );
    }
    return particles;
  }, []);

  const getCheckoutPrice = () => {
    if (!selectedPlan) return 0;
    if (couponValidation?.valid) return couponValidation.finalPrice;
    return selectedPlan.price[billingCycle];
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'playback', label: 'Playback', icon: Play },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'devices', label: 'Devices', icon: Monitor },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (!user) return null;

  const subscription = profileData?.subscription || subscriptionData?.current;
  const preferences = profileData?.user?.preferences;
  const notifications = profileData?.user?.notifications;

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-8">
      <div className="container-padding max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-red-700 flex items-center justify-center text-4xl font-bold overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
            <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">{user.username}</h1>
            <p className="text-text-muted mb-3">{user.email}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={subscription ? 'new' : 'default'}>
                {subscription?.plan?.displayName || 'Free Plan'}
              </Badge>
              {subscription?.status === 'trial' && (
                <Badge variant="secondary">Trial</Badge>
              )}
              <span className="text-sm text-text-muted">
                Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowCouponModal(true)}
            >
              <Gift className="w-4 h-4 mr-2" />
              Redeem Code
            </Button>
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              isLoading={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Film className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-bold">{stats.totalWatched}</span>
              </div>
              <p className="text-sm text-text-muted">Titles Watched</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-green-500" />
                </div>
                <span className="text-2xl font-bold">{stats.totalWatchTimeFormatted}</span>
              </div>
              <p className="text-sm text-text-muted">Watch Time</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              </div>
              <p className="text-sm text-text-muted">In Progress</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-2xl font-bold">{stats.watchlistSize}</span>
              </div>
              <p className="text-sm text-text-muted">In Watchlist</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap',
                activeTab === id
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-surface text-text-secondary hover:text-white hover:bg-surface-hover'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Profile Information */}
                <div className="bg-surface rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Profile Information</h2>
                    {!isEditing ? (
                      <Button variant="secondary" size="sm" onClick={() => {
                        setFormData({
                          username: user.username,
                          bio: profileData?.user?.profile?.bio || '',
                        });
                        setIsEditing(true);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={handleSaveProfile} isLoading={updateProfileMutation.isPending}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Username</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <p className="px-4 py-3 bg-background rounded-lg">{user.username}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">Email</label>
                      <p className="px-4 py-3 bg-background rounded-lg flex items-center justify-between">
                        {user.email}
                        {user.isEmailVerified && (
                          <Badge variant="default" className="bg-green-500/20 text-green-400">Verified</Badge>
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-text-muted mb-2">Bio</label>
                      {isEditing ? (
                        <textarea
                          value={formData.bio}
                          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                          placeholder="Tell us about yourself..."
                          maxLength={200}
                          rows={3}
                          className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      ) : (
                        <p className="px-4 py-3 bg-background rounded-lg text-text-muted">
                          {profileData?.user?.profile?.bio || 'No bio yet'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Settings */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Quick Settings</h2>

                  <div className="space-y-4">
                    {/* Language */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-text-muted" />
                        <div>
                          <p className="font-medium">Display Language</p>
                          <p className="text-sm text-text-muted">
                            {languages.find(l => l.code === preferences?.language)?.name || 'English'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>

                    {/* Video Quality */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <Play className="w-5 h-5 text-text-muted" />
                        <div>
                          <p className="font-medium">Video Quality</p>
                          <p className="text-sm text-text-muted">
                            {videoQualities.find(q => q.value === preferences?.defaultVideoQuality)?.label || 'Auto'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>

                    {/* Data Saver */}
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wifi className="w-5 h-5 text-text-muted" />
                        <div>
                          <p className="font-medium">Data Saver</p>
                          <p className="text-sm text-text-muted">
                            {preferences?.dataSaverMode ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences?.dataSaverMode || false}
                          onChange={(e) => handlePreferenceChange('dataSaverMode', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Playback Tab */}
            {activeTab === 'playback' && (
              <div className="space-y-6">
                {/* Video Settings */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Video Settings
                  </h2>

                  <div className="space-y-6">
                    {/* Video Quality */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Default Video Quality</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {videoQualities.map((quality) => (
                          <button
                            key={quality.value}
                            onClick={() => handlePreferenceChange('defaultVideoQuality', quality.value)}
                            className={cn(
                              'p-4 rounded-lg border-2 transition-all text-left',
                              preferences?.defaultVideoQuality === quality.value
                                ? 'border-primary bg-primary/10'
                                : 'border-white/10 hover:border-white/30'
                            )}
                          >
                            <p className="font-medium">{quality.label}</p>
                            <p className="text-xs text-text-muted mt-1">{quality.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Autoplay Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">Autoplay Next Episode</p>
                          <p className="text-sm text-text-muted">Automatically play the next episode in a series</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.autoplayNext ?? true}
                            onChange={(e) => handlePreferenceChange('autoplayNext', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">Autoplay Previews</p>
                          <p className="text-sm text-text-muted">Play previews while browsing on all devices</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.autoplayPreviews ?? true}
                            onChange={(e) => handlePreferenceChange('autoplayPreviews', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">Data Saver Mode</p>
                          <p className="text-sm text-text-muted">Reduce data usage when streaming</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences?.dataSaverMode ?? false}
                            onChange={(e) => handlePreferenceChange('dataSaverMode', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio & Subtitles */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-primary" />
                    Audio & Subtitles
                  </h2>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Audio Language</label>
                      <select
                        value={preferences?.defaultAudioLanguage || 'en'}
                        onChange={(e) => handlePreferenceChange('defaultAudioLanguage', e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Subtitle Language</label>
                      <select
                        value={preferences?.defaultSubtitleLanguage || 'off'}
                        onChange={(e) => handlePreferenceChange('defaultSubtitleLanguage', e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="off">Off</option>
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between p-4 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <Subtitles className="w-5 h-5 text-text-muted" />
                      <div>
                        <p className="font-medium">Always Show Subtitles</p>
                        <p className="text-sm text-text-muted">Display subtitles by default</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences?.subtitlesEnabled ?? false}
                        onChange={(e) => handlePreferenceChange('subtitlesEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </div>
                </div>

                {/* Content Restrictions */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Content Restrictions
                  </h2>

                  <div>
                    <label className="block text-sm font-medium mb-3">Maturity Rating</label>
                    <div className="space-y-2">
                      {maturityRatings.map((rating) => (
                        <button
                          key={rating.value}
                          onClick={() => handlePreferenceChange('maturityRating', rating.value)}
                          className={cn(
                            'w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between',
                            preferences?.maturityRating === rating.value
                              ? 'border-primary bg-primary/10'
                              : 'border-white/10 hover:border-white/30'
                          )}
                        >
                          <div>
                            <p className="font-medium">{rating.label}</p>
                            <p className="text-sm text-text-muted">{rating.description}</p>
                          </div>
                          {preferences?.maturityRating === rating.value && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <div className="space-y-6">
                {subscriptionLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Current Plan */}
                    <div className={cn(
                      'rounded-xl p-6 border-2',
                      subscription ? 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30' : 'bg-surface border-white/10'
                    )}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                          <Badge variant="new" className="mb-2">Current Plan</Badge>
                          <h3 className="text-3xl font-bold">{subscription?.plan?.displayName || 'Free Plan'}</h3>
                          {subscription && (
                            <p className="text-text-muted mt-1">
                              {getCurrencySymbol(subscription.plan?.price?.currency)}{subscription.billingCycle === 'monthly'
                                ? subscription.plan?.price?.monthly
                                : subscription.plan?.price?.yearly}/{subscription.billingCycle === 'monthly' ? 'month' : 'year'}
                            </p>
                          )}
                        </div>
                        {subscription && (
                          <div className="text-right">
                            <p className="text-sm text-text-muted">
                              {subscription.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}
                            </p>
                            <p className="font-medium">
                              {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      {subscription?.appliedCoupon && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-green-500" />
                            <span className="text-green-400 font-medium">
                              Coupon Applied: {subscription.appliedCoupon.code}
                            </span>
                            <span className="text-text-muted">
                              (-${subscription.appliedCoupon.discountAmount.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Plan Features */}
                      {subscription?.plan?.features && (
                        <div className="grid grid-cols-2 gap-3">
                          {subscription.plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className={cn(
                                'w-4 h-4',
                                feature.included ? 'text-green-500' : 'text-text-muted'
                              )} />
                              <span className={cn(
                                'text-sm',
                                !feature.included && 'text-text-muted line-through'
                              )}>
                                {feature.name}
                                {feature.value && `: ${feature.value}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Available Plans */}
                    {subscriptionData?.availablePlans && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Available Plans</h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          {subscriptionData.availablePlans.map((plan: SubscriptionPlan) => (
                            <div
                              key={plan._id}
                              className={cn(
                                'relative rounded-xl p-6 border-2 transition-all',
                                subscription?.plan?._id === plan._id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-white/10 hover:border-white/30'
                              )}
                            >
                              {plan.isPopular && (
                                <Badge variant="new" className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  Most Popular
                                </Badge>
                              )}
                              <h4 className="text-xl font-bold mb-2">{plan.displayName}</h4>
                              <p className="text-3xl font-bold mb-1">
                                {getCurrencySymbol(plan.price.currency)}{plan.price.monthly}
                                <span className="text-sm font-normal text-text-muted">/mo</span>
                              </p>
                              <p className="text-sm text-text-muted mb-4">{plan.description}</p>

                              <div className="space-y-2 mb-6">
                                {plan.features?.slice(0, 4).map((feature, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <Check className={cn(
                                      'w-4 h-4',
                                      feature.included ? 'text-green-500' : 'text-text-muted'
                                    )} />
                                    <span className={!feature.included ? 'text-text-muted' : ''}>
                                      {feature.name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <Button
                                variant={subscription?.plan?._id === plan._id ? 'secondary' : 'primary'}
                                className="w-full"
                                disabled={subscription?.plan?._id === plan._id}
                                onClick={() => handleSelectPlan(plan)}
                              >
                                {subscription?.plan?._id === plan._id ? 'Current Plan' : 'Upgrade'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Method */}
                    {subscription?.paymentMethod?.type !== 'none' && (
                      <div className="bg-surface rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
                        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-surface rounded flex items-center justify-center">
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {subscription?.paymentMethod?.brand?.toUpperCase()} •••• {subscription?.paymentMethod?.last4}
                              </p>
                              <p className="text-sm text-text-muted">
                                Expires {subscription?.paymentMethod?.expiryMonth}/{subscription?.paymentMethod?.expiryYear}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">Update</Button>
                        </div>
                      </div>
                    )}

                    {/* Billing History */}
                    {subscription?.invoices && subscription.invoices.length > 0 && (
                      <div className="bg-surface rounded-xl p-6">
                        <h3 className="text-xl font-semibold mb-4">Billing History</h3>
                        <div className="space-y-2">
                          {subscription.invoices.map((invoice) => (
                            <div
                              key={invoice.invoiceId}
                              className="flex items-center justify-between p-3 bg-background rounded-lg"
                            >
                              <span className="text-text-muted">
                                {new Date(invoice.paidAt).toLocaleDateString()}
                              </span>
                              <span className="font-medium">${invoice.amount.toFixed(2)}</span>
                              <Badge variant={invoice.status === 'paid' ? 'success' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Redeem Code Section */}
                    <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-yellow-500/20 rounded-lg">
                          <Ticket className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">Have a Promo Code?</h3>
                          <p className="text-sm text-text-muted">
                            Redeem your code for free premium access
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={redeemCode}
                            onChange={(e) => {
                              setRedeemCode(e.target.value.toUpperCase());
                              setRedeemError('');
                            }}
                            placeholder="Enter your code (e.g., KANIFLIX2024)"
                            className={cn(
                              'w-full px-4 py-3 bg-background border rounded-lg text-white placeholder-text-muted',
                              'focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500',
                              'transition-all uppercase tracking-wider font-mono',
                              redeemError ? 'border-red-500' : 'border-white/20'
                            )}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isRedeeming) {
                                handleRedeemCode();
                              }
                            }}
                          />
                          {redeemCode && (
                            <button
                              onClick={() => {
                                setRedeemCode('');
                                setRedeemError('');
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          onClick={handleRedeemCode}
                          disabled={!redeemCode.trim() || isRedeeming}
                          isLoading={isRedeeming}
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold px-6"
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Redeem
                        </Button>
                      </div>

                      {redeemError && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 text-sm text-red-400 flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          {redeemError}
                        </motion.p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div className="space-y-6">
                <div className="bg-surface rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Active Devices</h2>
                      <p className="text-sm text-text-muted mt-1">
                        Manage devices that are signed into your account
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => logoutAllDevicesMutation.mutate()}
                      isLoading={logoutAllDevicesMutation.isPending}
                    >
                      Sign Out All Devices
                    </Button>
                  </div>

                  {devicesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : devices && devices.length > 0 ? (
                    <div className="space-y-3">
                      {devices.map((device: DeviceSession) => {
                        const DeviceIcon = getDeviceIcon(device.deviceType);
                        return (
                          <div
                            key={device._id}
                            className={cn(
                              'flex items-center justify-between p-4 rounded-lg',
                              device.isCurrentDevice ? 'bg-primary/10 border border-primary/30' : 'bg-background'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-surface rounded-lg">
                                <DeviceIcon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{device.deviceName}</p>
                                  {device.isCurrentDevice && (
                                    <Badge variant="new" className="text-xs">This Device</Badge>
                                  )}
                                  {device.isStreaming && (
                                    <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-400">
                                      Streaming
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-text-muted">
                                  {device.browser.name} • {device.os.name}
                                  {device.location?.city && ` • ${device.location.city}, ${device.location.countryCode}`}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                  Last active: {new Date(device.lastActiveAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {!device.isCurrentDevice && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => logoutDeviceMutation.mutate(device._id)}
                                isLoading={logoutDeviceMutation.isPending}
                              >
                                Sign Out
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-text-muted py-8">No devices found</p>
                  )}
                </div>

                {/* Streaming Limits Info */}
                <div className="bg-surface rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Streaming Limits</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-text-muted">Simultaneous Streams</p>
                      <p className="text-2xl font-bold mt-1">
                        {subscription?.plan?.limits?.maxStreams || 1}
                      </p>
                    </div>
                    <div className="p-4 bg-background rounded-lg">
                      <p className="text-sm text-text-muted">Download Devices</p>
                      <p className="text-2xl font-bold mt-1">
                        {subscription?.plan?.limits?.maxDownloads || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Email Notifications
                  </h2>

                  <div className="space-y-4">
                    {[
                      { key: 'newReleases', label: 'New Releases', description: 'Get notified about new movies and shows' },
                      { key: 'recommendations', label: 'Recommendations', description: 'Personalized content suggestions based on your taste' },
                      { key: 'accountUpdates', label: 'Account Updates', description: 'Important updates about your account and billing' },
                      { key: 'watchlistReminders', label: 'Watchlist Reminders', description: 'Reminders about titles in your watchlist' },
                      { key: 'marketing', label: 'Marketing & Promotions', description: 'Special offers, promotions, and news' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-4 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-text-muted">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(notifications?.email as Record<string, boolean>)?.[item.key] ?? true}
                            onChange={(e) => handleNotificationChange('email', item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Push Notifications */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Push Notifications</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">Enable Push Notifications</p>
                        <p className="text-sm text-text-muted">Receive notifications on this device</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications?.push?.enabled ?? true}
                          onChange={(e) => handleNotificationChange('push', 'enabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </div>

                    {notifications?.push?.enabled && (
                      <>
                        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                          <div>
                            <p className="font-medium">New Episodes</p>
                            <p className="text-sm text-text-muted">Get notified when new episodes are available</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifications?.push?.newEpisodes ?? true}
                              onChange={(e) => handleNotificationChange('push', 'newEpisodes', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                          <div>
                            <p className="font-medium">Continue Watching</p>
                            <p className="text-sm text-text-muted">Reminders to continue watching where you left off</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifications?.push?.continueWatching ?? true}
                              onChange={(e) => handleNotificationChange('push', 'continueWatching', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-surface rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" />
                    Password & Authentication
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-text-muted">Change your password to keep your account secure</p>
                      </div>
                      <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                        Change Password
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-text-muted">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="secondary">
                        Enable
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                      <div>
                        <p className="font-medium">Profile PIN</p>
                        <p className="text-sm text-text-muted">
                          {profileData?.user?.profile?.profileLock?.enabled
                            ? 'PIN lock is enabled'
                            : 'Require a PIN to access your profile'}
                        </p>
                      </div>
                      <Button variant="secondary">
                        {profileData?.user?.profile?.profileLock?.enabled ? 'Change PIN' : 'Set PIN'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-surface rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Recent Sign-in Activity</h2>

                  <div className="space-y-3">
                    {devices?.slice(0, 5).map((device: DeviceSession) => (
                      <div key={device._id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div>
                          <p className="font-medium">{device.deviceName}</p>
                          <p className="text-sm text-text-muted">
                            {device.location?.city && `${device.location.city}, ${device.location.countryCode} • `}
                            {new Date(device.loginAt).toLocaleString()}
                          </p>
                        </div>
                        {device.isCurrentDevice && (
                          <Badge variant="new" className="text-xs">Current</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete Account */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-red-500/20 rounded-lg">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-red-500">Delete Account</h3>
                      <p className="text-sm text-text-muted mt-1 mb-4">
                        Permanently delete your account and all associated data. This action cannot be undone.
                      </p>
                      <Button
                        variant="ghost"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Account
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Modals */}
        {/* Password Change Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal p-4"
              onClick={() => setShowPasswordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-semibold mb-6">Change Password</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {changePasswordMutation.isError && (
                  <p className="text-red-500 text-sm mt-4">
                    {(changePasswordMutation.error as Error)?.message || 'Failed to change password'}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleChangePassword}
                    isLoading={changePasswordMutation.isPending}
                    disabled={!passwordForm.currentPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                  >
                    Change Password
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon Modal */}
        <AnimatePresence>
          {showCouponModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal p-4"
              onClick={() => setShowCouponModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Redeem Code</h2>
                    <p className="text-sm text-text-muted">Enter a gift or promo code for free access</p>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => {
                      setRedeemCode(e.target.value.toUpperCase());
                      setRedeemError('');
                    }}
                    placeholder="Enter code"
                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg tracking-widest uppercase"
                  />
                </div>

                {redeemError && (
                  <p className="text-red-500 text-sm mt-4 text-center">
                    {redeemError}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => {
                    setShowCouponModal(false);
                    setRedeemCode('');
                    setRedeemError('');
                  }}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleRedeemCode}
                    isLoading={isRedeeming}
                    disabled={!redeemCode || redeemCode.length < 4}
                  >
                    Redeem
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkout Modal - Hidden while Razorpay is processing */}
        <AnimatePresence>
          {showCheckoutModal && selectedPlan && !isProcessingPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal p-4"
              onClick={() => !isProcessingPayment && setShowCheckoutModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Subscribe to {selectedPlan.displayName}</h2>
                    <p className="text-sm text-text-muted">Secure payment via Razorpay</p>
                  </div>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="mb-6">
                  <label className="block text-sm text-text-muted mb-2">Billing Cycle</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setBillingCycle('monthly');
                        setCouponValidation(null);
                      }}
                      className={cn(
                        'flex-1 py-3 rounded-lg border-2 transition-all',
                        billingCycle === 'monthly'
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <p className="font-medium">Monthly</p>
                      <p className="text-sm text-text-muted">{getCurrencySymbol(selectedPlan.price.currency)}{selectedPlan.price.monthly}/mo</p>
                    </button>
                    <button
                      onClick={() => {
                        setBillingCycle('yearly');
                        setCouponValidation(null);
                      }}
                      className={cn(
                        'flex-1 py-3 rounded-lg border-2 transition-all',
                        billingCycle === 'yearly'
                          ? 'border-primary bg-primary/10'
                          : 'border-white/10 hover:border-white/30'
                      )}
                    >
                      <p className="font-medium">Yearly</p>
                      <p className="text-sm text-text-muted">{getCurrencySymbol(selectedPlan.price.currency)}{selectedPlan.price.yearly}/yr</p>
                      {selectedPlan.price.yearly < selectedPlan.price.monthly * 12 && (
                        <p className="text-xs text-green-500">
                          Save {Math.round((1 - selectedPlan.price.yearly / (selectedPlan.price.monthly * 12)) * 100)}%
                        </p>
                      )}
                    </button>
                  </div>
                </div>

                {/* Coupon Code */}
                <div className="mb-6">
                  <label className="block text-sm text-text-muted mb-2">Have a coupon code?</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        value={checkoutCoupon}
                        onChange={(e) => {
                          setCheckoutCoupon(e.target.value.toUpperCase());
                          setCouponValidation(null);
                        }}
                        placeholder="Enter code"
                        className="w-full pl-10 pr-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleValidateCoupon}
                      disabled={!checkoutCoupon}
                    >
                      Apply
                    </Button>
                  </div>
                  {couponValidation && (
                    <p className={cn(
                      'text-sm mt-2',
                      couponValidation.valid ? 'text-green-500' : 'text-red-500'
                    )}>
                      {couponValidation.valid
                        ? `✓ Coupon applied! You save ${getCurrencySymbol(selectedPlan.price.currency)}${couponValidation.discountAmount.toFixed(2)}`
                        : couponValidation.error || 'Invalid coupon'}
                    </p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="bg-background rounded-lg p-4 mb-6">
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">{selectedPlan.displayName} ({billingCycle})</span>
                      <span>{getCurrencySymbol(selectedPlan.price.currency)}{selectedPlan.price[billingCycle].toFixed(2)}</span>
                    </div>
                    {couponValidation?.valid && (
                      <div className="flex justify-between text-green-500">
                        <span>Discount ({checkoutCoupon})</span>
                        <span>-{getCurrencySymbol(selectedPlan.price.currency)}{couponValidation.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{getCurrencySymbol(selectedPlan.price.currency)}{getCheckoutPrice().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h3 className="font-medium mb-2">What you'll get:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPlan.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className={cn(
                          'w-4 h-4 flex-shrink-0',
                          feature.included ? 'text-green-500' : 'text-text-muted'
                        )} />
                        <span className={!feature.included ? 'text-text-muted line-through' : ''}>
                          {feature.name}
                          {feature.value && `: ${feature.value}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setShowCheckoutModal(false)}
                    disabled={isProcessingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleCheckout}
                    isLoading={isProcessingPayment}
                    disabled={isProcessingPayment}
                  >
                    {getCheckoutPrice() === 0 ? 'Activate Free' : `Pay ${getCurrencySymbol(selectedPlan.price.currency)}${getCheckoutPrice().toFixed(2)}`}
                  </Button>
                </div>

                <p className="text-xs text-text-muted text-center mt-4">
                  By subscribing, you agree to our Terms of Service and Privacy Policy.
                  You can cancel anytime.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Account Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-modal p-4"
              onClick={() => setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-red-500">Delete Account</h2>
                    <p className="text-sm text-text-muted">This action is irreversible</p>
                  </div>
                </div>

                <p className="text-text-muted mb-6">
                  Are you sure you want to delete your account? All your data including watch history,
                  watchlist, and preferences will be permanently deleted.
                </p>

                <div>
                  <label className="block text-sm text-text-muted mb-2">Enter your password to confirm</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {deleteAccountMutation.isError && (
                  <p className="text-red-500 text-sm mt-4">
                    {(deleteAccountMutation.error as Error)?.message || 'Failed to delete account'}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-red-500 hover:bg-red-500/10"
                    onClick={() => deleteAccountMutation.mutate(deletePassword)}
                    isLoading={deleteAccountMutation.isPending}
                    disabled={!deletePassword}
                  >
                    Delete Account
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration Modal - Code Redeemed Successfully */}
        <AnimatePresence>
          {showCelebration && celebrationData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4"
              onClick={() => setShowCelebration(false)}
            >
              {/* Confetti */}
              <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {createConfetti()}
              </div>

              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                className="relative bg-gradient-to-br from-yellow-500/20 via-surface to-primary/20 rounded-2xl p-8 max-w-md w-full border border-yellow-500/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-primary/10 rounded-2xl blur-xl -z-10" />

                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 10, 0] }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30"
                    >
                      <PartyPopper className="w-12 h-12 text-white" />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="absolute -top-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-6 h-6 text-white" />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-transparent bg-clip-text">
                    🎉 Congratulations!
                  </h2>
                  <p className="text-lg text-text-secondary mb-4">
                    Your code has been successfully redeemed!
                  </p>
                </motion.div>

                {/* Plan Details */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-black/30 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span className="font-semibold text-lg">{celebrationData.planName} Plan Activated</span>
                  </div>

                  {celebrationData.expiresAt && (
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Valid until {new Date(celebrationData.expiresAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}

                  {celebrationData.features && celebrationData.features.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {celebrationData.features.slice(0, 4).map((feature, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.1 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{typeof feature === 'string' ? feature : feature.name}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    variant="primary"
                    className="w-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 py-3 text-lg font-semibold"
                    onClick={() => {
                      setShowCelebration(false);
                      setCelebrationData(null);
                    }}
                  >
                    Start Watching Now
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfilePage;
