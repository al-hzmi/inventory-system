(function(){
const root=document.getElementById('app');
let proof={};try{proof=JSON.parse(localStorage.getItem('inventory_login_photo_proof_v2')||'{}')}catch(e){}
if(localStorage.getItem('inventory_user_name_v2')!=='مهند'||localStorage.getItem('inventory_admin_token_v2')!=='1jh297-spgf2z'||proof.role!=='admin'||!proof.photoId){location.replace('./index.html?employee=1');return}
document.body.style='font:16px system-ui;background:#f5f7f6;color:#173d30;max-width:760px;margin:30px auto;padding:20px';
root.innerHTML='<p>ارفع CSV أو TSV، أو الصق الجدول المنسوخ من Excel. يجب تضمين صف العناوين.</p><label>نوع التحديث</label><p><select id="kind"><option value="jeddah">كميات جدة</option><option value="riyadh">كميات الرياض</option><option value="pricing">التسعيرة</option></select></p><input type="file" id="file" accept=".csv,.tsv,.txt"><p>ملفات XLSX: افتحها في Excel وانسخ الأعمدة والصقها أدناه.</p><textarea id="data" rows="13" style="width:100%;box-sizing:border-box;direction:ltr" placeholder="الصق الجدول هنا"></textarea><p><button id="preview">فحص ومعاينة</button> <button id="save" disabled>اعتماد التحديث</button></p><pre id="result" style="white-space:pre-wrap"></pre><a href="./admin-home.html">العودة للإدارة</a>';
const el=id=>document.getElementById(id);let snapshot=null;
function reset(){snapshot=null;el('save').disabled=true}
el('kind').onchange=reset;el('data').oninput=reset;
el('file').onchange=async()=>{reset();const f=el('file').files[0];if(f)el('data').value=await f.text()};
async function call(action){const response=await fetch('./api/inventory-import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,kind:el('kind').value,text:el('data').value,sha:snapshot&&snapshot.sha,adminToken:localStorage.getItem('inventory_admin_token_v2'),adminProof:proof})});const data=await response.json();if(!response.ok)throw Error(data.error||'فشل الطلب');return data}
el('preview').onclick=async()=>{reset();el('result').textContent='جار الفحص';try{snapshot=await call('preview');el('result').textContent=JSON.stringify(snapshot.summary,null,2);el('save').disabled=false}catch(e){el('result').textContent=e.message}};
el('save').onclick=async()=>{if(!snapshot||!confirm('تأكيد تحديث البيانات؟'))return;el('save').disabled=true;try{const result=await call('save');el('result').textContent='تم الحفظ\n'+JSON.stringify(result.summary,null,2);reset()}catch(e){el('result').textContent=e.message;reset()}};
})();