import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register service worker for PWA
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      console.log('[PWA] Service worker registered:', registration.scope);
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
      
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  }
};

// Initialize PWA features
const initPWA = () => {
  // Register service worker
  registerServiceWorker();
  
  // Handle display mode changes
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    console.log('[PWA] Display mode changed:', e.matches ? 'standalone' : 'browser');
  });
  
  // Prevent default pull-to-refresh on mobile (we handle it ourselves)
  document.body.style.overscrollBehavior = 'none';
  
  // Update CSS custom properties for safe areas
  const updateSafeAreas = () => {
    const root = document.documentElement;
    root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top)');
    root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left)');
    root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right)');
  };
  
  updateSafeAreas();
  window.addEventListener('resize', updateSafeAreas);
  window.addEventListener('orientationchange', updateSafeAreas);
};

// Initialize PWA on load
if (typeof window !== 'undefined') {
  initPWA();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
