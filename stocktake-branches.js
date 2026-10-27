/* V116: Independent, read-only branch routing for simultaneous warehouse stocktakes. */
(function (root) {
  'use strict';
  const BRANCHES = ['jeddah', 'riyadh'];
  const ROOT_ID = 'admin_mohanad';
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(v => String(v || '').trim()).filter(Boolean))];
  const normalize = value => String(value || '').trim().toLowerCase();
  function branchOf(campaign) {
    const key = String(campaign?.warehouseKey || campaign?.testWarehouseKey || '').toLowerCase().trim();
    if (BRANCHES.includes(key)) return key;
    const label = String(campaign?.warehouse || '');
    if (/رياض|riyadh|ruh/i.test(label)) return 'riyadh';
    if (/جدة|jeddah|jed/i.test(label)) return 'jeddah';
    return '';
  }
  function normalizeEntry(input) {
    const campaignId = String(input?.campaignId || input?.id || '').trim();
    return campaignId ? {
      campaignId,
      allowedEmployeeIds: unique(input.allowedEmployeeIds),
      allowedEmployeeNames: unique(input.allowedEmployeeNames)
    } : null;
  }
  function activeMap(control) {
    const source = control?.activeCampaigns || {};
    const output = {};
    for (const key of BRANCHES) {
      const record = normalizeEntry(source[key]);
      if (record) output[key] = record;
    }
    return output;
  }
  function hasMembers(entry, user, normName = normalize) {
    if (!entry) return false;
    if (user?.isAdmin) return true;
    const id = String(user?.employeeId || '').trim();
    const name = normName(user?.name || '');
    return entry.allowedEmployeeIds.includes(id) ||
      entry.allowedEmployeeNames.some(n => !(entry.allowedEmployeeIds.includes(ROOT_ID) && normName(n) === normName('مهند')) && normName(n) === name);
  }
  function available(control, user, normName = normalize) {
    if (!control?.enabled) return [];
    const map = activeMap(control);
    const active = BRANCHES.filter(key => map[key] && hasMembers(map[key], user, normName))
      .map(branch => ({ branch, campaignId: map[branch].campaignId }));
    if (active.length || Object.keys(map).length) return active;
    const legacyId = String(control.activeCampaignId || '').trim();
    const eligible = user?.isAdmin || control.accessMode === 'all' ||
      (control.accessMode === 'selected' && (
        (control.allowedEmployeeIds || []).includes(user?.employeeId) ||
        (control.allowedEmployeeNames || []).some(n => normName(n) === normName(user?.name || ''))
      ));
    return legacyId && eligible ? [{ branch: '', campaignId: legacyId }] : [];
  }
  function isActive(control, campaignId, branch) {
    if (!control?.enabled || !campaignId) return false;
    const map = activeMap(control);
    if (Object.keys(map).length) {
      return BRANCHES.some(key => (!branch || branch === key) && map[key]?.campaignId === campaignId);
    }
    return String(control.activeCampaignId || '') === String(campaignId);
  }
  function assertNoCollision(map, branch, entry, normName = normalize) {
    if (!BRANCHES.includes(branch) || !normalizeEntry(entry)) throw Error('INVALID_STOCKTAKE_BRANCH');
    const next = normalizeEntry(entry);
    if (map[branch] && map[branch].campaignId !== next.campaignId) throw Error('ACTIVE_STOCKTAKE_SAME_BRANCH');
    const idSet = new Set(next.allowedEmployeeIds.filter(id => id !== ROOT_ID));
    const nameSet = new Set(next.allowedEmployeeNames.map(normName).filter(name => name && name !== normName('مهند')));
    for (const key of BRANCHES) {
      if (key === branch || !map[key]) continue;
      if (map[key].allowedEmployeeIds.some(id => id !== ROOT_ID && idSet.has(id)) ||
          map[key].allowedEmployeeNames.some(name => nameSet.has(normName(name)))) {
        throw Error('STOCKTAKE_EMPLOYEE_BRANCH_OVERLAP');
      }
    }
    return next;
  }
  function patchFor(map, preferredId = '') {
    const chosen = {};
    for (const key of BRANCHES) chosen[key] = map[key] ? normalizeEntry(map[key]) : null;
    const active = BRANCHES.map(key => chosen[key]).filter(Boolean);
    const ids = unique(active.flatMap(entry => entry.allowedEmployeeIds));
    const names = unique(active.flatMap(entry => entry.allowedEmployeeNames));
    return {
      activeCampaigns: chosen,
      enabled: active.length > 0,
      accessMode: active.length ? 'selected' : 'none',
      allowedEmployeeIds: ids,
      allowedEmployeeNames: names,
      activeCampaignId: active.find(entry => entry.campaignId === preferredId)?.campaignId ||
        active[0]?.campaignId || ''
    };
  }
  root.StocktakeBranches = { BRANCHES, branchOf, normalizeEntry, activeMap, available,
    isActive, assertNoCollision, patchFor };
})(typeof window !== 'undefined' ? window : globalThis);
