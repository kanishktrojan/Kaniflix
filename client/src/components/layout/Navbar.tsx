import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, X, User, Settings } from 'lucide-react';
import { cn } from '@/utils';
import { useAuthStore } from '@/store';
import { useScrollPosition, useDebounce } from '@/hooks';
import logo from '@/assets/kaniflix_logo.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/movies', label: 'Movies' },
  { href: '/tv', label: 'TV Shows' },
  { href: '/sports', label: 'Sports' },
  { href: '/my-list', label: 'My List' },
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollPosition = useScrollPosition();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const isScrolled = scrollPosition > 10;

  // Handle search
  useEffect(() => {
    if (debouncedSearch) {
      navigate(`/search?q=${encodeURIComponent(debouncedSearch)}`);
    }
  }, [debouncedSearch, navigate]);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-navbar transition-all duration-500',
        isScrolled 
          ? 'bg-background/95 backdrop-blur-md shadow-lg' 
          : 'bg-gradient-to-b from-black/90 via-black/60 to-transparent'
      )}
    >
      <nav className="flex items-center justify-between h-16 md:h-[68px] px-4 md:px-12 lg:px-16">
        {/* Left Section */}
        <div className="flex items-center gap-4 md:gap-10">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="KANIFLIX" className="h-6 md:h-8" />
          </Link>

          {/* Desktop Navigation - Netflix style */}
          <ul className="hidden lg:flex items-center gap-5">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={cn(
                    'text-[14px] font-normal transition-colors hover:text-text-secondary',
                    location.pathname === link.href
                      ? 'text-white font-medium'
                      : 'text-[#e5e5e5]'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Browse Dropdown */}
          <div className="lg:hidden relative">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-1 text-sm font-medium py-2 px-1"
            >
              Browse
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                isMobileMenuOpen && 'rotate-180'
              )} />
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 md:gap-5">
          {/* Search - Netflix style */}
          <div className="relative flex items-center">
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="absolute right-0 flex items-center bg-black/90 border border-white focus:border-white"
                  style={{ transformOrigin: 'right' }}
                >
                  <Search className="w-4 h-4 ml-3 text-white/70" />
                  <input
                    type="text"
                    placeholder="Titles, people, genres"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    className="w-[200px] md:w-[280px] bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40 border-none outline-none ring-0 focus:border-none focus:outline-none focus:ring-0"
                    style={{ boxShadow: 'none' }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-2 hover:bg-white/10 mr-1"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => {
                if (isSearchOpen && !searchQuery) {
                  setIsSearchOpen(false);
                } else if (!isSearchOpen) {
                  setIsSearchOpen(true);
                }
              }}
              className="p-1.5 hover:text-text-secondary transition-colors relative z-10"
            >
              {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Notifications */}
          {isAuthenticated && (
            <button className="p-1.5 hover:text-text-secondary transition-colors hidden md:block relative">
              <Bell className="w-5 h-5" />
            </button>
          )}

          {/* Profile / Auth */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 group"
              >
                <div className="w-8 h-8 rounded overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                      <span className="text-sm font-medium">{user?.username?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <ChevronDown className={cn(
                  'w-4 h-4 transition-transform hidden md:block group-hover:rotate-180',
                  isProfileMenuOpen && 'rotate-180'
                )} />
              </button>

              {/* Profile Dropdown - Netflix style */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsProfileMenuOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-52 py-2 bg-black/95 border border-white/10 z-50"
                      style={{ top: '100%' }}
                    >
                      {/* Arrow */}
                      <div className="absolute -top-2 right-5 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white/90" />
                      
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="font-medium text-white">{user?.username}</p>
                        <p className="text-xs text-white/60">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        Manage Profiles
                      </Link>
                      <Link
                        to="/my-list"
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Account
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-primary hover:text-primary-hover hover:bg-white/5 transition-colors"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-white/10 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-[13px] text-white/80 hover:text-white transition-colors"
                        >
                          Sign out of KANIFLIX
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded hover:bg-primary-hover transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile Menu - Netflix style dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden absolute left-4 top-full mt-1 bg-black/95 border border-white/10 z-50"
            >
              {/* Arrow */}
              <div className="absolute -top-2 left-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white/90" />
              
              <ul className="py-2 min-w-[200px]">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className={cn(
                        'block px-6 py-2.5 text-center text-[13px] hover:bg-white/5 transition-colors',
                        location.pathname === link.href
                          ? 'text-white font-medium'
                          : 'text-white/70'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
