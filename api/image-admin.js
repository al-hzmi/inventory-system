const crypto = require('crypto');
const API_VERSION = '2026-03-10';
const STATE_REF = 'image-bindings-state';
const BINDINGS_PATH = 'data/product_image_bindings.json';
const ADMIN_TOKEN_SHA256 = 'f03cbd5064d744450fd61c889dabc2874a8acbb0005d06561db00159bfd3c0c7';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cfg() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || '',
    repo: process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || '',
    branch: process.env.GITHUB_BRANCH || '',
    secret: process.env.IMAGE_ADMIN_SECRET || ''
  };
}

async function gh(config, path, options = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'BATCO-Image-Manager',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || `GitHub API ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

const norm = value => String(value || '').toUpperCase().replace(/\.(WEBP|PNG|JPE?G)$/i, '').replace(/[^A-Z0-9_-]/g, '');
const base = config => `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
const decode = row => row?.content ? Buffer.from(String(row.content).replace(/\s/g, ''), 'base64').toString('utf8') : '';

async function repoBranch(config) {
  const info = await gh(config, base(config));
  return config.branch || info.default_branch || 'main';
}

async function readText(config, path, ref) {
  try {
    const row = await gh(config, `${base(config)}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    return { text: decode(row), sha: row.sha || '' };
  } catch (err) {
    if (err.status === 404) return { text: '', sha: '' };
    throw err;
  }
}

async function ensureStateBranch(config, mainBranch) {
  try {
    const ref = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);
    return ref.object.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
    const main = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(mainBranch)}`);
    try {
      await gh(config, `${base(config)}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${STATE_REF}`, sha: main.object.sha })
      });
    } catch (createErr) {
      if (createErr.status !== 422) throw createErr;
    }
    const ref = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);
    return ref.object.sha;
  }
}

async function readBindings(config) {
  const row = await readText(config, BINDINGS_PATH, STATE_REF);
  if (!row.text) return {};
  try {
    const parsed = JSON.parse(row.text);
    return parsed && parsed.bindings && typeof parsed.bindings === 'object' ? parsed.bindings : {};
  } catch {
    return {};
  }
}

function sameOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return true;
  try { return new URL(origin).host === String(req.headers?.host || ''); } catch { return false; }
}

function bindingAdminOK(req) {
  const supplied = String(req.body?.adminToken || '');
  const digest = crypto.createHash('sha256').update(supplied).digest('hex');
  const proof = req.body?.adminProof || {};
  return sameOrigin(req) && digest === ADMIN_TOKEN_SHA256 && proof?.role === 'admin' && Boolean(proof?.photoId);
}

async function validateBinding(config, mainBranch, sku, imageKey) {
  const [j, r, images] = await Promise.all([
    readText(config, 'data/jeddah.tsv', mainBranch),
    readText(config, 'data/riyadh.tsv', mainBranch),
    readText(config, 'data/images_list.txt', mainBranch)
  ]);
  const inventory = new Set();
  for (const raw of [j.text, r.text]) {
    const lines = String(raw || '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) continue;
    const headers = lines[0].split('\t');
    let idx = headers.findIndex(x => /رقم|كود|sku|item/i.test(x));
    if (idx < 0) idx = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split('\t');
      const key = norm(cols[idx] || '');
      if (key) inventory.add(key);
    }
  }
  if (!inventory.has(sku)) {
    const err = new Error('الصنف المطلوب غير موجود في بيانات المخزون الحالية.');
    err.status = 400;
    throw err;
  }

  const imageKeys = new Set();
  for (const line of String(images.text || '').split(/\r?\n/)) {
    const cols = line.split('\t').map(x => x.trim()).filter(Boolean);
    if (!cols.length) continue;
    const first = norm(cols[0]);
    const last = norm(cols[cols.length - 1]);
    if (first) imageKeys.add(first);
    if (last) imageKeys.add(last);
  }
  if (!imageKeys.has(imageKey)) {
    const err = new Error('الصورة المطلوبة غير موجودة في ألبوم الصور الحالي.');
    err.status = 400;
    throw err;
  }
}

async function persistBindings(config, bindings, updatedBy, message, existingSha) {
  const payload = JSON.stringify({ bindings, updatedAt: new Date().toISOString(), updatedBy: String(updatedBy || 'مهند'), version: '56.31' }, null, 2) + '\n';
  const body = {
    message,
    content: Buffer.from(payload, 'utf8').toString('base64'),
    branch: STATE_REF
  };
  if (existingSha) body.sha = existingSha;
  const result = await gh(config, `${base(config)}/contents/${BINDINGS_PATH}`, { method: 'PUT', body: JSON.stringify(body) });
  return result?.commit?.sha || null;
}

async function bindImage(config, sku, imageKey, updatedBy) {
  const mainBranch = await repoBranch(config);
  await validateBinding(config, mainBranch, sku, imageKey);
  await ensureStateBranch(config, mainBranch);
  const currentRow = await readText(config, BINDINGS_PATH, STATE_REF);
  let current = {};
  if (currentRow.text) { try { current = JSON.parse(currentRow.text)?.bindings || {}; } catch {} }
  const bindings = { ...current, [sku]: imageKey };
  const commitSha = await persistBindings(config, bindings, updatedBy, `state(images): bind ${sku} -> ${imageKey}`, currentRow.sha);
  return { bindings, commitSha };
}

