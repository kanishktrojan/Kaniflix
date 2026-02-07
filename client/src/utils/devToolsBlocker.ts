/**
 * DevTools Blocker Utility
 * Prevents users from opening browser Developer Tools
 * and closes/redirects the page if they manage to open it.
 *
 * - Keyboard shortcuts & context menu are blocked immediately.
 * - Detection probes start only after a grace period (GRACE_MS) so that
 *   a user who previously got blocked can revisit the site on a fresh
 *   page load without being instantly kicked out again (browsers often
 *   remember that DevTools was open).
 * - Detection requires CONSECUTIVE_HITS consecutive positive signals
 *   before acting, which eliminates false-positive one-off triggers.
 */

const REDIRECT_URL = 'about:blank';

/** Seconds to wait after page load before activating detection probes */
const GRACE_MS = 4000;

/**
 * How many consecutive positive detection signals are required before
 * the page is closed.  This prevents a single false-positive (e.g. a
 * resize glitch) from killing the session.
 */
const CONSECUTIVE_HITS_NEEDED = 3;

/** Running counter – reset to 0 whenever a probe comes back clean */
let consecutiveHits = 0;

/** Whether detection probes are active */
let detectionActive = false;

/** Set to true once we've already triggered – avoids double-firing */
let alreadyTriggered = false;

// ── Keyboard / context-menu blocking (runs immediately) ─────────────

/**
 * Block keyboard shortcuts that open DevTools
 */
function blockDevToolsShortcuts() {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I (Inspect) / Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+J (Console) / Cmd+Option+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+C (Element picker) / Cmd+Option+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U (View Source) / Cmd+U
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+U (View Source variant)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true); // Use capture phase
}

/**
 * Block right-click context menu
 */
function blockContextMenu() {
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, true);
}

// ── Detection helpers (started after grace period) ──────────────────

/** Record one positive detection signal */
function recordHit() {
  if (alreadyTriggered || !detectionActive) return;
  consecutiveHits++;
  if (consecutiveHits >= CONSECUTIVE_HITS_NEEDED) {
    handleDevToolsDetected();
  }
}

/** Reset the counter when a probe comes back clean */
function recordClean() {
  consecutiveHits = 0;
}

/**
 * Detect DevTools via window size difference (docked DevTools).
 * When DevTools is docked, outerWidth/outerHeight differs significantly
 * from innerWidth/innerHeight.
 */
function detectDevToolsBySize() {
  const threshold = 200; // pixels – generous to avoid false positives

  const check = () => {
    if (!detectionActive || alreadyTriggered) return;

    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      recordHit();
    } else {
      recordClean();
    }
  };

  setInterval(check, 1000);
  window.addEventListener('resize', check);
}

/**
 * Detect DevTools via debugger timing.
 * The debugger statement causes a significant delay when DevTools is open.
 */
function detectDevToolsByDebugger() {
  const check = () => {
    if (!detectionActive || alreadyTriggered) return;

    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();

    if (end - start > 100) {
      recordHit();
    } else {
      recordClean();
    }
  };

  setInterval(check, 2000);
}

/**
 * Detect DevTools via console property access.
 * A getter on a logged object is invoked only when the console is rendering.
 */
function detectDevToolsByConsole() {
  const element = new Image();
  let devToolsOpen = false;

  Object.defineProperty(element, 'id', {
    get: () => {
      devToolsOpen = true;
      return '';
    },
  });

  setInterval(() => {
    if (!detectionActive || alreadyTriggered) return;
    devToolsOpen = false;
    console.log('%c', element as any);
    if (devToolsOpen) {
      recordHit();
    } else {
      recordClean();
    }
  }, 2000);
}

// ── Response ────────────────────────────────────────────────────────

/**
 * Handle DevTools detection – close / redirect the page.
 * No overlay is shown (overlays can be removed via DevTools).
 */
function handleDevToolsDetected() {
  if (alreadyTriggered) return;
  alreadyTriggered = true;

  // Clear the page content
  document.documentElement.innerHTML = '';

  // Try to close the window
  window.close();

  // If window.close() doesn't work (most browsers block it for
  // non-popup windows), redirect to a blank page.
  setTimeout(() => {
    window.location.href = REDIRECT_URL;
  }, 100);

  // Final fallback – overwrite the document
  try {
    document.write('');
    document.close();
  } catch {
    // Ignore errors
  }
}

/**
 * Disable console methods to prevent inspection.
 */
function disableConsole() {
  const noop = () => {};

  if (import.meta.env.PROD) {
    Object.keys(console).forEach((key) => {
      (console as any)[key] = noop;
    });
  }
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Initialize all DevTools blocking mechanisms.
 * Only activates in production mode.
 *
 * - Shortcuts & context-menu blocking start immediately.
 * - Detection probes start after a grace period so that a returning
 *   user (who may have had DevTools open last time) is not instantly
 *   blocked on a fresh page load.
 */
export function initDevToolsBlocker() {
  if (!import.meta.env.PROD) {
    console.log('[DevTools Blocker] Disabled in development mode');
    return;
  }

  // Immediate blocking (no grace period needed)
  blockDevToolsShortcuts();
  blockContextMenu();
  disableConsole();

  // Start detection probes only after the grace period.
  // This gives the browser time to settle and lets a returning user
  // load the page normally even if DevTools was previously remembered.
  setTimeout(() => {
    detectionActive = true;

    detectDevToolsBySize();
    detectDevToolsByDebugger();
    detectDevToolsByConsole();
  }, GRACE_MS);
}
