import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const pilot=read('v61-employee-pilot.js'),css=read('v61-employee-pilot.css');
const runtime=read('runtime/index-v37-source.txt'),loader=read('index.html');
const admin=read('v61-employee-pilot-admin.js'),nav=read('v57-admin-workspace.js');
const ctx={window:{addEventListener(){}},document:{readyState:'loading',addEventListener(){}},
 localStorage:{getItem(){return null},setItem(){}},sessionStorage:{getItem(){return null},setItem(){}},
 Intl,Number,Date,Set,JSON,Promise,console,clearTimeout,setTimeout};
new vm.Script(pilot,{filename:'v61-employee-pilot.js'}).runInNewContext(ctx);
new vm.Script(admin,{filename:'v61-employee-pilot-admin.js'});
const api=ctx.window.BatcoPilot;
assert.equal(api.version,'69.0');
assert.equal(api.official,true,'Every verified account must receive the official workspace');
assert.ok(pilot.includes("if(!identity){"),'Signed-out access remains gated by verified identity');
assert.ok(pilot.includes("if(id&&auth&&p?.role==='employee'"),'Employee proof remains a prerequisite');
assert.ok(pilot.includes("enable(identity.id);")&&pilot.includes("waitUI(identity.id);"),'Official UI should initialize on any verified employee');
assert.ok(!pilot.includes('.onSnapshot(')&&!pilot.includes('if(allowed){enable(identity.id)'), 'Remote pilot allowlist must not control public release');
assert.ok(!pilot.includes("if(safeRead(key(id)+'_classic',{}).hidden)"),'Old hidden preferences must not suppress official UI');
assert.ok(pilot.includes("batco_pilot61_"),'Legacy favorites must remain after release');
assert.ok(/CORE='\.\/runtime\/index-v37-source\.txt\?[^']+'/.test(loader)&&/v61-employee-pilot\.js\?v=[0-9.]+/.test(loader)&&/v61-employee-pilot\.css\?v=[0-9.]+/.test(loader),'Source-controlled bootstrap must reference versioned employee assets before build');
assert.ok(runtime.includes('className={`batco-gallery-favorite-anchor')&&runtime.includes("showImage?'below-zoom':'without-zoom'"),'Gallery star goes to the right below zoom');
assert.ok(css.includes('.batco-gallery-favorite-anchor{')&&css.includes('right:8px;left:auto;top:52px'),'Star must avoid top-left logo');
assert.ok(css.includes('.batco-direct-favorite.is-icon-only')&&css.includes('width:38px;height:38px'),'Gallery favorite must be square');
assert.ok(runtime.includes('<polygon points="12 2.6')&&runtime.includes('strokeWidth="1.7"'),'Star uses thin vector stroke');
assert.equal((runtime.match(/className="batco-admin-action-row"/g)||[]).length,2,'Both result types separate admin control');
assert.ok(runtime.includes('className="batco-shopping-action-row"')&&css.includes('grid-template-columns:auto minmax(0,1fr)'),'Favorite and invoice control align');
assert.ok(runtime.includes('className="batco-image-warehouse-toast">اختر الفرع أولًا')&&css.includes('position:static;display:table'),'Warehouse hint stays in flow');
assert.equal((runtime.match(/<PilotFavoriteButton item=\{item\}/g)||[]).length,4,'Search/gallery direct favorite actions remain');
assert.ok(runtime.includes("e.preventDefault();e.stopPropagation();"),'Favorite cannot flip gallery card');
assert.ok(runtime.includes('عرض صور الأصناف</span>'),'Image control retains one-line label');
assert.ok(css.includes('button:not([class*="accent"])')&&!css.includes('button.font-medium[aria-pressed]'),'Admin-only missing-image chip must be unchanged');
assert.ok(admin.includes('official:true')&&!admin.includes('allowedEmployeeIds:next.ids'),'Retired admin controls must not change pilot settings');
assert.ok(nav.includes('showOfficialWorkspace()')&&nav.includes("removeAttribute('data-b61a-open')"),'Legacy admin banner must resolve to official workspace');
console.log('V69_OFFICIAL_STATIC_PASS');
