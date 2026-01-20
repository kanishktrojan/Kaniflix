import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AnimatePresence } from 'framer-motion';
import { AppRouter } from '@/router';
import { useAuthStore } from '@/store';
import { wakeUpBackend, startBackendKeepAlive, stopBackendKeepAlive } from '@/utils';
import { PWANotifications, InstallPrompt, SplashScreen } from '@/components/ui';
import { useStandaloneMode } from '@/hooks/usePWA';
import logo from '@/assets/kaniflix_logo.png';

// Wake up the backend immediately when app loads (for Render free tier)
// This runs in background while content loads directly from TMDB API
wakeUpBackend();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth initializer component
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();
  const isStandalone = useStandaloneMode();
  const [showSplash, setShowSplash] = React.useState(() => {
    // Show splash screen on first load in standalone mode
    if (typeof window !== 'undefined') {
      const hasShown = sessionStorage.getItem('splash-shown');
      return isStandalone && !hasShown;
    }
    return false;
  });

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Start keep-alive when user is authenticated to prevent backend cold starts
  // during active sessions (important for watchlist, watch history operations)
  React.useEffect(() => {
    if (isAuthenticated) {
      startBackendKeepAlive(10 * 60 * 1000); // Ping every 10 minutes
    } else {
      stopBackendKeepAlive();
    }
    
    return () => {
      stopBackendKeepAlive();
    };
  }, [isAuthenticated]);

  const handleSplashComplete = React.useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem('splash-shown', 'true');
  }, []);

  // Show splash screen for PWA
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} minDuration={1500} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img src={logo} alt="KANIFLIX" className="h-12 md:h-16 mx-auto mb-6" />
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <AnimatePresence mode="wait">
          <AppRouter />
        </AnimatePresence>
        {/* PWA Components */}
        <PWANotifications />
        <InstallPrompt />
      </AuthInitializer>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
