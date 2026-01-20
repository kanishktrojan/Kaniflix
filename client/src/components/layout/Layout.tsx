import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { cn } from '@/utils';
import { useIsMobile, useIsTablet } from '@/hooks';
import { useStandaloneMode } from '@/hooks/usePWA';
import logo from '@/assets/kaniflix_logo.png';

interface LayoutProps {
  children?: React.ReactNode;
  showFooter?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showFooter = true,
  className,
}) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isStandalone = useStandaloneMode();
  const isMobileOrTablet = isMobile || isTablet;
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  
  // Don't show footer on certain pages
  const hideFooterPaths = ['/watch', '/login', '/signup'];
  const shouldShowFooter = showFooter && !hideFooterPaths.some(path => 
    location.pathname.startsWith(path)
  );

  // Hide navbar on watch page
  const hideNavbarPaths = ['/watch'];
  const shouldShowNavbar = !hideNavbarPaths.some(path => 
    location.pathname.startsWith(path)
  );

  // Pages where hero extends behind navbar (no padding)
  // Only homepage has content extending behind navbar
  const isHomePage = location.pathname === '/';
  const isDetailPage = location.pathname.startsWith('/movie/') || location.pathname.startsWith('/tv/');
  // All pages except home should have padding; detail pages handle their own hero overlap
  const shouldHavePadding = !isHomePage && !isDetailPage;

  // Hide bottom nav on certain pages
  const hideBottomNavPaths = ['/watch', '/login', '/signup', '/admin'];
  const shouldShowBottomNav = !hideBottomNavPaths.some(path => 
    location.pathname.startsWith(path)
  );

  return (
    <div className={cn(
      'min-h-screen flex flex-col bg-background text-text',
      // Add safe area padding for standalone PWA mode
      isStandalone && 'pt-safe-top'
    )}>
      {shouldShowNavbar && <Navbar />}
      
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          'flex-1',
          shouldShowNavbar && shouldHavePadding && 'pt-16 md:pt-[68px]',
          // Add bottom padding for mobile bottom nav
          isMobileOrTablet && shouldShowBottomNav && 'pb-20',
          className
        )}
      >
        {children || <Outlet />}
      </motion.main>

      {shouldShowFooter && <Footer />}
      
      {/* Mobile bottom navigation - only on mobile/tablet */}
      {shouldShowBottomNav && <MobileBottomNav />}
    </div>
  );
};

// Auth Layout - minimal layout for auth pages
interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 -z-10"
        style={{
          backgroundImage: 'url(/auth-background.jpg)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/50 -z-10" />

      {/* Header */}
      <header className="px-4 md:px-12 py-6">
        <a href="/" className="inline-block">
          <img src={logo} alt="KANIFLIX" className="h-8 md:h-10" />
        </a>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-12 py-8 text-center text-text-muted text-sm">
        <p>&copy; {new Date().getFullYear()} KANIFLIX. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;
