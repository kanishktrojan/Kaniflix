import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Gift,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Copy,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Search,
  Ticket,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { adminService } from '@/services';
import { cn } from '@/utils';
import type { SubscriptionPlan, CouponCode, RedeemCode, SubscriptionStats } from '@/types';

// Types for form data
interface PlanFormData {
  name: string;
  displayName: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: Array<{
    name: string;
    included: boolean;
    value?: string;
  }>;
  limits: {
    maxStreams: number;
    maxDownloads: number;
    videoQuality: string;
    adsEnabled: boolean;
  };
  featureAccess: {
    streaming: boolean;
    downloads: boolean;
    sports: boolean;
    quality4k: boolean;
    hdr: boolean;
  };
  badge?: string;
  isPopular: boolean;
  isActive: boolean;
}

interface CouponFormData {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'trial_extension' | 'free_month' | 'free_subscription';
  discountValue: number;
  applicablePlans: string[];
  validFrom: string;
  validUntil: string;
  maxUses?: number;
  maxUsesPerUser: number;
  minPurchaseAmount?: number;
  firstTimeOnly: boolean;
  isActive: boolean;
}

interface RedeemCodeFormData {
  code: string;
  description: string;
  plan: string;
  duration: {
    value: number;
    unit: 'day' | 'week' | 'month' | 'year';
  };
  validFrom: string;
  validUntil: string;
  maxUses?: number;
  maxUsesPerUser: number;
  isActive: boolean;
}

