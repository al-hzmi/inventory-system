'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const admin=fs.readFileSync('admin-dashboard.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const m=admin.match(/const REALTIME_KEYS=new Set\(\[([^\]]+)\]\)/);
assert(m,'missing realtime list');
const keys=[...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
for(const key of ['employeeAccounts','employeeSessions','employeeLogins','employeeOrders','livePresence','liveActivity','customers','customerSessions','customerLogins','customerOrders'])
 assert(keys.includes(key),'critical feed lost '+key);
for(const k of ['employeeDrafts','customerDrafts','employeeUsers','customerDevices'])
 assert(!keys.includes(k),'noncritical feed still consuming continuous reads '+k);
assert(keys.length<=15,'too many live admin feeds');
assert(sw.includes("IMAGE_CACHE='batco-public-product-images-"),'no public image cache');
assert(sw.includes("url.pathname.startsWith('/images/')"),'cache must be limited to public product images');
assert(sw.includes('if(keys.length>180)'),'image cache must have bounded size');
assert(sw.includes('if(!eligible&&!VENDORS.includes(url.href))return;'),'normal Firebase requests must not be intercepted');
console.log('V103 public-only image cache and critical Firestore feeds: PASS',keys.length);
