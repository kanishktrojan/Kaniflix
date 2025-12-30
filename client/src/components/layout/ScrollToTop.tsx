import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component - scrolls to top on route change
 * This should be placed inside the Router but outside of Routes
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant', // Use instant to avoid scroll animation conflicts
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