async function unbindImage(config, sku, updatedBy) {
  const mainBranch = await repoBranch(config);
  await ensureStateBranch(config, mainBranch);
  const currentRow = await readText(config, BINDINGS_PATH, STATE_REF);
  let current = {};
  if (currentRow.text) { try { current = JSON.parse(currentRow.text)?.bindings || {}; } catch {} }
  const bindings = { ...current };
  delete bindings[sku];
  const commitSha = await persistBindings(config, bindings, updatedBy, `state(images): unbind ${sku}`, currentRow.sha);
  return { bindings, commitSha };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET,POST,OPTIONS');
    return json(res, 204, {});
  }

  const config = cfg();
  const action = req.method === 'GET' ? String(req.query?.action || 'status') : String(req.body?.action || '');

  if (req.method === 'GET' && action === 'status') {
    return json(res, 200, { configured: Boolean(config.token && config.owner && config.repo && config.secret), owner: config.owner || null, repo: config.repo || null });
  }
  if (req.method === 'GET' && action === 'bindings') {
    if (!config.token || !config.owner || !config.repo) return json(res, 503, { error: 'خدمة ربط الصور غير مهيأة على الخادم.' });
    try { return json(res, 200, { bindings: await readBindings(config), version: '56.31' }); }
    catch (err) { console.error('[image-admin bindings read]', err); return json(res, 500, { error: 'تعذر تحميل روابط الصور.' }); }
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!config.token || !config.owner || !config.repo) return json(res, 503, { error: 'ميزة إدارة الصور غير مهيأة على الخادم.' });

  try {
    if (action === 'bind' || action === 'unbind') {
      if (!bindingAdminOK(req)) return json(res, 401, { error: 'جلسة الإدارة غير صالحة لهذه العملية.' });
      const sku = norm(req.body?.sku || '');
      if (!sku) return json(res, 400, { error: 'رقم الصنف غير صالح.' });
      if (action === 'bind') {
        const imageKey = norm(req.body?.imageKey || '');
        if (!imageKey) return json(res, 400, { error: 'مفتاح الصورة غير صالح.' });
        const saved = await bindImage(config, sku, imageKey, req.body?.updatedBy);
        return json(res, 200, { ok: true, ...saved, saved: saved.bindings?.[sku] || '' });
      }
      const saved = await unbindImage(config, sku, req.body?.updatedBy);
      return json(res, 200, { ok: true, ...saved });
    }

    if (!config.secret) return json(res, 503, { error: 'ميزة إدارة الصور غير مهيأة على الخادم.' });
    if (String(req.body?.secret || '') !== config.secret) return json(res, 401, { error: 'رمز إدارة الصور غير صحيح.' });

    if (action === 'start') {
      const branch = await repoBranch(config);
      const ref = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(branch)}`);
      const headSha = ref.object.sha;
      const commit = await gh(config, `${base(config)}/git/commits/${headSha}`);
      const currentList = await readText(config, 'data/images_list.txt', branch);
      return json(res, 200, { headSha, baseTreeSha: commit.tree.sha, branch, imageListContent: currentList.text });
    }

    if (action === 'blob') {
      const content = String(req.body?.contentBase64 || '');
      if (!content) return json(res, 400, { error: 'محتوى الصورة مفقود.' });
      if (content.length > 4.2 * 1024 * 1024) return json(res, 413, { error: 'الصورة كبيرة جدًا للرفع المباشر.' });
      const blob = await gh(config, `${base(config)}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content, encoding: 'base64' })
      });
      return json(res, 200, { sha: blob.sha });
    }

    if (action === 'finalize') {
      const headSha = String(req.body?.headSha || '');
      const baseTreeSha = String(req.body?.baseTreeSha || '');
      const branch = String(req.body?.branch || config.branch || 'main');
      const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
      const imageListContent = String(req.body?.imageListContent || '');
      if (!headSha || !baseTreeSha || !imageListContent) return json(res, 400, { error: 'بيانات الاعتماد غير مكتملة.' });
      if (entries.length > 1000) return json(res, 400, { error: 'عدد الملفات في العملية الواحدة كبير جدًا.' });
      const safeEntries = entries.map(e => ({ path: String(e.path || ''), sha: String(e.sha || '') })).filter(e => /^images\/[^/]+$/i.test(e.path) && /^[0-9a-f]{40}$/i.test(e.sha));
      if (safeEntries.length !== entries.length) return json(res, 400, { error: 'يوجد مسار صورة غير صالح.' });

      const listBlob = await gh(config, `${base(config)}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content: Buffer.from(imageListContent, 'utf8').toString('base64'), encoding: 'base64' })
      });
      const tree = await gh(config, `${base(config)}/git/trees`, {
        method: 'POST', body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [
            ...safeEntries.map(e => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })),
            { path: 'data/images_list.txt', mode: '100644', type: 'blob', sha: listBlob.sha }
          ]
        })
      });
      const commit = await gh(config, `${base(config)}/git/commits`, {
        method: 'POST', body: JSON.stringify({ message: `chore(images): admin image import (${safeEntries.length})`, tree: tree.sha, parents: [headSha] })
      });
      await gh(config, `${base(config)}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false })
      });
      return json(res, 200, { commitSha: commit.sha, uploaded: safeEntries.length });
    }

    return json(res, 400, { error: 'عملية غير معروفة.' });
  } catch (err) {
    console.error('[image-admin]', err);
    const status = [400, 401, 409].includes(err.status) ? err.status : 500;
    return json(res, status, { error: err.status === 409 ? 'حدث تحديث متزامن في روابط الصور. أعد المحاولة.' : (err.message || 'تعذر تحديث روابط الصور.') });
  }
};
