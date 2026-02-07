/**
 * DevTools Blocker Utility
 * Prevents users from opening browser Developer Tools
 * and redirects the current tab to about:blank if they manage to open it.
 * 
 * NOTE: This only kills the current tab. The user can open a new tab
 * and access the website normally — no persistent blocking.
 */

// Guard so we only fire the redirect once per tab
let alreadyTriggered = false;

/**
 * Block keyboard shortcuts that open DevTools
 * Exception: Ctrl+'+' / Ctrl+'-' (zoom) are explicitly allowed
 */
function blockDevToolsShortcuts() {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // ALLOW zoom shortcuts: Ctrl/Cmd + '+' / '-' / '=' / '0'
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0'
          || e.code === 'Equal' || e.code === 'Minus' || e.code === 'Digit0'
          || e.code === 'NumpadAdd' || e.code === 'NumpadSubtract') {
        return; // Let zoom through
      }
    }

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

/**
 * Detect DevTools via window size difference (docked DevTools)
 * When DevTools is docked, outerWidth/outerHeight differs significantly from innerWidth/innerHeight
 */
function detectDevToolsBySize() {
  const threshold = 160; // pixels

  const check = () => {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      handleDevToolsDetected();
    }
  };

  // Check periodically
  setInterval(check, 1000);
  window.addEventListener('resize', check);
}

/**
 * Detect DevTools via debugger timing
 * The debugger statement causes a significant delay when DevTools is open
 */
function detectDevToolsByDebugger() {
  const check = () => {
    const start = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    const end = performance.now();

    // If the debugger statement took more than 100ms, DevTools is likely open
    if (end - start > 100) {
      handleDevToolsDetected();
    }
  };

  setInterval(check, 2000);
}

/**
 * Detect DevTools via console property access
 * Overriding toString on objects logged to console triggers when DevTools is open
 */
function detectDevToolsByConsole() {
  const element = new Image();
  let devToolsOpen = false;

  Object.defineProperty(element, 'id', {
    get: () => {
      devToolsOpen = true;
      handleDevToolsDetected();
      return '';
    },
  });

  setInterval(() => {
    devToolsOpen = false;
    console.log('%c', element as any);
    if (devToolsOpen) {
      handleDevToolsDetected();
    }
  }, 2000);
}

/**
 * Handle DevTools detection — kill this tab only.
 * No localStorage / sessionStorage / cookies are written,
 * so opening a new tab works perfectly fine.
 */
function handleDevToolsDetected() {
  // Only run once per tab to avoid loops
  if (alreadyTriggered) return;
  alreadyTriggered = true;

  // Replace current history entry so the back button can't return here
  // then navigate to about:blank — affects only this tab
  try {
    window.location.replace('about:blank');
  } catch {
    // Fallback: hard redirect
    window.location.href = 'about:blank';
  }
}

/**
 * Disable console methods to prevent inspection
 */
function disableConsole() {
  const noop = () => {};

  // Only disable in production
  if (import.meta.env.PROD) {
    Object.keys(console).forEach((key) => {
      (console as any)[key] = noop;
    });
  }
}

/**
 * Initialize all DevTools blocking mechanisms
 * Only activates in production mode
 */
export function initDevToolsBlocker() {
  // Only block in production
  if (!import.meta.env.PROD) {
    console.log('[DevTools Blocker] Disabled in development mode');
    return;
  }

  blockDevToolsShortcuts();
  blockContextMenu();
  detectDevToolsBySize();
  detectDevToolsByDebugger();
  detectDevToolsByConsole();
  disableConsole();
}
