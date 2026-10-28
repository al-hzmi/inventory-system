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
  // A team's absolute count occupies its own field; different teams never overwrite it.
  const teamKey = id => 't' + Array.from(String(id)).map(c=>c.codePointAt(0).toString(16).padStart(6,'0')).join('');
  function teamCount(item, id) {
    const entry=item.teamCounts?.[teamKey(id)];
    if(entry)return quantity(entry.quantity);
    const legacy=item._aggregated?item._legacyActual:item.actualQty;
    return item.teamId===id && legacy!=null ? quantity(legacy) : NaN;
  }
  function aggregate(item) {
    if(!item.teamCounts)return {...item};
    if(item._aggregated)return {...item};
    const counts=Object.values(item.teamCounts).map(e=>quantity(e.quantity));
    if(item.actualQty!=null&&!Object.hasOwn(item.teamCounts,teamKey(item.teamId)))counts.push(quantity(item.actualQty));
    const sources=Object.values(item.teamCounts).filter(e=>e&&Number.isFinite(quantity(e.quantity)));
    const scopes=sources.map(e=>String(e.scope||'').trim().toLowerCase().replace(/\s+/g,' '));
    // Separate counters may contribute only from explicitly DIFFERENT physical areas.
    // The same or unspecified area risks counting the same cartons twice.
    const conflicting=sources.length>1&&(!scopes.every(Boolean)||new Set(scopes).size!==scopes.length);
    const actual=counts.reduce((sum,q)=>difference(sum+q,0),0),diff=difference(actual,quantity(item.expectedQty));
    return {...item,_aggregated:true,_legacyActual:item.actualQty,actualQty:actual,
      countConflict:conflicting,conflictEntries:conflicting?sources.map(e=>({teamId:e.teamId,teamName:e.teamName,scope:e.scope,quantity:e.quantity})):[],
      difference:conflicting?null:diff,
      countStatus:conflicting?'conflict':!counts.length?'pending':Math.abs(diff)<1e-9?'matched':diff<0?'shortage':'surplus'};
  }
  function contributionLabels(item,field){const entries=Object.values(item.teamCounts||{}),legacy=item._aggregated?item._legacyActual:item.actualQty;if(legacy!=null&&!item.teamCounts?.[teamKey(item.teamId)])entries.push({teamName:item.teamName||'',scope:item.scope||item.zone||''});return [...new Set(entries.map(e=>e[field]).filter(Boolean))].join('، ');}
  function forTeam(item,id){const total=aggregate(item),own=teamCount(item,id),entry=item.teamCounts?.[teamKey(id)];return {...total,_teamActual:own,_totalActual:total.actualQty, countStatus:Number.isFinite(own)?total.countStatus:'pending',lastCountOperationId:entry?.operationId||(item.teamId===id?item.lastCountOperationId:'')};}
  function result(item) {
    item = aggregate(item);
    const expected = quantity(item.expectedQty);
    if (!Number.isFinite(expected)) throw new Error(`كمية النظام غير صحيحة للصنف ${item.sku}`);
    if ((item.countStatus || 'pending') === 'pending') return { expected, actual: '', diff: '', status: 'pending' };
    if(item.countConflict||item.countStatus==='conflict')return {expected,actual:'',diff:'',status:'conflict'};
    const actual = quantity(item.actualQty);
    if (!Number.isFinite(actual)) throw new Error(`الكمية الفعلية غير صحيحة للصنف ${item.sku}`);
    const diff = difference(actual, expected);
    return { expected, actual, diff, status: Math.abs(diff) < 1e-9 ? 'matched' : diff < 0 ? 'shortage' : 'surplus' };
  }
  function drafts(scope) {
    const prefix = `stocktake.draft.v73:${scope}:`;
    return {
      get(id) { try { return JSON.parse(localStorage.getItem(prefix + id) || 'null'); } catch { return null; } },
      set(id, value) { try { const existing=localStorage.getItem(prefix+id);if(existing!==null){const parsed=JSON.parse(existing);if(!parsed||typeof parsed!=='object')return false}const raw=JSON.stringify(value); localStorage.setItem(prefix + id, raw); return localStorage.getItem(prefix + id)===raw; } catch { return false; } },
      list() {
        const entries=[];
        // Include corrupt records in the export rather than silently hiding them.
        for(let j=0;j<localStorage.length;j++){
          const key=localStorage.key(j);if(!key?.startsWith(prefix))continue;
          const raw=localStorage.getItem(key);let value=null;try{value=JSON.parse(raw)}catch{}
          entries.push({key:key.slice(prefix.length),raw,value});
        }
        return entries;
      },
      removeIf(id, expected) { try { if(localStorage.getItem(prefix+id)!==JSON.stringify(expected))return false;localStorage.removeItem(prefix+id);return localStorage.getItem(prefix+id)===null; } catch { return false; } },
      remove(id) { try { localStorage.removeItem(prefix + id); } catch {} }
    };
  }
  function receiptMatches(key,draft,receipt,actorId){
    const parts=key.split(':');if(parts.length!==4||!draft?.operationId||!receipt||!actorId)return false;
    const [campaignId,teamId,itemId,kind]=parts;
    if(receipt.campaignId!==campaignId||receipt.teamId!==teamId||receipt.itemId!==itemId||receipt.actorEmployeeId!==actorId)return false;
    if(kind==='note')return receipt.action==='note_updated'&&typeof draft.value==='string'&&receipt.after?.note===draft.value;
    const actual=quantity(draft.value),saved=quantity(receipt.after?.teamActualQty);
    return kind==='qty'&&['count_created','count_revised'].includes(receipt.action)&&Number.isFinite(actual)&&Number.isFinite(saved)&&actual===saved;
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
  global.StocktakeCore = { quantity, difference, teamKey, teamCount, contributionLabels, aggregate, forTeam, result, drafts, receiptMatches, capture, restore };
})(typeof window !== 'undefined' ? window : globalThis);

