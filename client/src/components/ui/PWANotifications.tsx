import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, WifiOff, Wifi } from 'lucide-react';
import { useServiceWorker, useOnlineStatus } from '@/hooks/usePWA';
import { useIsMobile, useIsTablet } from '@/hooks';

// Mobile bottom nav is ~68px tall; we position notifications just above it on mobile
const MOBILE_BOTTOM_NAV_HEIGHT = 68;

// Update available notification (stays at top — it's an action banner)
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

// Offline indicator — fixed at bottom, stays until back online
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showOffline, setShowOffline] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isMobileOrTablet = isMobile || isTablet;

  useEffect(() => {
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
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed left-0 right-0 z-[60]"
          style={{
            bottom: isMobileOrTablet ? `${MOBILE_BOTTOM_NAV_HEIGHT}px` : '0px',
          }}
        >
          <div className="flex items-center justify-center gap-2 bg-neutral-700/95 backdrop-blur-sm px-4 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
            <WifiOff className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <p className="text-white/90 text-xs font-medium">
              No internet connection
            </p>
            <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-pulse shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Online restored indicator — appears at bottom, fades away in 3s
export const OnlineRestoredIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const wasOfflineRef = useRef(false);
  const [showRestored, setShowRestored] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isMobileOrTablet = isMobile || isTablet;

  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {showRestored && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed left-0 right-0 z-[60]"
          style={{
            bottom: isMobileOrTablet ? `${MOBILE_BOTTOM_NAV_HEIGHT}px` : '0px',
          }}
        >
          <div className="flex items-center justify-center gap-2 bg-green-500/95 backdrop-blur-sm px-4 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
            <Wifi className="w-3.5 h-3.5 text-white shrink-0" />
            <p className="text-white text-xs font-medium">
              Back online
            </p>
            <span className="w-1.5 h-1.5 bg-green-200 rounded-full shrink-0" />
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
