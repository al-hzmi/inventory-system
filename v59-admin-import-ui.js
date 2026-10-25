/* V112: secure PDF stock reports + existing Excel import review. Existing admin guard runs first. */
(()=>{
'use strict';
const root=document.getElementById('app');
if(!root||!root.querySelector('#preview')||!root.querySelector('#data'))return;
root.classList.add('v59-import');
const duplicateBack=document.querySelector('.v57-import-main > a');
if(duplicateBack)duplicateBack.hidden=true;
root.innerHTML=[
'<header class="v59-header"><span class="v59-eyebrow">إدارة المخزون / الاستيراد</span><h2>تحديث البيانات بخطوات واضحة</h2><p>ارفع الملف أو الصقه، ثم راجع الفرق مع مخزون GitHub قبل الحفظ.</p></header>',
'<div class="v59-steps"><span id="v59-step-input" class="active">١ · إدخال البيانات</span><span id="v59-step-review">٢ · مراجعة التغييرات</span><span id="v59-step-save">٣ · اعتماد التحديث</span></div>',
'<section class="v59-form" aria-label="إدخال بيانات الاستيراد">',
'<div class="v59-section-title"><span class="v59-index">01</span><div><h3>مصدر البيانات</h3><p>حدّد الفرع أو التسعيرة قبل الرفع.</p></div></div>',
'<div class="v59-layout"><div class="v59-field"><label for="kind">نوع البيانات</label><select id="kind"><option value="jeddah">كميات ومعلومات أصناف جدة</option><option value="riyadh">كميات ومعلومات أصناف الرياض</option><option value="pricing">تسعيرة البيع — الفرعان</option></select></div><div class="v59-field"><span class="v59-label">طريقة التحديث</span><div class="v59-static">تحديث المحدد فقط، دون حذف الأصناف الأخرى</div></div></div>',
'<label for="file" id="v59-drop" class="v59-drop"><span class="v59-upload-icon">⇧</span><strong>اختيار ملف PDF أو Excel أو سحبه هنا</strong><small>PDF تقارير المخزون، أو XLSX وXLS وCSV وTSV وTXT</small><input id="file" type="file" accept=".pdf,.xlsx,.xls,.csv,.tsv,.txt,application/pdf"><span id="v59-filename" class="v59-filename">لم يتم اختيار ملف</span></label>',
'<div class="v59-or">أو</div>',
'<div class="v59-field"><label for="data">لصق الجدول مباشرة من Excel</label><textarea id="data" spellcheck="false" dir="ltr" placeholder="رقم الصنف    اسم الصنف    الوحدة    الكمية المتوفرة    الشد"></textarea><p id="v59-hint" class="v59-hint">من تقرير PDF نقرأ رقم الصنف والكمية المتوفرة فقط. ملفات Excel تُعامل حسب أعمدتها، وتُراجع كل التغييرات قبل الحفظ.</p></div>',
'<div class="v59-actions"><button type="button" id="preview" class="v59-button v59-button-primary">فحص ومعاينة التغييرات ←</button><button type="button" id="v59-clear" class="v59-button v59-button-outline">مسح</button><span id="v59-count" class="v59-counter">بانتظار بيانات</span></div>',
'</section>',
'<div id="result" class="v59-notice" role="status" aria-live="polite">لم تبدأ المعاينة بعد. الفحص لا يغيّر أي بيانات.</div>',
'<section id="v59-review" class="v59-review" hidden><div class="v59-section-title"><span class="v59-index">02</span><div><h3>مراجعة التغييرات</h3><p>الكمية قبل التعديل وبعده، لكل صنف تغير.</p></div></div>',
'<div id="v59-stats" class="v59-stats"></div>',
'<div class="v59-table-heading"><strong>الأصناف المتغيرة</strong><span id="v59-shown"></span></div>',
'<div class="v59-table-wrap"><table class="v59-table"><thead><tr><th>رقم الصنف</th><th>الحقل</th><th>قبل</th><th>بعد</th></tr></thead><tbody id="v59-rows"></tbody></table></div>',
'<p class="v59-hint" id="v59-truncated" hidden></p>',
'<div class="v59-confirm"><div><strong>تأكد من صحة الكميات قبل الاعتماد</strong><p id="v59-source">لن يُحفظ أي شيء بدون موافقتك.</p></div><button id="save" type="button" class="v59-button v59-button-primary" disabled>اعتماد وحفظ التحديث</button></div></section>',
'<footer class="v59-footer"><a href="./admin-home.html">← العودة للإدارة</a><span>بياناتك لا تتغير بمجرد الفحص.</span></footer>'
].join('');
const el=id=>document.getElementById(id);
const kind=el('kind'),upload=el('file'),paste=el('data'),preview=el('preview'),save=el('save'),result=el('result'),review=el('v59-review'),stats=el('v59-stats'),rows=el('v59-rows'),shown=el('v59-shown'),clear=el('v59-clear'),count=el('v59-count');
let snapshot=null,loading=false,source='لصق مباشر';
const number=x=>Number(x||0).toLocaleString('ar-SA');
function message(text,type=''){result.className='v59-notice'+(type?' v59-'+type:'');result.textContent=text}
function stage(value){for(const s of ['input','review','save'])el('v59-step-'+s).classList.toggle('active',s===value)}
function invalidate(){snapshot=null;save.disabled=true;review.hidden=true;stage('input')}
function setBusy(state){loading=state;preview.disabled=state;clear.disabled=state;kind.disabled=state;upload.disabled=state;paste.readOnly=state;if(state)save.disabled=true;preview.textContent=state?'جارٍ الفحص…':'فحص ومعاينة التغييرات ←'}
function updateCount(){count.textContent=paste.value.trim()?number(paste.value.replace(/\r\n?/g,'\n').split('\n').filter(line=>line.trim()).length)+' صف غير فارغ':'بانتظار بيانات'}
function stat(label,value,featured=false){const div=document.createElement('div');div.className='v59-stat'+(featured?' featured':'');const strong=document.createElement('strong');strong.textContent=number(value);const title=document.createElement('span');title.textContent=label;div.append(strong,title);stats.append(div)}
function show(summary){
 const s=summary||{},examples=Array.isArray(s.examples)?s.examples:[];
 stats.replaceChildren();stat('أصناف تم فحصها',s.rows);stat('أصناف تغيرت',s.changed,true);stat('أصناف جديدة',s.added);stat('دون تغيير',s.unchanged);
 rows.replaceChildren();
 for(const item of examples){const tr=document.createElement('tr');for(const [label,value] of [['رقم الصنف',item.sku],['الحقل',item.field],['قبل',item.before],['بعد',item.after]]){const td=document.createElement('td');td.dataset.label=label;td.textContent=value===undefined||value===null||value===''?'—':String(value);tr.append(td)}rows.append(tr)}
 if(!examples.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='v59-empty';td.textContent='لا توجد تغييرات. البيانات المدخلة مطابقة لملف المستودع.';tr.append(td);rows.append(tr)}
 shown.textContent=number(examples.length)+' تغيير معروض';
 const total=Number(s.changed||0)+Number(s.added||0)+Number(s.detailChanges||0);
 el('v59-truncated').hidden=examples.length>=total;
 el('v59-truncated').textContent='يُعرض أول '+number(examples.length)+' تغيير في الجدول. إجمالي تغييرات الأصناف ظاهر أعلاه.';
 el('v59-source').textContent='الوجهة: '+kind.selectedOptions[0].textContent+' | المصدر: '+source+' | تم تجاهل '+number(s.blankRowsSkipped)+' صفوف فارغة.';
 review.hidden=false;stage('review');
 const hasChanges=Number(s.changed||0)+Number(s.added||0)>0;
 save.disabled=!hasChanges;
 message(hasChanges?'تم الفحص بنجاح. راجع جميع الأرقام المعروضة قبل اعتمادها.':'الفحص ناجح، والملف مطابق لما هو موجود؛ لا حاجة للحفظ.','success');
}
function proof(){try{return JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'null')}catch{return null}}
async function request(action){
 const response=await fetch('./api/inventory-import',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,kind:kind.value,text:paste.value,sha:snapshot?.sha,adminToken:localStorage.getItem('inventory_admin_token_v2'),adminProof:proof()})});
 const body=await response.json().catch(()=>null);
 if(!response.ok)throw Error(body?.error||'خدمة الاستيراد لم تستجب (HTTP '+response.status+').');
 if(!body)throw Error('استجابة الخدمة غير صالحة؛ حاول مرة أخرى.');
 return body;
}
function csvToTsv(text){
 const first=text.split(/\r\n?|\n/,1)[0]||'',delim=first.includes('\t')?'\t':first.includes(';')?';':',';
 if(delim==='\t')return text;
 let quote=false,field='',row=[],out=[];
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++}else quote=!quote}else if(ch===delim&&!quote){row.push(field);field=''}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);out.push(row);row=[];field=''}else field+=ch}
 if(field||row.length){row.push(field);out.push(row)}
 return out.map(r=>r.map(x=>x.replace(/[\t\r\n]/g,' ')).join('\t')).join('\n');
}
async function xlsxLibrary(){
 if(window.XLSX)return window.XLSX;
 for(const url of ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js']){
  try{await new Promise((resolve,reject)=>{const js=document.createElement('script');js.src=url;js.onload=resolve;js.onerror=reject;document.head.append(js)});if(window.XLSX)return window.XLSX}catch{}}
 throw Error('تعذر تحميل قارئ Excel. افتح الملف وانسخ الأعمدة ثم الصقها هنا.');
}
async function importFile(file){
 if(!file||loading)return;
 invalidate();
 paste.value='';updateCount();source='لصق مباشر';
 el('v59-filename').textContent='لم يتم اختيار ملف';
 const ext=file.name.split('.').pop().toLowerCase();
 if(!['pdf','xlsx','xls','csv','tsv','txt'].includes(ext))throw Error('امتداد الملف غير مدعوم.');
 const limit=(ext==='pdf'?20:5)*1024*1024;
 if(file.size>limit)throw Error('حجم الملف أكبر من '+(ext==='pdf'?20:5)+' ميجابايت.');
 if(ext==='pdf'&&kind.value==='pricing')throw Error('تقرير المخزون PDF لا يتضمن سعر بيع. اختر كميات جدة أو الرياض.');
 setBusy(true);
 try {
  message('جارٍ قراءة الملف: '+file.name);
  let data,details='';
  if(ext==='pdf'){
   if(!window.BatcoPdfInventory)throw Error('قارئ PDF غير متاح. أعد تحميل الصفحة.');
   const parsed=await window.BatcoPdfInventory.readFile(file,(page,total)=>message('جارٍ قراءة تقرير PDF: صفحة '+page+' من '+total+'…'));
   data=parsed.text;details=' تم استخراج '+number(parsed.rows)+' صنف من '+number(parsed.pages)+' صفحة — رقم الصنف والكمية فقط.';
  }else if(ext==='xlsx'||ext==='xls'){
   const x=await xlsxLibrary(),book=x.read(await file.arrayBuffer(),{type:'array'});
   if(!book.SheetNames.length)throw Error('ملف Excel لا يحتوي على ورقة بيانات.');
   data=x.utils.sheet_to_csv(book.Sheets[book.SheetNames[0]],{FS:'\t',RS:'\n',blankrows:false});
  }else{data=await file.text();if(ext==='csv')data=csvToTsv(data)}
  if(data.length>1900000)throw Error('حجم بيانات الملف كبير؛ قسمه إلى دفعات.');
  paste.value=data;source=file.name;el('v59-filename').textContent=file.name;updateCount();
  message('تمت قراءة الملف بنجاح.'+details+' اضغط فحص ومعاينة التغييرات قبل الاعتماد.','success');
 } finally {setBusy(false)}
}
upload.addEventListener('change',async()=>{try{await importFile(upload.files?.[0])}catch(e){message('تعذرت قراءة الملف: '+e.message,'error')}});
paste.addEventListener('input',()=>{invalidate();source='لصق مباشر';el('v59-filename').textContent='بيانات ملصقة';updateCount()});
kind.addEventListener('change',()=>{invalidate();message('تم تغيير الوجهة؛ أعد الفحص قبل الحفظ.');el('v59-hint').textContent=kind.value==='pricing'?'التسعيرة: المطلوب رقم الصنف وسعر البيع، ويمكن لصق جدول جدة والرياض كاملًا.':'المخزون: يستخرج PDF رقم الصنف والكمية فقط؛ وتبقى بيانات الاسم والوحدة والشد دون تغيير.'});
clear.addEventListener('click',()=>{upload.value='';paste.value='';source='لصق مباشر';el('v59-filename').textContent='لم يتم اختيار ملف';invalidate();updateCount();message('تم مسح البيانات المدخلة فقط؛ المخزون لم يتغير.')});
const drop=el('v59-drop');
for(const e of ['dragover','dragenter'])drop.addEventListener(e,event=>{event.preventDefault();drop.classList.add('dragging')});
for(const e of ['drop','dragleave'])drop.addEventListener(e,event=>{event.preventDefault();drop.classList.remove('dragging')});
drop.addEventListener('drop',async event=>{try{await importFile(event.dataTransfer?.files?.[0])}catch(e){message('تعذرت قراءة الملف: '+e.message,'error')}});
preview.addEventListener('click',async()=>{
 if(loading)return;invalidate();
 if(!paste.value.trim()){message('ارفع ملفًا أو الصق الجدول أولًا.','error');return}
 setBusy(true);message('جارٍ مقارنة بيانات الملف بمخزون المستودع…');
 try{snapshot=await request('preview');show(snapshot.summary)}
 catch(e){invalidate();message('فشل الفحص: '+e.message,'error')}
 finally{setBusy(false)}
});
save.addEventListener('click',async()=>{
 if(loading||!snapshot)return;
 const count=Number(snapshot.summary?.changed||0)+Number(snapshot.summary?.added||0);
 if(!confirm('تأكيد اعتماد '+count+' صنف متغير أو جديد في '+kind.selectedOptions[0].textContent+'؟'))return;
 loading=true;save.disabled=true;preview.disabled=true;message('جارٍ حفظ التغييرات في GitHub…');
 try{const response=await request('save');snapshot=null;review.hidden=true;stage('save');message('تم حفظ التحديث وتحديث وقت آخر تعديل للمخزون'+(response.lastUpdate?' إلى '+response.lastUpdate+' بتوقيت السعودية':'')+'. سيظهر الوقت الجديد في النظام بعد اكتمال النشر ثم تحديث صفحة المخزون.'+(response.commit?' رقم العملية: '+response.commit:''),'success')}
 catch(e){invalidate();message('تعذر الحفظ: '+e.message+' أعد المعاينة للمحاولة مجددًا.','error')}
 finally{loading=false;preview.disabled=false}
});
updateCount();
})();