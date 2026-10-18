/* Shared stocktake primitives. No database writes or permission changes. */
(function (global) {
  'use strict';
  const digits = '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹';
  function quantity(value) {
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? value : NaN;
    const raw = String(value ?? '').trim().replace(/[٠-٩۰-۹]/g, d => String(digits.indexOf(d) % 10)).replace(/٫/g, '.');
    // Blank, exponent, malformed separators and partial decimals are not zero.
    if (!/^(?:\d+|\d{1,3}(?:[,٬]\d{3})+)(?:\.\d+)?$/.test(raw)) return NaN;
    const number = Number(raw.replace(/[,٬]/g, ''));
    return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER ? number : NaN;
  }
  const difference = (actual, expected) => Number((actual - expected).toPrecision(15));
  function result(item) {
    const expected = quantity(item.expectedQty);
    if (!Number.isFinite(expected)) throw new Error(`كمية النظام غير صحيحة للصنف ${item.sku}`);
    if ((item.countStatus || 'pending') === 'pending') return { expected, actual: '', diff: '', status: 'pending' };
    const actual = quantity(item.actualQty);
    if (!Number.isFinite(actual)) throw new Error(`الكمية الفعلية غير صحيحة للصنف ${item.sku}`);
    const diff = difference(actual, expected);
    return { expected, actual, diff, status: Math.abs(diff) < 1e-9 ? 'matched' : diff < 0 ? 'shortage' : 'surplus' };
  }
  function drafts(scope) {
    const prefix = `stocktake.draft.v73:${scope}:`;
    return {
      get(id) { try { return JSON.parse(localStorage.getItem(prefix + id) || 'null'); } catch { return null; } },
      set(id, value) { try { localStorage.setItem(prefix + id, JSON.stringify(value)); return true; } catch { return false; } },
      remove(id) { try { localStorage.removeItem(prefix + id); } catch {} }
    };
  }
  // Preserve user-edited fields and focus across live snapshots, scoped to the selected campaign.
  function capture(root) {
    const fields = [...root.querySelectorAll('input,textarea,select')].filter(el => el.dataset.dirty === 'true' && el.type !== 'file');
    const key = el => el.id ? '#' + CSS.escape(el.id) : el.hasAttribute('data-accountant-member') ? `[data-accountant-member="${CSS.escape(el.dataset.accountantMember)}"]` : '';
    const active = document.activeElement;
    return { fields: fields.map(el => ({ key: key(el), value: el.value, checked: el.checked })), focus: root.contains(active) ? key(active) : '', start: active?.selectionStart, end: active?.selectionEnd,
      details: [...root.querySelectorAll('details[id]')].map(el => ({ id: el.id, open: el.open })) };
  }
  function restore(root, saved) {
    for (const f of saved.fields) { const el = f.key && root.querySelector(f.key); if (el) { el.value = f.value; el.checked = f.checked; el.dataset.dirty = 'true'; } }
    for (const f of saved.details) { const el = document.getElementById(f.id); if (el) el.open = f.open; }
    const el = saved.focus && root.querySelector(saved.focus);
    if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(saved.start, saved.end); } catch {} }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('input', e => { if (e.target.matches('input,textarea,select')) e.target.dataset.dirty = 'true'; });
    document.addEventListener('change', e => { if (e.target.matches('input,textarea,select')) e.target.dataset.dirty = 'true'; });
    // A backdrop tap must never discard a working form.
    document.addEventListener('click', e => { if (e.target.classList.contains('modalbg')) e.stopImmediatePropagation(); }, true);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const modal = document.querySelector('.modalbg.open .modal'); if (!modal) return;
      const nodes = [...modal.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(x => !x.disabled && x.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    });
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.modalbg .modal').forEach(el => { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); const h = el.querySelector('h3'); if (h) el.setAttribute('aria-label', h.textContent); });
      const toast = document.getElementById('toast'); if (toast) { toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite'); }
      if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
  global.StocktakeCore = { quantity, difference, result, drafts, capture, restore };
})(typeof window !== 'undefined' ? window : globalThis);
