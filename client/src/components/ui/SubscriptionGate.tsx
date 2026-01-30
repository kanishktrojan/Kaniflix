import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Crown, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription, type FeatureKey } from '@/hooks/useSubscription';
import { cn } from '@/utils';

interface SubscriptionGateProps {
    feature: FeatureKey;
    children?: React.ReactNode; // Optional when using showInline mode
    fallback?: React.ReactNode;
    className?: string;
    showInline?: boolean; // Show inline message instead of overlay
}

/**
 * Component to gate content behind authentication and subscription checks
 * Shows appropriate prompts based on access status
 */
export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
    feature,
    children,
    fallback,
    className,
    showInline = false,
}) => {
    const navigate = useNavigate();
    const { isLoading, hasFeatureAccess } = useSubscription();

    const accessResult = hasFeatureAccess(feature);

    // Show loading state
    if (isLoading) {
        return (
            <div className={cn('flex items-center justify-center p-8', className)}>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Access granted - render children
    if (accessResult.hasAccess) {
        return <>{children}</>;
    }

    // Custom fallback provided
    if (fallback) {
        return <>{fallback}</>;
    }

    // Default access denied UI
    const isAuthIssue = accessResult.reason === 'not_authenticated';

    const handleAction = () => {
        if (isAuthIssue) {
            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        } else {
            navigate('/profile?tab=subscription');
        }
    };

    const featureLabels: Record<FeatureKey, string> = {
        downloads: 'Downloads',
        streaming: 'Streaming',
        sports: 'Live Sports',
        '4k_quality': '4K Quality',
        hdr: 'HDR Content',
    };

    if (showInline) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'flex flex-col items-center justify-center p-8 text-center',
                    'bg-white/[0.02] rounded-2xl border border-white/10',
                    className
                )}
            >
                <div className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
                    isAuthIssue
                        ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10'
                        : 'bg-gradient-to-br from-amber-500/20 to-amber-600/10'
                )}>
                    {isAuthIssue ? (
                        <LogIn className="w-8 h-8 text-blue-400" />
                    ) : (
                        <Crown className="w-8 h-8 text-amber-400" />
                    )}
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">
                    {isAuthIssue ? 'Sign In Required' : `Upgrade for ${featureLabels[feature]}`}
                </h3>

                <p className="text-sm text-text-muted mb-6 max-w-xs">
                    {accessResult.message}
                </p>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAction}
                    className={cn(
                        'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white',
                        'transition-all duration-300',
                        isAuthIssue
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400',
                        'shadow-lg',
                        isAuthIssue ? 'shadow-blue-500/25' : 'shadow-amber-500/25'
                    )}
                >
                    {isAuthIssue ? (
                        <>
                            <LogIn className="w-4 h-4" />
                            Sign In
                        </>
                    ) : (
                        <>
                            <Crown className="w-4 h-4" />
                            Upgrade Now
                        </>
                    )}
                </motion.button>
            </motion.div>
        );
    }

    // Overlay style for modals
    return (
        <div className={cn('relative', className)}>
            {/* Blurred content behind */}
            <div className="blur-sm opacity-30 pointer-events-none">
                {children}
            </div>

            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm rounded-xl"
            >
                <div className={cn(
                    'w-20 h-20 rounded-2xl flex items-center justify-center mb-4',
                    isAuthIssue
                        ? 'bg-gradient-to-br from-blue-500/30 to-blue-600/20'
                        : 'bg-gradient-to-br from-amber-500/30 to-amber-600/20'
                )}>
                    {isAuthIssue ? (
                        <Lock className="w-10 h-10 text-blue-400" />
                    ) : (
                        <Crown className="w-10 h-10 text-amber-400" />
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">
                    {isAuthIssue ? 'Sign In to Continue' : `Unlock ${featureLabels[feature]}`}
                </h3>

                <p className="text-sm text-text-muted mb-6 max-w-sm">
                    {accessResult.message}
                </p>

                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAction}
                    className={cn(
                        'flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white',
                        'transition-all duration-300',
                        isAuthIssue
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 shadow-blue-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/30',
                        'shadow-lg'
                    )}
                >
                    {isAuthIssue ? (
                        <>
                            <LogIn className="w-5 h-5" />
                            Sign In
                        </>
                    ) : (
                        <>
                            <Crown className="w-5 h-5" />
                            Upgrade Plan
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
};

export default SubscriptionGate;
