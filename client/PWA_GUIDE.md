# KANIFLIX PWA Implementation Guide

## Overview

KANIFLIX has been converted to a Progressive Web App (PWA) with native mobile app-like features. This guide documents all the features implemented and how to use them.

## Features Implemented

### 1. PWA Core Features

#### Manifest (`public/manifest.json`)
- App name and short name
- Theme colors (#E50914 primary, #141414 background)
- Display mode: standalone (fullscreen without browser UI)
- Multiple icon sizes for different devices
- App shortcuts for quick actions
- Screenshot references for install UI

#### Service Worker (`public/sw.js`)
- **Offline Support**: Caches essential resources for offline viewing
- **Smart Caching Strategies**:
  - Cache-first for static assets (JS, CSS, fonts)
  - Cache-first with background refresh for images
  - Network-first for API requests
  - Network-first with offline fallback for HTML pages
- **Background Sync**: Ready for syncing watchlist and watch history
- **Push Notifications**: Ready for content updates

#### Offline Page (`public/offline.html`)
- Beautiful offline fallback page
- Auto-reload when connection is restored

### 2. Mobile App-Like UI

#### Bottom Navigation (`MobileBottomNav.tsx`)
- Only visible on mobile/tablet (hidden on desktop)
- 5 tabs: Home, Search, Live, My List, Profile
- Active indicator with smooth animation
- Haptic feedback on tap
- Safe area support for notched devices

#### Hidden on Scroll
- Navbar hides when scrolling down on mobile
- Shows again when scrolling up
- Gives more screen real estate for content

### 3. PWA Hooks (`src/hooks/usePWA.ts`)

```typescript
// Install prompt management
const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

// Online/offline status
const isOnline = useOnlineStatus();

// Service worker updates
const { isUpdateAvailable, updateServiceWorker } = useServiceWorker();

// Haptic feedback
const { vibrate } = useHapticFeedback();
vibrate('light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error');

// Pull to refresh
const { pullDistance, isRefreshing, containerRef } = usePullToRefresh({ onRefresh });

// Swipe navigation
const { containerRef } = useSwipeNavigation({
  onSwipeLeft: () => {},
  onSwipeRight: () => {},
});

// Standalone mode detection
const isStandalone = useStandaloneMode();

// Mobile device detection
const isMobile = useIsMobileDevice();

// Safe area insets
const { top, bottom, left, right } = useSafeAreaInsets();
```

### 4. PWA Components

#### SplashScreen (`SplashScreen.tsx`)
- Shows on first load in standalone mode
- Animated logo and loading dots
- Minimum duration for smooth UX

#### InstallPrompt (`InstallPrompt.tsx`)
- Bottom sheet style prompt for mobile
- iOS-specific instructions
- Remembers dismissal for 7 days
- Feature highlights

#### PWANotifications (`PWANotifications.tsx`)
- Update available notification
- Offline indicator
- Online restored indicator

#### PullToRefresh (`PullToRefresh.tsx`)
- Pull-to-refresh indicator
- Container with pull transform

#### MobileCarousel (`MobileCarousel.tsx`)
- Touch-optimized horizontal scrolling
- Snap scrolling on mobile
- Desktop arrow navigation
- Scroll position indicators

### 5. CSS Enhancements

#### Safe Areas
```css
.pt-safe-top { padding-top: env(safe-area-inset-top); }
.pb-safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

#### Touch Targets
- All buttons minimum 44px height
- Touch-friendly spacing

#### Standalone Mode Styles
```css
@media (display-mode: standalone) {
  /* Adjustments for installed PWA */
}
```

#### Performance
- GPU-accelerated animations
- Lazy loading with content-visibility
- Smooth scrolling on iOS

### 6. Meta Tags (index.html)

- iOS PWA meta tags for standalone mode
- iOS splash screen references
- Android/Chrome theme color
- Windows tile configuration
- Viewport with viewport-fit=cover

## File Structure

```
client/
├── public/
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker
│   ├── offline.html          # Offline fallback
│   ├── icons/                # App icons (need to generate)
│   │   ├── README.md         # Icon generation guide
│   │   └── icon.svg          # Source icon
│   ├── splash/               # iOS splash screens (need to generate)
│   └── screenshots/          # App screenshots (optional)
├── src/
│   ├── hooks/
│   │   └── usePWA.ts         # PWA-specific hooks
│   ├── components/
│   │   ├── layout/
│   │   │   └── MobileBottomNav.tsx
│   │   └── ui/
│   │       ├── SplashScreen.tsx
│   │       ├── InstallPrompt.tsx
│   │       ├── PWANotifications.tsx
│   │       ├── PullToRefresh.tsx
│   │       └── MobileCarousel.tsx
│   ├── main.tsx              # Service worker registration
│   ├── App.tsx               # PWA component integration
│   └── index.css             # Mobile-specific styles
└── index.html                # PWA meta tags
```

## Testing the PWA

### Development
```bash
npm run dev
```
Note: Service worker only registers in production mode.

### Production Testing
```bash
npm run build
npm run preview
```

### Chrome DevTools
1. Open DevTools → Application tab
2. Check "Manifest" section for errors
3. Check "Service Workers" for registration status
4. Use "Lighthouse" for PWA audit

### Mobile Testing
1. Deploy to HTTPS server (required for PWA)
2. Open on mobile device
3. Look for "Add to Home Screen" prompt
4. Install and test standalone mode

## Generating Icons

Use the guide in `public/icons/README.md` or:

1. Create a 1024x1024 source icon
2. Use [PWA Builder](https://www.pwabuilder.com/imageGenerator)
3. Or use `sharp` npm package with the provided script

## Desktop vs Mobile

The PWA features are specifically designed to enhance mobile experience while leaving desktop unchanged:

| Feature | Mobile | Desktop |
|---------|--------|---------|
| Bottom Nav | ✅ | ❌ |
| Hidden Navbar on Scroll | ✅ | ❌ |
| Install Prompt | ✅ | ❌ |
| Pull to Refresh | ✅ | ❌ |
| Haptic Feedback | ✅ | ❌ |
| Safe Area Support | ✅ | N/A |
| Service Worker | ✅ | ✅ |
| Offline Support | ✅ | ✅ |

## Browser Support

- Chrome (Android) - Full support
- Safari (iOS) - Full support (requires Add to Home Screen)
- Firefox - Partial support
- Edge - Full support
- Samsung Internet - Full support

## Troubleshooting

### PWA not installing
- Ensure HTTPS is used
- Check manifest.json is valid
- Verify service worker is registered
- Check icon paths

### Service worker not updating
- Hard refresh: Ctrl+Shift+R
- Clear site data in DevTools
- Use "Skip waiting" in DevTools

### iOS-specific issues
- Splash screen not showing: Check media queries match device
- Status bar styling: Use `apple-mobile-web-app-status-bar-style`

## Future Enhancements

1. Push notifications for new content
2. Background sync for watchlist
3. Download for offline viewing
4. Share target API
5. Badging API for unread notifications
