import fs from 'node:fs';

const s=fs.readFileSync('admin-stocktake.html','utf8');
const start=s.indexOf('function auditActionLabels()');
const end=s.indexOf('function printHtml(cp)',start);
if(start<0||end<0)throw new Error('V56.7 readable audit block missing');
const block=s.slice(start,end);

const must=[
  "actualQty:'الكمية الفعلية'",
  "difference:'الفرق'",
  "countStatus:'الحالة'",
  "memberEmployeeNames:'أعضاء اللجنة'",
  "extraMemberNames:'المساعدون'",
  "campaignId",
  "function auditSnapshotHtml",
  "function auditContextHtml",
  "class=\"auditChangeGrid\"",
  "لا توجد حالة سابقة",
  "لا توجد حالة جديدة"
];
for(const token of must)if(!block.includes(token))throw new Error(`Missing V56.7 token: ${token}`);
if(block.includes('JSON.stringify'))throw new Error('Raw JSON must not be rendered in the audit UI');
if(!s.includes('id="v56-7-readable-audit"'))throw new Error('Readable audit CSS missing');
if(!block.includes("hidden=new Set(['campaignId','teamId','memberEmployeeIds'"))throw new Error('Technical IDs are not explicitly hidden');
console.log('V56.7 readable stocktake audit regression: OK');
