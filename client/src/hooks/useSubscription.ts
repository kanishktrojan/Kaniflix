import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { paymentService } from '@/services';
import type { UserSubscription, SubscriptionPlan } from '@/types';

/**
 * Feature keys that can be gated by subscription
 */
export type FeatureKey = 'downloads' | 'streaming' | 'sports' | '4k_quality' | 'hdr';

/**
 * Subscription status with feature access
 */
export interface SubscriptionState {
    isLoading: boolean;
    hasSubscription: boolean;
    isExpired: boolean;
    subscription: UserSubscription | null;
    plan: SubscriptionPlan | null;
    daysRemaining: number;
    error: string | null;
}

/**
 * Feature access result
 */
export interface FeatureAccessResult {
    hasAccess: boolean;
    reason: 'granted' | 'not_authenticated' | 'no_subscription' | 'feature_not_included' | 'expired';
    message: string;
}

/**
 * Default feature access based on plan name patterns
 * This is a fallback when specific features aren't defined in the plan
 */
const DEFAULT_FEATURE_ACCESS: Record<string, FeatureKey[]> = {
    'basic': ['streaming'],
    'standard': ['streaming', 'downloads'],
    'premium': ['streaming', 'downloads', 'sports', '4k_quality', 'hdr'],
    'ultimate': ['streaming', 'downloads', 'sports', '4k_quality', 'hdr'],
};

/**
 * Custom hook for managing subscription state and feature access
 */
export function useSubscription() {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    const [state, setState] = useState<SubscriptionState>({
        isLoading: true,
        hasSubscription: false,
        isExpired: false,
        subscription: null,
        plan: null,
        daysRemaining: 0,
        error: null,
    });

    // Fetch subscription status
    const fetchSubscription = useCallback(async () => {
        if (!isAuthenticated) {
            setState({
                isLoading: false,
                hasSubscription: false,
                isExpired: false,
                subscription: null,
                plan: null,
                daysRemaining: 0,
                error: null,
            });
            return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await paymentService.getSubscription();

            setState({
                isLoading: false,
                hasSubscription: result.hasSubscription,
                isExpired: result.subscription?.isExpired ?? false,
                subscription: result.subscription as UserSubscription | null,
                plan: result.subscription?.plan as SubscriptionPlan | null ?? null,
                daysRemaining: result.subscription?.daysRemaining ?? 0,
                error: null,
            });
        } catch (error) {
            console.error('Error fetching subscription:', error);
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Failed to load subscription status',
            }));
        }
    }, [isAuthenticated]);

    // Fetch on mount and when auth changes
    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    /**
     * Check if a specific feature is included in the user's plan
     */
    const hasFeatureAccess = useCallback((feature: FeatureKey): FeatureAccessResult => {
        // Check authentication first
        if (!isAuthenticated) {
            return {
                hasAccess: false,
                reason: 'not_authenticated',
                message: 'Please sign in to access this feature',
            };
        }

        // Check subscription exists
        if (!state.hasSubscription || !state.subscription) {
            return {
                hasAccess: false,
                reason: 'no_subscription',
                message: 'Subscribe to access this feature',
            };
        }

        // Check if subscription is expired
        if (state.isExpired) {
            return {
                hasAccess: false,
                reason: 'expired',
                message: 'Your subscription has expired. Please renew to continue.',
            };
        }

        // Check if subscription is active
        if (state.subscription.status !== 'active' && state.subscription.status !== 'trial') {
            return {
                hasAccess: false,
                reason: 'expired',
                message: 'Your subscription is not active',
            };
        }

        // Map feature keys to featureAccess object keys
        type FeatureAccessKeys = 'streaming' | 'downloads' | 'sports' | 'quality4k' | 'hdr';
        const featureKeyMap: Record<FeatureKey, FeatureAccessKeys> = {
            'streaming': 'streaming',
            'downloads': 'downloads',
            'sports': 'sports',
            '4k_quality': 'quality4k',
            'hdr': 'hdr',
        };

        // PRIORITY 1: Check featureAccess object from admin panel (new system)
        const featureAccessObj = state.plan?.featureAccess;
        if (featureAccessObj) {
            const accessKey = featureKeyMap[feature];
            const hasAccess = featureAccessObj[accessKey];

            if (hasAccess === true) {
                return {
                    hasAccess: true,
                    reason: 'granted',
                    message: 'Access granted',
                };
            } else if (hasAccess === false) {
                return {
                    hasAccess: false,
                    reason: 'feature_not_included',
                    message: `Upgrade your plan to access ${feature.replace('_', ' ')}`,
                };
            }
            // If undefined, fall through to other checks
        }

        // PRIORITY 2: Check feature in plan features array (legacy)
        const planFeatures = state.plan?.features;
        if (planFeatures && planFeatures.length > 0) {
            const featureEntry = planFeatures.find(f =>
                f.name.toLowerCase().includes(feature.toLowerCase()) ||
                feature.toLowerCase().includes(f.name.toLowerCase())
            );

            if (featureEntry) {
                if (featureEntry.included) {
                    return {
                        hasAccess: true,
                        reason: 'granted',
                        message: 'Access granted',
                    };
                } else {
                    return {
                        hasAccess: false,
                        reason: 'feature_not_included',
                        message: `Upgrade your plan to access ${feature.replace('_', ' ')}`,
                    };
                }
            }
        }

        // PRIORITY 3: Fallback - Check based on plan name patterns
        const planName = state.plan?.name?.toLowerCase() || '';
        const defaultFeatures = Object.entries(DEFAULT_FEATURE_ACCESS).find(
            ([tier]) => planName.includes(tier)
        )?.[1] || [];

        if (defaultFeatures.includes(feature)) {
            return {
                hasAccess: true,
                reason: 'granted',
                message: 'Access granted',
            };
        }

        // If no explicit feature config and it's streaming, allow it (basic access)
        if (feature === 'streaming') {
            return {
                hasAccess: true,
                reason: 'granted',
                message: 'Access granted',
            };
        }

        return {
            hasAccess: false,
            reason: 'feature_not_included',
            message: `Upgrade your plan to access ${feature.replace('_', ' ')}`,
        };
    }, [isAuthenticated, state]);

    /**
     * Navigate to login page with return URL
     */
    const promptLogin = useCallback((returnUrl?: string) => {
        const url = returnUrl || window.location.pathname;
        navigate(`/login?redirect=${encodeURIComponent(url)}`);
    }, [navigate]);

    /**
     * Navigate to subscription/upgrade page
     */
    const promptUpgrade = useCallback(() => {
        navigate('/profile?tab=subscription');
    }, [navigate]);

    /**
     * Check access and handle redirects
     * Returns true if access granted, false otherwise
     */
    const checkAccess = useCallback((feature: FeatureKey, options?: {
        redirectOnFail?: boolean;
        showToast?: boolean;
    }): boolean => {
        const result = hasFeatureAccess(feature);

        if (!result.hasAccess && options?.redirectOnFail) {
            if (result.reason === 'not_authenticated') {
                promptLogin();
            } else {
                promptUpgrade();
            }
        }

        return result.hasAccess;
    }, [hasFeatureAccess, promptLogin, promptUpgrade]);

    return useMemo(() => ({
        ...state,
        hasFeatureAccess,
        checkAccess,
        promptLogin,
        promptUpgrade,
        refetch: fetchSubscription,
    }), [state, hasFeatureAccess, checkAccess, promptLogin, promptUpgrade, fetchSubscription]);
}

export default useSubscription;