const AdminSubscriptions: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'coupons' | 'redeem-codes'>('plans');

  // Modal states
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showRedeemCodeModal, setShowRedeemCodeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit states
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<CouponCode | null>(null);
  const [editingRedeemCode, setEditingRedeemCode] = useState<RedeemCode | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'plan' | 'coupon' | 'redeem-code'; id: string; name: string } | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form states
  const initialPlanForm: PlanFormData = {
    name: '',
    displayName: '',
    description: '',
    price: { monthly: 0, yearly: 0, currency: 'INR' },
    features: [
      { name: 'HD Available', included: true },
      { name: 'Ultra HD', included: false },
      { name: 'Watch on TV', included: true },
      { name: 'Ad-free', included: false },
      { name: 'Simultaneous screens', included: true, value: '1' },
    ],
    limits: {
      maxStreams: 1,
      maxDownloads: 0,
      videoQuality: 'HD',
      adsEnabled: true,
    },
    featureAccess: {
      streaming: true,
      downloads: false,
      sports: false,
      quality4k: false,
      hdr: false,
    },
    badge: '',
    isPopular: false,
    isActive: true,
  };

  const initialCouponForm: CouponFormData = {
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    applicablePlans: [],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxUses: undefined,
    maxUsesPerUser: 1,
    minPurchaseAmount: undefined,
    firstTimeOnly: false,
    isActive: true,
  };

  const [planForm, setPlanForm] = useState<PlanFormData>(initialPlanForm);
  const [couponForm, setCouponForm] = useState<CouponFormData>(initialCouponForm);

  const initialRedeemCodeForm: RedeemCodeFormData = {
    code: '',
    description: '',
    plan: '',
    duration: { value: 1, unit: 'month' },
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    maxUses: undefined,
    maxUsesPerUser: 1,
    isActive: true,
  };

  const [redeemCodeForm, setRedeemCodeForm] = useState<RedeemCodeFormData>(initialRedeemCodeForm);

  // Fetch subscription stats
  const { data: stats } = useQuery<SubscriptionStats>({
    queryKey: ['admin', 'subscription-stats'],
    queryFn: adminService.getSubscriptionStats,
  });

  // Fetch plans
  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['admin', 'plans'],
    queryFn: adminService.getSubscriptionPlans,
    enabled: activeTab === 'plans',
  });

  // Fetch coupons
  const { data: coupons, isLoading: couponsLoading } = useQuery<CouponCode[]>({
    queryKey: ['admin', 'coupons'],
    queryFn: adminService.getCoupons,
    enabled: activeTab === 'coupons',
  });

  // Fetch redeem codes
  const { data: redeemCodes, isLoading: redeemCodesLoading } = useQuery<RedeemCode[]>({
    queryKey: ['admin', 'redeem-codes'],
    queryFn: adminService.getRedeemCodes,
    enabled: activeTab === 'redeem-codes',
  });

  // Also fetch plans when on redeem codes tab (for dropdown)
  const { data: plansForDropdown } = useQuery<SubscriptionPlan[]>({
    queryKey: ['admin', 'plans'],
    queryFn: adminService.getSubscriptionPlans,
    enabled: activeTab === 'redeem-codes' || showRedeemCodeModal,
  });

  // Plan mutations
  const createPlanMutation = useMutation({
    mutationFn: (data: PlanFormData) => adminService.createSubscriptionPlan(data as unknown as Partial<SubscriptionPlan>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-stats'] });
      closePlanModal();
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlanFormData> }) =>
      adminService.updateSubscriptionPlan(id, data as unknown as Partial<SubscriptionPlan>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      closePlanModal();
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: adminService.deleteSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-stats'] });
      closeDeleteModal();
    },
  });

  // Coupon mutations
  const createCouponMutation = useMutation({
    mutationFn: (data: CouponFormData) => adminService.createCoupon(data as unknown as Partial<CouponCode>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      closeCouponModal();
    },
  });

  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CouponFormData> }) =>
      adminService.updateCoupon(id, data as unknown as Partial<CouponCode>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      closeCouponModal();
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: adminService.deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      closeDeleteModal();
    },
  });

  // Redeem Code mutations
  const createRedeemCodeMutation = useMutation({
    mutationFn: (data: RedeemCodeFormData) => adminService.createRedeemCode(data as unknown as Partial<RedeemCode>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'redeem-codes'] });
      closeRedeemCodeModal();
    },
  });

  const updateRedeemCodeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RedeemCodeFormData> }) =>
      adminService.updateRedeemCode(id, data as unknown as Partial<RedeemCode>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'redeem-codes'] });
      closeRedeemCodeModal();
    },
  });

  const deleteRedeemCodeMutation = useMutation({
    mutationFn: adminService.deleteRedeemCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'redeem-codes'] });
      closeDeleteModal();
    },
  });

  // Handlers
  const openPlanModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description || '',
        price: {
          monthly: plan.price.monthly,
          yearly: plan.price.yearly,
          currency: plan.price.currency || 'INR'
        },
        features: plan.features?.map(f => ({
          name: f.name,
          included: f.included,
          value: f.value || undefined
        })) || initialPlanForm.features,
        limits: plan.limits || initialPlanForm.limits,
        featureAccess: (plan as any).featureAccess || initialPlanForm.featureAccess,
        badge: typeof plan.badge === 'string' ? plan.badge : plan.badge?.text || '',
        isPopular: plan.isPopular || false,
        isActive: plan.isActive !== false,
      });
    } else {
      setEditingPlan(null);
      setPlanForm(initialPlanForm);
    }
    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm(initialPlanForm);
  };

  const openCouponModal = (coupon?: CouponCode) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        applicablePlans: coupon.applicablePlans?.map(p => typeof p === 'string' ? p : p._id) || [],
        validFrom: new Date(coupon.validFrom).toISOString().split('T')[0],
        validUntil: new Date(coupon.validUntil).toISOString().split('T')[0],
        maxUses: coupon.maxUses === null ? undefined : coupon.maxUses,
        maxUsesPerUser: coupon.maxUsesPerUser || 1,
        minPurchaseAmount: coupon.minPurchaseAmount,
        firstTimeOnly: coupon.firstTimeOnly || false,
        isActive: coupon.isActive !== false,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm(initialCouponForm);
    }
    setShowCouponModal(true);
  };

  const closeCouponModal = () => {
    setShowCouponModal(false);
    setEditingCoupon(null);
    setCouponForm(initialCouponForm);
  };

  const openRedeemCodeModal = (redeemCode?: RedeemCode) => {
    if (redeemCode) {
      setEditingRedeemCode(redeemCode);
      setRedeemCodeForm({
        code: redeemCode.code,
        description: redeemCode.description || '',
        plan: typeof redeemCode.plan === 'string' ? redeemCode.plan : redeemCode.plan._id,
        duration: redeemCode.duration || { value: 1, unit: 'month' },
        validFrom: new Date(redeemCode.validFrom).toISOString().split('T')[0],
        validUntil: new Date(redeemCode.validUntil).toISOString().split('T')[0],
        maxUses: redeemCode.maxUses === null ? undefined : redeemCode.maxUses,
        maxUsesPerUser: redeemCode.maxUsesPerUser || 1,
        isActive: redeemCode.isActive !== false,
      });
    } else {
      setEditingRedeemCode(null);
      setRedeemCodeForm(initialRedeemCodeForm);
    }
    setShowRedeemCodeModal(true);
  };

  const closeRedeemCodeModal = () => {
    setShowRedeemCodeModal(false);
    setEditingRedeemCode(null);
    setRedeemCodeForm(initialRedeemCodeForm);
  };

  const openDeleteModal = (type: 'plan' | 'coupon' | 'redeem-code', id: string, name: string) => {
    setDeletingItem({ type, id, name });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingItem(null);
  };

  const handleSavePlan = () => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan._id, data: planForm });
    } else {
      createPlanMutation.mutate(planForm);
    }
  };

  const handleSaveCoupon = () => {
    if (editingCoupon) {
      updateCouponMutation.mutate({ id: editingCoupon._id, data: couponForm });
    } else {
      createCouponMutation.mutate(couponForm);
    }
  };

  const handleSaveRedeemCode = () => {
    if (editingRedeemCode) {
      updateRedeemCodeMutation.mutate({ id: editingRedeemCode._id, data: redeemCodeForm });
    } else {
      createRedeemCodeMutation.mutate(redeemCodeForm);
    }
  };

  const handleDelete = () => {
    if (!deletingItem) return;

    if (deletingItem.type === 'plan') {
      deletePlanMutation.mutate(deletingItem.id);
    } else if (deletingItem.type === 'coupon') {
      deleteCouponMutation.mutate(deletingItem.id);
    } else if (deletingItem.type === 'redeem-code') {
      deleteRedeemCodeMutation.mutate(deletingItem.id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCouponForm({ ...couponForm, code });
  };

  const addFeature = () => {
    setPlanForm({
      ...planForm,
      features: [...planForm.features, { name: '', included: true }],
    });
  };

  const updateFeature = (index: number, updates: Partial<PlanFormData['features'][0]>) => {
    const newFeatures = [...planForm.features];
    newFeatures[index] = { ...newFeatures[index], ...updates };
    setPlanForm({ ...planForm, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    setPlanForm({
      ...planForm,
      features: planForm.features.filter((_, i) => i !== index),
    });
  };

  // Filter coupons
  const filteredCoupons = coupons?.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && coupon.isActive) ||
      (statusFilter === 'inactive' && !coupon.isActive);
    return matchesSearch && matchesStatus;
  });

  // Filter redeem codes
  const filteredRedeemCodes = redeemCodes?.filter(code => {
    const matchesSearch = code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      code.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && code.isActive) ||
      (statusFilter === 'inactive' && !code.isActive);
    return matchesSearch && matchesStatus;
  });

  // Generate redeem code
  const generateRedeemCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'FREE';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRedeemCodeForm({ ...redeemCodeForm, code });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-text-secondary mt-1">
            Manage subscription plans and coupon codes
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-lg">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
                <p className="text-sm text-text-muted">Total Subscribers</p>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.monthlyRevenue?.toFixed(2)}</p>
                <p className="text-sm text-text-muted">Monthly Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeTrials}</p>
                <p className="text-sm text-text-muted">Active Trials</p>
              </div>
            </div>
          </div>
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Gift className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeCoupons}</p>
                <p className="text-sm text-text-muted">Active Coupons</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('plans')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'plans'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-white hover:bg-surface'
          )}
        >
          <CreditCard className="w-4 h-4" />
          Plans
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'coupons'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-white hover:bg-surface'
          )}
        >
          <Gift className="w-4 h-4" />
          Coupon Codes
        </button>
        <button
          onClick={() => setActiveTab('redeem-codes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            activeTab === 'redeem-codes'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-white hover:bg-surface'
          )}
        >
          <Ticket className="w-4 h-4" />
          Redeem Codes
        </button>
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => openPlanModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Plan
            </Button>
          </div>

          {plansLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <motion.div
                  key={plan._id}
                  layout
                  className={cn(
                    'relative bg-surface rounded-xl p-6 border-2 transition-all',
                    plan.isPopular ? 'border-primary' : 'border-transparent',
                    !plan.isActive && 'opacity-60'
                  )}
                >
                  {plan.isPopular && (
                    <Badge variant="new" className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Most Popular
                    </Badge>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold">{plan.displayName}</h3>
                      <Badge variant={plan.isActive ? 'success' : 'secondary'} className="mt-1">
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPlanModal(plan)}
                        className="p-2 hover:bg-background rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal('plan', plan._id, plan.displayName)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-bold">
                      ${plan.price.monthly}
                      <span className="text-sm font-normal text-text-muted">/mo</span>
                    </p>
                    <p className="text-sm text-text-muted">
                      ${plan.price.yearly}/year
                    </p>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-text-muted mb-4">{plan.description}</p>
                  )}

                  <div className="space-y-2">
                    {plan.features?.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-text-muted" />
                        )}
                        <span className={!feature.included ? 'text-text-muted' : ''}>
                          {feature.name}
                          {feature.value && `: ${feature.value}`}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-text-muted">
                      {stats?.planDistribution?.find(p => p._id === plan._id)?.count || 0} subscribers
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-text-muted mb-4" />
              <p className="text-text-muted">No subscription plans yet</p>
              <Button className="mt-4" onClick={() => openPlanModal()}>
                Create First Plan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Coupons Tab */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search coupons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 bg-surface border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <Button onClick={() => openCouponModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Coupon
            </Button>
          </div>

          {couponsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCoupons && filteredCoupons.length > 0 ? (
            <div className="bg-surface rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Code</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Discount</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Usage</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Valid Until</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCoupons.map((coupon) => {
                    const isExpired = new Date(coupon.validUntil) < new Date();
                    const usageFull = coupon.maxUses && coupon.currentUses >= coupon.maxUses;

                    return (
                      <tr key={coupon._id} className="hover:bg-background/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-background rounded text-primary font-mono">
                              {coupon.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(coupon.code)}
                              className="p-1 hover:bg-surface rounded transition-colors"
                            >
                              <Copy className="w-4 h-4 text-text-muted" />
                            </button>
                          </div>
                          {coupon.description && (
                            <p className="text-sm text-text-muted mt-1">{coupon.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {coupon.discountType === 'percentage' && `${coupon.discountValue}%`}
                            {coupon.discountType === 'fixed' && `$${coupon.discountValue}`}
                            {coupon.discountType === 'trial_extension' && `${coupon.discountValue} days trial`}
                            {coupon.discountType === 'free_month' && `${coupon.discountValue} free months`}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span>
                            {coupon.currentUses}
                            {coupon.maxUses ? ` / ${coupon.maxUses}` : ' uses'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={isExpired ? 'text-red-500' : ''}>
                            {new Date(coupon.validUntil).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              !coupon.isActive ? 'secondary' :
                                isExpired ? 'danger' :
                                  usageFull ? 'warning' :
                                    'success'
                            }
                          >
                            {!coupon.isActive ? 'Inactive' :
                              isExpired ? 'Expired' :
                                usageFull ? 'Used Up' :
                                  'Active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openCouponModal(coupon)}
                              className="p-2 hover:bg-background rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal('coupon', coupon._id, coupon.code)}
                              className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 mx-auto text-text-muted mb-4" />
              <p className="text-text-muted">
                {searchQuery || statusFilter !== 'all' ? 'No coupons match your search' : 'No coupon codes yet'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => openCouponModal()}>
                  Create First Coupon
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Redeem Codes Tab */}
      {activeTab === 'redeem-codes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search redeem codes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="px-4 py-2 bg-surface border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <Button onClick={() => openRedeemCodeModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Redeem Code
            </Button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Ticket className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-500">Redeem Codes vs Coupons</h4>
                <p className="text-sm text-text-muted mt-1">
                  Redeem codes give users <strong>FREE access</strong> to a specific plan for a set duration.
                  Unlike coupons (which give discounts), users do NOT need an active subscription to use redeem codes.
                </p>
              </div>
            </div>
          </div>

          {redeemCodesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredRedeemCodes && filteredRedeemCodes.length > 0 ? (
            <div className="bg-surface rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Code</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Plan</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Duration</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Usage</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Valid Until</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-text-muted">Status</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRedeemCodes.map((redeemCode) => {
                    const isExpired = new Date(redeemCode.validUntil) < new Date();
                    const usageFull = redeemCode.maxUses && redeemCode.currentUses >= redeemCode.maxUses;
                    const planInfo = typeof redeemCode.plan === 'object' ? redeemCode.plan : null;

                    return (
                      <tr key={redeemCode._id} className="hover:bg-background/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 bg-green-500/20 rounded text-green-400 font-mono">
                              {redeemCode.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(redeemCode.code)}
                              className="p-1 hover:bg-surface rounded transition-colors"
                            >
                              <Copy className="w-4 h-4 text-text-muted" />
                            </button>
                          </div>
                          {redeemCode.description && (
                            <p className="text-sm text-text-muted mt-1">{redeemCode.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="new">
                            {planInfo?.displayName || 'Unknown Plan'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">
                            {redeemCode.duration.value} {redeemCode.duration.unit}(s)
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span>
                            {redeemCode.currentUses}
                            {redeemCode.maxUses ? ` / ${redeemCode.maxUses}` : ' uses'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={isExpired ? 'text-red-500' : ''}>
                            {new Date(redeemCode.validUntil).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              !redeemCode.isActive ? 'secondary' :
                                isExpired ? 'danger' :
                                  usageFull ? 'warning' :
                                    'success'
                            }
                          >
                            {!redeemCode.isActive ? 'Inactive' :
                              isExpired ? 'Expired' :
                                usageFull ? 'Used Up' :
                                  'Active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRedeemCodeModal(redeemCode)}
                              className="p-2 hover:bg-background rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal('redeem-code', redeemCode._id, redeemCode.code)}
                              className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 mx-auto text-text-muted mb-4" />
              <p className="text-text-muted">
                {searchQuery || statusFilter !== 'all' ? 'No redeem codes match your search' : 'No redeem codes yet'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="mt-4" onClick={() => openRedeemCodeModal()}>
                  Create First Redeem Code
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closePlanModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-6">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h2>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Plan Tier</label>
                    <select
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a plan tier</option>
                      <option value="Free">Free</option>
                      <option value="Basic">Basic</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Display Name</label>
                    <input
                      type="text"
                      value={planForm.displayName}
                      onChange={(e) => setPlanForm({ ...planForm, displayName: e.target.value })}
                      placeholder="e.g., Basic, Premium"
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-muted mb-2">Description</label>
                  <textarea
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    placeholder="Describe this plan..."
                    rows={2}
                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Pricing */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Pricing</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="col-span-1">
                      <label className="block text-sm text-text-muted mb-2">Currency</label>
                      <select
                        value={planForm.price.currency}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          price: { ...planForm.price, currency: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="INR">INR (₹) - Indian Rupee</option>
                        <option value="USD">USD ($) - US Dollar</option>
                        <option value="EUR">EUR (€) - Euro</option>
                        <option value="GBP">GBP (£) - British Pound</option>
                      </select>
                      <p className="text-xs text-yellow-500 mt-1">⚠️ Razorpay test mode only supports INR</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Monthly Price ({planForm.price.currency === 'INR' ? '₹' : planForm.price.currency === 'EUR' ? '€' : planForm.price.currency === 'GBP' ? '£' : '$'})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={planForm.price.monthly}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          price: { ...planForm.price, monthly: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Yearly Price ({planForm.price.currency === 'INR' ? '₹' : planForm.price.currency === 'EUR' ? '€' : planForm.price.currency === 'GBP' ? '£' : '$'})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={planForm.price.yearly}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          price: { ...planForm.price, yearly: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Features</h3>
                    <button
                      onClick={addFeature}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      + Add Feature
                    </button>
                  </div>
                  <div className="space-y-2">
                    {planForm.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <button
                          onClick={() => updateFeature(index, { included: !feature.included })}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            feature.included ? 'bg-green-500/20 text-green-500' : 'bg-surface text-text-muted'
                          )}
                        >
                          {feature.included ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                        <input
                          type="text"
                          value={feature.name}
                          onChange={(e) => updateFeature(index, { name: e.target.value })}
                          placeholder="Feature name"
                          className="flex-1 px-3 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        <input
                          type="text"
                          value={feature.value || ''}
                          onChange={(e) => updateFeature(index, { value: e.target.value })}
                          placeholder="Value (optional)"
                          className="w-24 px-3 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                        <button
                          onClick={() => removeFeature(index)}
                          className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Limits</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Max Streams</label>
                      <input
                        type="number"
                        value={planForm.limits.maxStreams}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, maxStreams: parseInt(e.target.value) || 1 }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Max Downloads</label>
                      <input
                        type="number"
                        value={planForm.limits.maxDownloads}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, maxDownloads: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">Video Quality</label>
                      <select
                        value={planForm.limits.videoQuality}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          limits: { ...planForm.limits, videoQuality: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="SD">SD (480p)</option>
                        <option value="HD">HD (720p)</option>
                        <option value="FHD">Full HD (1080p)</option>
                        <option value="UHD">4K Ultra HD</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.limits.adsEnabled}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            limits: { ...planForm.limits, adsEnabled: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>Show Ads</span>
                    </div>
                  </div>
                </div>

                {/* Feature Access */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Feature Access</h3>
                  <p className="text-xs text-text-muted mb-4">Control which features subscribers to this plan can access</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.featureAccess.streaming}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            featureAccess: { ...planForm.featureAccess, streaming: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>Streaming Access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.featureAccess.downloads}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            featureAccess: { ...planForm.featureAccess, downloads: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>Downloads Access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.featureAccess.sports}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            featureAccess: { ...planForm.featureAccess, sports: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>Sports Access</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.featureAccess.quality4k}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            featureAccess: { ...planForm.featureAccess, quality4k: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>4K Quality</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={planForm.featureAccess.hdr}
                          onChange={(e) => setPlanForm({
                            ...planForm,
                            featureAccess: { ...planForm.featureAccess, hdr: e.target.checked }
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                      <span>HDR Content</span>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isPopular}
                        onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                    <span>Mark as Popular</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={planForm.isActive}
                        onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                    <span>Active</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" className="flex-1" onClick={closePlanModal}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSavePlan}
                  isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
                  disabled={!planForm.name || !planForm.displayName}
                >
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closeCouponModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-6">
                {editingCoupon ? 'Edit Coupon Code' : 'Create Coupon Code'}
              </h2>

              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm text-text-muted mb-2">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                      placeholder="SAVE20"
                      className="flex-1 px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase font-mono"
                    />
                    <Button variant="secondary" onClick={generateCouponCode}>
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-text-muted mb-2">Description</label>
                  <input
                    type="text"
                    value={couponForm.description}
                    onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                    placeholder="20% off first month"
                    className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Discount Type</label>
                    <select
                      value={couponForm.discountType}
                      onChange={(e) => setCouponForm({
                        ...couponForm,
                        discountType: e.target.value as CouponFormData['discountType'],
                        discountValue: e.target.value === 'free_subscription' ? 100 : couponForm.discountValue
                      })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="fixed">Fixed Amount Off</option>
                      <option value="trial_extension">Trial Extension</option>
                      <option value="free_month">Free Months</option>
                      <option value="free_subscription">🎁 Free Subscription (100% Off)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">
                      {couponForm.discountType === 'percentage' ? 'Percentage (%)' :
                        couponForm.discountType === 'fixed' ? 'Amount ($)' :
                          couponForm.discountType === 'trial_extension' ? 'Days' :
                            couponForm.discountType === 'free_subscription' ? 'Discount (auto 100%)' : 'Months'}
                    </label>
                    <input
                      type="number"
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({
                        ...couponForm,
                        discountValue: parseFloat(e.target.value) || 0
                      })}
                      disabled={couponForm.discountType === 'free_subscription'}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Valid From</label>
                    <input
                      type="date"
                      value={couponForm.validFrom}
                      onChange={(e) => setCouponForm({ ...couponForm, validFrom: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Valid Until</label>
                    <input
                      type="date"
                      value={couponForm.validUntil}
                      onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Max Total Uses (empty = unlimited)</label>
                    <input
                      type="number"
                      value={couponForm.maxUses || ''}
                      onChange={(e) => setCouponForm({
                        ...couponForm,
                        maxUses: e.target.value ? parseInt(e.target.value) : undefined
                      })}
                      placeholder="Unlimited"
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-text-muted mb-2">Max Uses Per User</label>
                    <input
                      type="number"
                      value={couponForm.maxUsesPerUser}
                      onChange={(e) => setCouponForm({
                        ...couponForm,
                        maxUsesPerUser: parseInt(e.target.value) || 1
                      })}
                      className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponForm.firstTimeOnly}
                        onChange={(e) => setCouponForm({ ...couponForm, firstTimeOnly: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                    <span>First-time subscribers only</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={couponForm.isActive}
                        onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                    <span>Active</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={closeCouponModal}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveCoupon}
                  isLoading={createCouponMutation.isPending || updateCouponMutation.isPending}
                  disabled={!couponForm.code}
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redeem Code Modal */}
      <AnimatePresence>
        {showRedeemCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closeRedeemCodeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-6">
                {editingRedeemCode ? 'Edit Redeem Code' : 'Create Redeem Code'}
              </h2>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-6">
                <p className="text-sm text-green-400">
                  🎁 Redeem codes give users FREE access to a subscription plan for a specified duration.
                </p>
              </div>

              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium mb-2">Redeem Code *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={redeemCodeForm.code}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., FREEPREMIUM"
                      className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                      disabled={!!editingRedeemCode}
                    />
                    {!editingRedeemCode && (
                      <Button variant="ghost" onClick={generateRedeemCode}>
                        Generate
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <input
                    type="text"
                    value={redeemCodeForm.description}
                    onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, description: e.target.value })}
                    placeholder="e.g., Free premium access for new users"
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Plan Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Subscription Plan *</label>
                  <select
                    value={redeemCodeForm.plan}
                    onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, plan: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a plan...</option>
                    {(plansForDropdown || plans)?.filter(p => p.isActive).map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.displayName} - ₹{plan.price.monthly}/month
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    This is the plan users will get FREE access to when they redeem this code.
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-2">Free Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={redeemCodeForm.duration.value}
                      onChange={(e) => setRedeemCodeForm({
                        ...redeemCodeForm,
                        duration: { ...redeemCodeForm.duration, value: parseInt(e.target.value) || 1 }
                      })}
                      className="w-24 px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                      value={redeemCodeForm.duration.unit}
                      onChange={(e) => setRedeemCodeForm({
                        ...redeemCodeForm,
                        duration: { ...redeemCodeForm.duration, unit: e.target.value as 'day' | 'week' | 'month' | 'year' }
                      })}
                      className="flex-1 px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="day">Day(s)</option>
                      <option value="week">Week(s)</option>
                      <option value="month">Month(s)</option>
                      <option value="year">Year(s)</option>
                    </select>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    How long the user will have free access to the plan.
                  </p>
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid From</label>
                    <input
                      type="date"
                      value={redeemCodeForm.validFrom}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, validFrom: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid Until</label>
                    <input
                      type="date"
                      value={redeemCodeForm.validUntil}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, validUntil: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Total Uses</label>
                    <input
                      type="number"
                      min="0"
                      value={redeemCodeForm.maxUses || ''}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, maxUses: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Unlimited"
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">Leave empty for unlimited</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Uses Per User</label>
                    <input
                      type="number"
                      min="1"
                      value={redeemCodeForm.maxUsesPerUser}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, maxUsesPerUser: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 bg-background border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemCodeForm.isActive}
                      onChange={(e) => setRedeemCodeForm({ ...redeemCodeForm, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-background rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                  <span>Active</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={closeRedeemCodeModal}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveRedeemCode}
                  isLoading={createRedeemCodeMutation.isPending || updateRedeemCodeMutation.isPending}
                  disabled={!redeemCodeForm.code || !redeemCodeForm.plan}
                >
                  {editingRedeemCode ? 'Update Redeem Code' : 'Create Redeem Code'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deletingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={closeDeleteModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold">Confirm Delete</h2>
              </div>

              <p className="text-text-muted mb-6">
                Are you sure you want to delete the {deletingItem.type}{' '}
                <span className="text-white font-medium">"{deletingItem.name}"</span>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-red-500 hover:bg-red-500/10"
                  onClick={handleDelete}
                  isLoading={deletePlanMutation.isPending || deleteCouponMutation.isPending || deleteRedeemCodeMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSubscriptions;
