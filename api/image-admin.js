const API_VERSION = '2026-03-10';

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
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!config.token || !config.owner || !config.repo || !config.secret) return json(res, 503, { error: 'ميزة إدارة الصور غير مهيأة على الخادم.' });
  if (String(req.body?.secret || '') !== config.secret) return json(res, 401, { error: 'رمز إدارة الصور غير صحيح.' });

  try {
    if (action === 'start') {
      const repoInfo = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`);
      const branch = config.branch || repoInfo.default_branch || 'main';
      const ref = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/ref/heads/${encodeURIComponent(branch)}`);
      const headSha = ref.object.sha;
      const commit = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits/${headSha}`);
      let imageListContent = '';
      try {
        const currentList = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/data/images_list.txt?ref=${encodeURIComponent(branch)}`);
        if (currentList?.content) imageListContent = Buffer.from(String(currentList.content).replace(/\s/g, ''), 'base64').toString('utf8');
      } catch (e) {
        if (e.status !== 404) throw e;
      }
      return json(res, 200, { headSha, baseTreeSha: commit.tree.sha, branch, imageListContent });
    }

    if (action === 'blob') {
      const content = String(req.body?.contentBase64 || '');
      if (!content) return json(res, 400, { error: 'محتوى الصورة مفقود.' });
      if (content.length > 4.2 * 1024 * 1024) return json(res, 413, { error: 'الصورة كبيرة جدًا للرفع المباشر.' });
      const blob = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs`, {
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

      const listBlob = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/blobs`, {
        method: 'POST', body: JSON.stringify({ content: Buffer.from(imageListContent, 'utf8').toString('base64'), encoding: 'base64' })
      });
      const tree = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/trees`, {
        method: 'POST', body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: [
            ...safeEntries.map(e => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })),
            { path: 'data/images_list.txt', mode: '100644', type: 'blob', sha: listBlob.sha }
          ]
        })
      });
      const commit = await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/commits`, {
        method: 'POST', body: JSON.stringify({ message: `chore(images): admin image import (${safeEntries.length})`, tree: tree.sha, parents: [headSha] })
      });
      await gh(config, `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/git/refs/heads/${encodeURIComponent(branch)}`, {
        method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false })
      });
      return json(res, 200, { commitSha: commit.sha, uploaded: safeEntries.length });
    }

    return json(res, 400, { error: 'عملية غير معروفة.' });
  } catch (err) {
    console.error('[image-admin]', err);
    return json(res, err.status === 409 ? 409 : 500, { error: err.status === 409 ? 'حدث تحديث متزامن في المستودع. أعد المحاولة.' : (err.message || 'تعذر تحديث المستودع.') });
  }
};
