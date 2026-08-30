import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const source = fs.readFileSync('runtime/index-v37-source.txt', 'utf8');
const boot = fs.readFileSync('index.html', 'utf8');

for (const marker of [
  "const LOGIN_LOOKUP_TIMEOUT_MS = 5000",
  "const LOGIN_TOTAL_DEADLINE_MS = 9000",
  "Promise.all(variants.map",
  "array-contains-any",
  "visibilitychange",
  "pageshow",
  "RemoteLoginWait",
  "MobileRemoteLoginApproval",
  "employee_remote_login_challenges",
  "secureRandomToken(32)",
  "approvalUrl.hash = `remote-login=",
  "remoteApprovalProof",
  "AES-GCM",
  "encryptRemotePhoto",
  "decryptRemotePhoto",
  "firebase.firestore.FieldValue.delete()",
  "onUsePhone={beginRemoteLogin}",
  "readRemoteLoginToken()",
]) assert(source.includes(marker), `missing marker: ${marker}`);

assert(boot.includes('runtime/index-v37-source.txt?v=55.2'), 'boot must load V55.2');
assert(source.includes('لا تحتاج تحديث الصفحة'), 'lookup timeout must be visible and recoverable');
assert(source.includes('حاول مرة أخرى'), 'failed lookup must expose a retry action');
assert(source.includes('التحقق عبر كاميرا الجوال'), 'desktop camera fallback must be visible');

const challengeSet = source.match(/\.collection\(REMOTE_LOGIN_COLLECTION\)\.doc\(id\)\.set\(\{([\s\S]*?)\}\),\s*6000/)?.[1];
assert(challengeSet, 'remote challenge write block');
assert(!/(^|\W)token\s*:/.test(challengeSet), 'raw approval token must never be stored');
assert(!/(^|\W)code\s*:/.test(challengeSet), 'employee PIN must never be stored in challenge');
assert(!challengeSet.includes('photoDataUrl'), 'plain face image must never be stored in challenge');
assert(source.includes('photoCiphertext: firebase.firestore.FieldValue.delete()'), 'encrypted face package must be deleted after use');

const token = crypto.randomBytes(32).toString('base64url');
const other = crypto.randomBytes(32).toString('base64url');
const id = crypto.createHash('sha256').update(token).digest('hex');
const proof = crypto.createHash('sha256').update(`${token}|attempt-1|approved`).digest('hex');
const wrongProof = crypto.createHash('sha256').update(`${other}|attempt-1|approved`).digest('hex');
assert.equal(id.length, 64);
assert.equal(proof.length, 64);
assert.notEqual(proof, wrongProof, 'a different phone token cannot approve the challenge');

const keyBytes = await crypto.webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(`BATCO-REMOTE-PHOTO|${token}`));
const key = await crypto.webcrypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
const iv = crypto.randomBytes(12);
const samplePhoto = 'data:image/jpeg;base64,VjU1LjI=';
const encrypted = await crypto.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(samplePhoto));
assert.notEqual(Buffer.from(encrypted).toString('base64'), Buffer.from(samplePhoto).toString('base64'), 'stored image must be ciphertext');
const decrypted = await crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
assert.equal(new TextDecoder().decode(decrypted), samplePhoto, 'desktop must recover the exact approved photo');
const wrongKeyBytes = await crypto.webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(`BATCO-REMOTE-PHOTO|${other}`));
const wrongKey = await crypto.webcrypto.subtle.importKey('raw', wrongKeyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
await assert.rejects(crypto.webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrongKey, encrypted));

const timeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout')), ms);
  promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
await assert.rejects(timeout(new Promise(() => {}), 20), /timeout/);

console.log('V55_2_LOGIN_MOBILE_APPROVAL_PASS');
