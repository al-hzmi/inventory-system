const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('sw.js', 'utf8');
const entry = fs.readFileSync('index.html', 'utf8');
new vm.Script(source, { filename: 'sw.js' });
assert.match(source, /batco-navigation-shell-v118-fresh-employee/);
assert.match(source, /path==='\/index\.html'&&cached/);
assert.match(entry, /batco_sw_checked_v118/, 'fresh employee bootstrap must check for the upgraded worker');

async function navigate({ offline = false, retry = false }) {
  const listeners = {};
  const url = `https://inventory.example/index.html${retry ? '?batco-retry=1' : ''}`;
  const html = text => new Response(text, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
  const saved = new Map([['/index.html', html('old employee shell')]]);
  const cache = {
    match: async key => saved.get(key)?.clone(),
    put: async (key, response) => { saved.set(key, response.clone()); },
    keys: async () => [...saved.keys()]
  };
  let networkCalls = 0;
  const context = {
    self: { location: { origin: 'https://inventory.example' }, addEventListener: (type, listener) => { listeners[type] = listener; } },
    caches: { open: async () => cache, keys: async () => [] },
    fetch: async () => { networkCalls++; if (offline) throw new Error('OFFLINE'); return html('new employee shell'); },
    URL, Promise, Response, setTimeout, clearTimeout
  };
  vm.runInNewContext(source, context);
  const waits = [];
  let reply;
  listeners.fetch({
    request: { url, method: 'GET', mode: 'navigate', destination: 'document' },
    waitUntil: promise => waits.push(Promise.resolve(promise)),
    respondWith: promise => { reply = Promise.resolve(promise); }
  });
  assert.ok(reply, 'service worker must handle the employee navigation');
  const rendered = await (await reply).text();
  await Promise.allSettled(waits);
  const cached = await (await saved.get('/index.html').clone()).text();
  return { rendered, cached, networkCalls };
}

(async () => {
  const online = await navigate({});
  assert.equal(online.rendered, 'new employee shell', 'online iPhone must not receive an old cached employee app');
  assert.equal(online.cached, 'new employee shell', 'offline fallback must be refreshed');
  assert.equal(online.networkCalls, 1);

  const offline = await navigate({ offline: true });
  assert.equal(offline.rendered, 'old employee shell', 'offline employee launch must remain usable');

  const retry = await navigate({ retry: true });
  assert.equal(retry.rendered, 'new employee shell', 'explicit refresh URL must bypass stale shell');
  console.log('PASS V118: online navigation refreshes employee UI, offline retains cached fallback, retry bypasses cache');
})().catch(error => { console.error(error); process.exitCode = 1; });
