/* BATCO v76 fast navigation: opt-in shell warm-up, no inventory data caching. */
(() => {
  'use strict';
  if (window.__BATCO_FAST_NAV) return;
  const ROUTES = new Set([
    'index.html','customer.html','admin-home.html','admin-dashboard.html',
    'control-center.html','admin-stocktake-shell.html','admin-stocktake.html',
    'stocktake.html','stocktake-accountant.html','accountant-stocktake.html',
    'inventory-analytics.html','image-distribution.html','admin-inventory-import.html',
    'health-center.html','security-center.html','identities.html','command-center.html',
    'admin-feedback.html','admin-image-export.html'
  ]);
  const getPath = (input) => {
    try {
      const u = new URL(input, location.href);
      if (u.origin !== location.origin || !/^https?:$/.test(u.protocol)) return '';
      const name = u.pathname.split('/').pop() || 'index.html';
      return ROUTES.has(name) ? u.pathname : '';
    } catch { return ''; }
  };
  const isAdmin = () => {
    try {
      return localStorage.getItem('inventory_user_name_v2') === 'مهند'
        && !!localStorage.getItem('inventory_admin_token_v2');
    } catch { return false; }
  };
  const ownPath = getPath(location.href);
  let registered = false;
  let curtain;
  const queued = new Set();
  const sent = new Set();
  const SW_SCRIPT = './sw.js';
  const warm = (input) => {
    const path = getPath(input);
    if (!path || path === ownPath || sent.has(path)) return;
    queued.add(path);
    flush();
  };
  const flush = () => {
    if (!navigator.serviceWorker?.controller || queued.size === 0) return;
    const batch = [...queued].slice(0, 3);
    for (const path of batch) { queued.delete(path); sent.add(path); }
    navigator.serviceWorker.controller.postMessage({ type:'BATCO_PREFETCH_SHELL', paths:batch });
  };
  const register = async () => {
    if (registered || !('serviceWorker' in navigator)
      || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
    registered = true;
    try {
      await navigator.serviceWorker.register(SW_SCRIPT, { updateViaCache:'none' });
      flush();
      navigator.serviceWorker.ready.then(flush).catch(() => {});
    } catch (error) {
      console.warn('[BATCO navigation] Offline shell registration unavailable', error);
    }
  };
  const showTransition = () => {
    if (curtain || document.visibilityState === 'hidden') return;
    curtain = document.createElement('div');
    curtain.id = 'batco-navigation-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.style.cssText = [
      'position:fixed','inset:0','z-index:2147483646',
      'background:#fff','display:flex','align-items:center','justify-content:center',
      'pointer-events:none','opacity:1'
    ].join(';');
    const img = document.createElement('img');
    img.src = './assets/batco-logo.svg?v=72.0';
    img.alt = '';
    img.width = 900;
    img.height = 353;
    img.style.cssText = 'width:min(43vw,178px);height:auto;max-width:178px;object-fit:contain;';
    curtain.appendChild(img);
    document.body.appendChild(curtain);
  };
  const removeTransition = () => { curtain?.remove(); curtain = null; };
  const hrefOfLink = (event) => {
    const a = event.target?.closest?.('a[href]');
    if (!a || a.target && a.target !== '_self' || a.hasAttribute('download')) return '';
    return getPath(a.href);
  };
  // Warm the likely next page on contact, including iPhone taps; do not intercept navigation.
  document.addEventListener('pointerover', e => { const p = hrefOfLink(e); if (p) warm(p); }, {passive:true});
  document.addEventListener('touchstart', e => { const p = hrefOfLink(e); if (p) warm(p); }, {passive:true});
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const p = hrefOfLink(e);
    if (!p || p === ownPath) return;
    // Delay one task so another handler can cancel this action before showing anything.
    setTimeout(() => { if (!e.defaultPrevented) showTransition(); }, 0);
  }, true);
  window.addEventListener('pageshow', removeTransition);
  window.addEventListener('pagehide', removeTransition);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') removeTransition();
  });
  const prime = () => {
    const current = location.pathname.split('/').pop() || 'index.html';
    if (isAdmin()) {
      if (current === 'admin-dashboard.html') {
        warm('./admin-home.html'); warm('./control-center.html');
      } else if (current === 'admin-home.html') {
        warm('./admin-dashboard.html?section=employees&module=live');
        warm('./admin-stocktake-shell.html');
      } else if (current.includes('stocktake')) {
        warm('./admin-dashboard.html?section=employees&module=live');
      } else {
        warm('./admin-home.html');
      }
    } else if (current === 'index.html') {
      warm('./customer.html');
    }
    document.querySelectorAll('a[href]').forEach(a => {
      if (sent.size + queued.size < 3) warm(a.href);
    });
  };
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 850));
  idle(() => {
    register().then(() => { setTimeout(prime, 150); }).catch(() => {});
  });
  window.__BATCO_FAST_NAV = { version:'76.0', warm, register };
})();