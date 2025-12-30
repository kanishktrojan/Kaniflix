/**
 * Client-side Ad Blocker Utility
 * Blocks ads, popups, and malicious redirects from embedded players
 */

// Known ad/malicious domains to block
const BLOCKED_DOMAINS = [
  // Streaming ad redirects (most common)
  'rg403.com',
  'rg401.com',
  'rg402.com',
  'rg404.com',
  'rg405.com',
  'tmll7.com',
  'tmll1.com',
  'tmll2.com',
  'tmll3.com',
  'tmll4.com',
  'tmll5.com',
  'tmll6.com',
  'rgvqcsxqge.com',
  'hdmovieswatch.com',
  'movieswatch.com',
  'watchmovies.com',
  'streamwatch.com',
  'freestreams.com',
  'watchfree.com',
  'torrentgalaxy.to',
  '1337x.to',
  'yts.mx',
  'fmovies.to',
  '123movies',
  'putlocker',
  'gomovies',
  'solarmovie',
  
  // Common ad networks
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'pagead2.googlesyndication.com',
  'adnxs.com',
  'adsrvr.org',
  'adcolony.com',
  'admob.com',
  'mopub.com',
  'unity3d.com',
  'unityads.unity3d.com',
  'facebook.com/tr',
  'connect.facebook.net',
  
  // Streaming site ads
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'exoclick.com',
  'exosrv.com',
  'juicyads.com',
  'trafficjunky.com',
  'traffichaus.com',
  'revcontent.com',
  'mgid.com',
  'outbrain.com',
  'taboola.com',
  'zeroredirect.com',
  'adf.ly',
  'sh.st',
  'bc.vc',
  'linkshrink.net',
  'adcash.com',
  'clickadu.com',
  'hilltopads.net',
  'pushground.com',
  'richpush.co',
  'megapush.io',
  'pushengage.com',
  'onesignal.com',
  'pushcrew.com',
  'subscribers.com',
  'sendpulse.com',
  'pushwoosh.com',
  'webpushr.com',
  
  // Malicious/Scam domains
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  't.co',
  'is.gd',
  'buff.ly',
  'adfoc.us',
  'linkshrink.net',
  'festyy.com',
  'datoporn.com',
  'onclickmax.com',
  'clicksgear.com',
  'clicksfly.com',
  'shrinkme.io',
  'uiz.io',
  'exe.io',
  'fc.lc',
  'za.gl',
  'zee.gl',
  
  // Pop-under networks
  'propellerclick.com',
  'popmyads.com',
  'popunder.net',
  'popundertotal.com',
  'clickoclick.com',
  
  // Crypto miners
  'coinhive.com',
  'coin-hive.com',
  'coinhave.com',
  'crypto-loot.com',
  'cryptoloot.pro',
  'webmine.pro',
  'webminepool.com',
  
  // Tracking
  'scorecardresearch.com',
  'quantserve.com',
  'pixel.quantserve.com',
  'bluekai.com',
  'krxd.net',
  'adroll.com',
  'criteo.com',
  'criteo.net',
  
  // Streaming specific
  'streaming-ads.com',
  'vidcloud-ads.com',
  'player-ads.com',
  'vidstream-ads.com',
  'streamads.net',
  'videoads.net',
  
  // Additional malicious redirects
  'newredirect.com',
  'redirecting.com',
  'adredirect.com',
  'clicktracker.com',
  'clicktrack.com',
  'adtracker.com',
  'tracker.com',
  '.xyz',
  '.top',
  '.click',
  '.link',
  '.win',
  '.loan',
  '.racing',
  '.download',
  '.stream',
  '.gdn',
  '.icu',
  '.buzz',
  'a]d[s',
];

// Additional pattern-based blocking for random domains like rg403
const BLOCKED_DOMAIN_PATTERNS = [
  /^rg\d+\.com$/i,           // rg401.com, rg402.com, rg403.com, etc.  /^tmll\\d+\\.com$/i,         // tmll1.com, tmll7.com, etc.  /^[a-z]{2,4}\d{2,4}\./i,   // Random letter+number domains
  /^\d+[a-z]+\./i,           // Number+letter domains  
  /\.xyz$/i,                  // .xyz TLD
  /\.top$/i,                  // .top TLD
  /\.click$/i,                // .click TLD
  /\.link$/i,                 // .link TLD (unless legitimate)
  /\.icu$/i,                  // .icu TLD
  /\.buzz$/i,                 // .buzz TLD
];

// Patterns to detect ad-related URLs
const AD_URL_PATTERNS = [
  /\/ads?\//i,
  /\/advert/i,
  /\/banner/i,
  /\/popup/i,
  /\/popunder/i,
  /\/sponsored/i,
  /\/affiliate/i,
  /\/tracking/i,
  /\/pixel/i,
  /\/beacon/i,
  /click\.php/i,
  /redirect\.php/i,
  /out\.php/i,
  /go\.php/i,
  /track\.php/i,
  /\/monetiz/i,
  /\/promo/i,
  /interstitial/i,
  /preroll/i,
  /midroll/i,
  /postroll/i,
];

