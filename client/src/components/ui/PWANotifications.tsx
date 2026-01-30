import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useServiceWorker, useOnlineStatus } from '@/hooks/usePWA';

// Update available notification
export const UpdateNotification: React.FC = () => {
  const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isUpdateAvailable || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[70] pt-safe-top"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="mx-4 mt-2 bg-primary rounded-xl p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-white" />
            <div>
              <p className="text-white font-medium text-sm">Update Available</p>
              <p className="text-white/80 text-xs">Refresh to get the latest version</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={updateServiceWorker}
              className="px-4 py-2 bg-white text-primary rounded-lg font-semibold text-sm
                       hover:bg-white/90 transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Offline indicator
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    // Show offline indicator with a slight delay to avoid flickering
    let timer: ReturnType<typeof setTimeout>;
    if (!isOnline) {
      timer = setTimeout(() => setShowOffline(true), 500);
    } else {
      setShowOffline(false);
    }
    return () => clearTimeout(timer);
  }, [isOnline]);

  return (
    <AnimatePresence>
      {showOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[70] pt-safe-top"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
        >
          <div className="mx-4 mt-2 bg-surface rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <p className="text-white text-sm font-medium">
              You're offline - Some features may be limited
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Online restored indicator
export const OnlineRestoredIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowRestored(true);
      setWasOffline(false);

      // Auto-hide after 3 seconds
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return (
    <AnimatePresence>
      {showRestored && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[70] pt-safe-top"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
        >
          <div className="mx-4 mt-2 bg-success rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full" />
            <p className="text-white text-sm font-medium">
              Back online!
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Combined PWA notifications component
export const PWANotifications: React.FC = () => {
  return (
    <>
      <UpdateNotification />
      <OfflineIndicator />
      <OnlineRestoredIndicator />
    </>
  );
};

export default PWANotifications;
