import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, Download, User, Tv } from 'lucide-react';
import { cn } from '@/utils';
import { useAuthStore } from '@/store';
import { useHapticFeedback, useStandaloneMode } from '@/hooks/usePWA';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { path: '/search', label: 'Search', icon: <Search className="w-5 h-5" /> },
  { path: '/sports', label: 'Live', icon: <Tv className="w-5 h-5" /> },
  { path: '/my-list', label: 'My List', icon: <Download className="w-5 h-5" />, requiresAuth: true },
  { path: '/profile', label: 'Profile', icon: <User className="w-5 h-5" />, requiresAuth: true },
];

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { vibrate } = useHapticFeedback();
  const isStandalone = useStandaloneMode();

  // Hide on certain pages
  const hiddenPaths = ['/watch', '/login', '/signup', '/admin'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  // Filter items based on auth status
  const visibleItems = navItems.filter(item => {
    if (item.requiresAuth && !isAuthenticated) {
      // Show login for auth-required items when not authenticated
      if (item.path === '/profile') {
        return true; // Still show, will redirect to login
      }
      return item.path !== '/my-list'; // Hide my-list when not authenticated
    }
    return true;
  });

  const handleNavClick = () => {
    vibrate('selection');
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'md:hidden', // Only show on mobile/tablet
        'bg-background/95 backdrop-blur-lg',
        'border-t border-white/10',
        isStandalone ? 'pb-safe-bottom' : 'pb-2'
      )}
      style={{
        paddingBottom: isStandalone ? 'max(env(safe-area-inset-bottom), 8px)' : '8px',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          
          // Redirect to login if auth required and not authenticated
          const targetPath = item.requiresAuth && !isAuthenticated ? '/login' : item.path;

          return (
            <NavLink
              key={item.path}
              to={targetPath}
              onClick={handleNavClick}
              className={cn(
                'relative flex flex-col items-center justify-center',
                'min-w-[64px] min-h-[48px] px-3 py-1.5',
                'touch-target transition-all duration-200',
                'rounded-xl',
                isActive ? 'text-primary' : 'text-text-secondary'
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              
              {/* Icon with animation */}
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative z-10"
              >
                {item.icon}
              </motion.div>
              
              {/* Label */}
              <span className={cn(
                'text-[10px] mt-1 font-medium relative z-10',
                isActive ? 'text-primary' : 'text-text-secondary'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default MobileBottomNav;
