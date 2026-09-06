import fs from 'node:fs';
import assert from 'node:assert/strict';

const album = fs.readFileSync('image-distribution.html','utf8');
const runtime = fs.readFileSync('runtime/index-v37-source.txt','utf8');
const smoke = fs.readFileSync('.github/workflows/v56-12-production-smoke.yml','utf8');

for (const marker of ["IMAGE_BINDING_STORE_DOC='permissions_v44'","IMAGE_BINDING_STORE_FIELD='productImageBindings'",'mergeFields','persistImageBinding','VERIFY_FAILED','Promise.race']) assert.ok(album.includes(marker), `album missing ${marker}`);
assert.ok(album.includes("IMAGE_BINDING_LEGACY_DOC='product_image_bindings'"));
assert.ok(album.includes('loadImageBindings()'));
assert.ok(!album.includes("db.runTransaction(async tx=>{const snap=await tx.get(ref)"), 'album must not use the failing read/modify/write transaction');

for (const marker of ["const IMAGE_BINDING_STORE_DOC = 'permissions_v44';","const IMAGE_BINDING_STORE_FIELD = 'productImageBindings';",'writeImageBindingLeaf','mergeFields','imageBindingsVersion','56.31','legacy = snap.exists','primary = snap.exists']) assert.ok(runtime.includes(marker), `runtime missing ${marker}`);
assert.ok(runtime.includes("const IMAGE_BINDING_DOC = 'product_image_bindings'; // legacy read-only store"));
assert.ok(runtime.includes('value: null'), 'clear must write a tombstone so legacy bindings cannot reappear');

assert.ok(smoke.includes('$PROD/image-distribution.html?verify=$nonce'));
assert.ok(smoke.includes('cmp -s image-distribution.html /tmp/image-distribution.html'));
assert.ok(smoke.includes("IMAGE_BINDING_STORE_DOC='permissions_v44'"));
console.log('V56.31 image binding canonical store regression: PASS');
