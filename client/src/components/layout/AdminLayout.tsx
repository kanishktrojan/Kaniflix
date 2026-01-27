import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Menu,
  X,
  Trophy,
  Settings,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/utils';
import { useAuthStore } from '@/store';
import logo from '@/assets/kaniflix_logo.png';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/sports', label: 'Sports', icon: Trophy },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 260 }}
        className={cn(
          'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-surface-dark border-r border-white/5 z-30',
          'transition-all duration-300'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="KANIFLIX" className="h-6" />
            {!isCollapsed && (
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Admin
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/admin' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <Link
            to="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'text-text-secondary hover:text-white hover:bg-white/5'
            )}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Back to Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              'text-text-secondary hover:text-red-500 hover:bg-red-500/10'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-surface-dark border-b border-white/5 z-30 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="KANIFLIX" className="h-6" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            Admin
          </span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-surface-dark z-50 flex flex-col"
            >
              {/* Mobile Logo */}
              <div className="h-16 flex items-center px-4 border-b border-white/5">
                <Link to="/" className="flex items-center gap-2">
                  <img src={logo} alt="KANIFLIX" className="h-6" />
                  <span className="text-xs font-medium text-primary uppercase tracking-wider">
                    Admin
                  </span>
                </Link>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href ||
                    (item.href !== '/admin' && location.pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-text-secondary hover:text-white hover:bg-white/5'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Bottom */}
              <div className="p-4 border-t border-white/5 space-y-2">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5"
                >
                  <Home className="w-5 h-5" />
                  <span className="text-sm font-medium">Back to Site</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 min-h-screen transition-all duration-300',
          'pt-16 lg:pt-0',
          isCollapsed ? 'lg:ml-20' : 'lg:ml-[260px]'
        )}
      >
        {/* Top Bar */}
        <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-white/5 bg-surface-dark/50 backdrop-blur-sm sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {navItems.find((item) => 
                item.href === location.pathname || 
                (item.href !== '/admin' && location.pathname.startsWith(item.href))
              )?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
                <p className="text-xs text-text-secondary">{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
