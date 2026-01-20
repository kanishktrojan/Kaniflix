import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus, Download } from 'lucide-react';
import { usePWAInstall, useStandaloneMode } from '@/hooks/usePWA';

export const InstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismissPrompt } = usePWAInstall();
  const isStandalone = useStandaloneMode();
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Don't show if already installed or in standalone mode
    if (isInstalled || isStandalone) return;

    // Check if user dismissed recently (within 7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) return;
    }

    // Show prompt after a delay for better UX
    const timer = setTimeout(() => {
      if (isInstallable || isIOS) {
        setIsVisible(true);
      }
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isStandalone, isIOS]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIOSInstructions(false);
    dismissPrompt();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden"
            onClick={handleDismiss}
          />

          {/* Prompt */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[81] md:hidden"
          >
            <div 
              className="bg-background-secondary rounded-t-3xl p-6 pb-safe-bottom"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
            >
              {!showIOSInstructions ? (
                <>
                  {/* Main Install Prompt */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Download className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Install KANIFLIX
                        </h3>
                        <p className="text-sm text-text-secondary">
                          Add to your home screen
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-text-secondary" />
                    </button>
                  </div>

                  <p className="text-text-secondary text-sm mb-6">
                    Install our app for a better experience with offline access, 
                    faster loading, and a native app feel.
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { icon: '⚡', label: 'Fast' },
                      { icon: '📱', label: 'Native Feel' },
                      { icon: '🔔', label: 'Notifications' },
                    ].map((feature) => (
                      <div 
                        key={feature.label}
                        className="bg-surface/50 rounded-xl p-3 text-center"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <p className="text-xs text-text-secondary mt-1">{feature.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDismiss}
                      className="flex-1 py-3 px-4 rounded-xl bg-surface text-white font-medium
                               hover:bg-surface-hover transition-colors touch-target"
                    >
                      Not Now
                    </button>
                    <button
                      onClick={handleInstall}
                      className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-medium
                               hover:bg-primary-hover transition-colors touch-target
                               flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Install App
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* iOS Instructions */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Install on iOS
                    </h3>
                    <button
                      onClick={handleDismiss}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-text-secondary" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          Tap the <Share className="inline w-4 h-4 text-blue-400" /> Share button 
                          in Safari
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          Scroll down and tap <span className="text-white font-medium">"Add to Home Screen"</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm">
                          Tap <span className="text-white font-medium">"Add"</span> to install
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowIOSInstructions(false)}
                    className="w-full py-3 px-4 rounded-xl bg-surface text-white font-medium
                             hover:bg-surface-hover transition-colors touch-target"
                  >
                    Got it
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Minimal install banner for top of page
export const InstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const isStandalone = useStandaloneMode();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstalled || isStandalone || !isInstallable) return;

    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const oneDay = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < oneDay) return;
    }

    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isStandalone]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-primary text-white overflow-hidden md:hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-sm font-medium">
              Install KANIFLIX for a better experience
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={promptInstall}
                className="px-3 py-1.5 bg-white text-primary rounded-full text-sm font-semibold
                         hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
