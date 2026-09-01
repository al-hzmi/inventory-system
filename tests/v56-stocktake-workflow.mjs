import fs from 'node:fs';
import assert from 'node:assert/strict';
const employee=fs.readFileSync('stocktake.html','utf8');
const admin=fs.readFileSync('admin-stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const has=(s,x,msg)=>assert.ok(s.includes(x),msg||`missing ${x}`);

// Root identity and access safety.
has(employee,"ROOT_ID='admin_mohanad'",'employee stocktake must use immutable ROOT id');
has(admin,"ROOT_ID='admin_mohanad'",'admin stocktake must use immutable ROOT id');
has(employee,"photo?.employeeId===ROOT_ID",'ROOT access must be photo-bound');
has(admin,"adminPhoto?.employeeId!==ROOT_ID",'admin page must reject non-root photo identity');

// Blind-first-count invariant: expected quantity is only rendered in counted branch.
has(employee,"counted?`<div class=\"qtygrid\"",'expected qty must be behind counted branch');
assert.ok(!employee.includes('كاملة ✓'),'blind count must not expose a full/expected shortcut');
has(employee,'لن تظهر كمية النظام أو الفرق قبل الاعتماد الأول.','first count must remain blind');

// Fast floor workflow.
has(employee,'placeholder="اكتب رقم الصنف"','SKU entry must be primary');
has(employee,'مسح الباركود','barcode must remain optional');
has(employee,'navigator.vibrate','count feedback must include vibration');
has(employee,'AudioContext','count feedback must include sound');
has(employee,'ملاحظة على الصنف','optional note flow required');
has(employee,'quantity_found_later','found-later quantity must be auditable');
has(employee,'+ كمية عُثر عليها','found-later correction control required');
has(employee,"action:wasCounted?'count_revised':'count_created'",'first count and revisions must be distinguishable');

// Flexible team model and admin root control.
has(admin,'عضو / أعضاء اللجنة (أصحاب الحسابات)','committee member terminology must match the stocktake form');
has(admin,'المساعد / المساعدون','assistant terminology must match the stocktake form');
has(admin,'<th>عضو اللجنة</th><th>المساعد</th>','printable report must preserve committee/assistant columns');
has(admin,'memberEmployeeIds','team membership must be multi-member');
has(admin,'extraMemberNames','non-account committee members must be supported');
has(admin,'نطاق الجرد','scope must be free text');
has(admin,"cp.status!=='closed'",'root must be able to change teams during active stocktake');
has(admin,'syncAccessFrom','active membership edits must immediately refresh access');

// Accountant Excel is the frozen reference, with safe replacement before start.
has(admin,'expectedQty:num(r.qty)','Excel quantity must become expected stocktake snapshot');
has(admin,"['draft','ready'].includes(state.campaign.status)",'Excel replacement must stop once counting starts');
has(admin,'remove=oldTeam.filter','re-upload must replace stale team rows');
has(admin,'الصنف ${r.sku} مكرر داخل نفس الملف','duplicate SKU validation required');
has(admin,'موجود مسبقًا في المجموعة','cross-team duplicate validation required');
has(admin,'scoreHeader','Excel header detection must tolerate leading report rows');

// Lifecycle and accountant handoff.
has(admin,"status:'ready'",'previous-day preparation state required');
has(admin,"status:'active'",'active counting state required');
has(admin,"status:'closed'",'closed/reconciliation state required');
has(admin,'لا يوجد أي تعديل تلقائي للمخزون','site must never auto-adjust accounting inventory');
has(admin,'Excel الفروقات','accountant variance export required');
has(admin,'الحسابات /','legacy accounting sign-off terminology required');
has(admin,'الإدارة /','legacy management sign-off terminology required');
has(shell,'admin-stocktake.html','admin shell must route to stocktake admin page');
console.log('V56 stocktake workflow regression: OK');