// Check if URL is an ad/blocked
const isBlockedUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check blocked domains
    for (const domain of BLOCKED_DOMAINS) {
      if (hostname.includes(domain)) {
        return true;
      }
    }
    
    // Check blocked domain patterns (like rg403.com)
    for (const pattern of BLOCKED_DOMAIN_PATTERNS) {
      if (pattern.test(hostname)) {
        return true;
      }
    }
    
    // Check URL patterns
    for (const pattern of AD_URL_PATTERNS) {
      if (pattern.test(url)) {
        return true;
      }
    }
    
    // Block if URL is not our domain or known good domains
    const allowedDomains = ['vidrock.net', 'image.tmdb.org', 'tmdb.org', 'localhost', '127.0.0.1'];
    const isAllowed = allowedDomains.some(d => hostname.includes(d));
    
    // If it's trying to open a new page and it's not in our allowed list, block it
    if (!isAllowed && !hostname.includes(window.location.hostname)) {
      return true;
    }
    
    return false;
  } catch {
    // If URL parsing fails, it's suspicious - block it
    return true;
  }
};

// Store original functions
let originalWindowOpen: typeof window.open | null = null;
let originalCreateElement: typeof document.createElement | null = null;

// Blocked count for debugging
let blockedCount = 0;

/**
 * Initialize the ad blocker
 * Call this once when the app starts
 */
export const initAdBlocker = (): void => {
  if (typeof window === 'undefined') return;
  
  console.log('[AdBlocker] Initializing client-side ad blocker...');
  
  // Block window.open popups
  if (!originalWindowOpen) {
    originalWindowOpen = window.open;
    window.open = function(url?: string | URL, target?: string, features?: string) {
      const urlString = url?.toString() || '';
      
      // Block if no URL, blocked URL, or suspicious target
      if (!urlString || isBlockedUrl(urlString) || target === '_blank') {
        blockedCount++;
        console.log(`[AdBlocker] Blocked popup: ${urlString || 'empty URL'}`);
        return null;
      }
      
      // Allow legitimate navigations
      return originalWindowOpen!.call(window, url, target, features);
    };
  }
  
  // Block dynamic script/iframe injection
  if (!originalCreateElement) {
    originalCreateElement = document.createElement.bind(document);
    document.createElement = function(tagName: string, options?: ElementCreationOptions) {
      const element = originalCreateElement!(tagName, options);
      
      if (tagName.toLowerCase() === 'script' || tagName.toLowerCase() === 'iframe') {
        // Intercept src attribute setting
        const originalSetAttribute = element.setAttribute.bind(element);
        element.setAttribute = function(name: string, value: string) {
          if (name === 'src' && isBlockedUrl(value)) {
            blockedCount++;
            console.log(`[AdBlocker] Blocked ${tagName} injection: ${value}`);
            return;
          }
          return originalSetAttribute(name, value);
        };
        
        // Also intercept direct src assignment
        Object.defineProperty(element, 'src', {
          set: function(value: string) {
            if (isBlockedUrl(value)) {
              blockedCount++;
              console.log(`[AdBlocker] Blocked ${tagName} src: ${value}`);
              return;
            }
            originalSetAttribute('src', value);
          },
          get: function() {
            return element.getAttribute('src');
          }
        });
      }
      
      return element;
    };
  }
  
  // Block beforeunload hijacking (prevents "are you sure" popups)
  window.addEventListener('beforeunload', (e) => {
    // Don't let ads prevent navigation
    delete e.returnValue;
  }, true);
  
  // Block visibility change tracking
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    // Block visibility tracking often used by ads
    if (type === 'visibilitychange' && this === document) {
      // Allow only trusted listeners (check stack trace)
      const stack = new Error().stack || '';
      if (stack.includes('vidrock') || stack.includes('embed') || stack.includes('player')) {
        // Allow player visibility tracking for pause/play
        return originalAddEventListener.call(this, type, listener, options);
      }
      // Block potential ad visibility tracking
      console.log('[AdBlocker] Blocked visibility tracking');
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  console.log('[AdBlocker] Ad blocker initialized successfully');
};

/**
 * Block ads in iframe using CSS injection
 * This creates a style element that hides common ad elements
 */
export const getAdBlockStyles = (): string => {
  return `
    /* Hide common ad containers */
    [class*="ad-"],
    [class*="ads-"],
    [class*="advert"],
    [class*="sponsor"],
    [class*="banner"],
    [class*="popup"],
    [id*="ad-"],
    [id*="ads-"],
    [id*="advert"],
    [id*="sponsor"],
    [id*="banner"],
    [id*="popup"],
    .ad-container,
    .ad-wrapper,
    .ad-overlay,
    .video-ad,
    .preroll-ad,
    .midroll-ad,
    .overlay-ad,
    .skip-ad,
    #player-advertising,
    .advertising,
    .adsbygoogle,
    ins.adsbygoogle,
    [data-ad],
    [data-ad-slot],
    [data-ad-client],
    iframe[src*="ad"],
    iframe[src*="sponsor"],
    iframe[src*="promo"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      position: absolute !important;
      left: -9999px !important;
    }
  `;
};

/**
 * Get blocked count for stats
 */
export const getBlockedCount = (): number => blockedCount;

/**
 * Reset blocked count
 */
export const resetBlockedCount = (): void => {
  blockedCount = 0;
};

/**
 * Cleanup function to restore original functions
 */
export const cleanupAdBlocker = (): void => {
  if (originalWindowOpen) {
    window.open = originalWindowOpen;
    originalWindowOpen = null;
  }
  if (originalCreateElement) {
    document.createElement = originalCreateElement;
    originalCreateElement = null;
  }
  console.log('[AdBlocker] Ad blocker cleaned up');
};

export default {
  initAdBlocker,
  getAdBlockStyles,
  getBlockedCount,
  resetBlockedCount,
  cleanupAdBlocker,
};
