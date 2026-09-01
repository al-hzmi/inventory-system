from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing marker: {label}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, repl, label, flags=0):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'expected one regex match for {label}, got {count}')
    return out

stock_path = Path('stocktake.html')
admin_path = Path('admin-stocktake.html')
shell_path = Path('admin-stocktake-shell.html')
legacy_test_path = Path('tests/v56-5-stocktake-direct-mobile.mjs')

stock = stock_path.read_text(encoding='utf-8')
admin = admin_path.read_text(encoding='utf-8')
shell = shell_path.read_text(encoding='utf-8')
legacy_test = legacy_test_path.read_text(encoding='utf-8')

if 'v56-8-field-ux' in stock:
    raise SystemExit('V56.8 already applied')

# Employee state + barcode parity helpers.
stock = replace_once(
    stock,
    "scanner:null,activeEditId:'',unsubs:[]",
    "scanner:null,activeEditId:'',filterScroll:0,unsubs:[]",
    'employee filter scroll state',
)

helpers = r'''function cleanDigits(value){return eng(String(value??'')).replace(/\D/g,'')}
function resolveStocktakeSearch(raw){const value=String(raw??'').trim(),normalized=norm(value),clean=cleanDigits(value);let exact=state.items.find(i=>norm(i.sku)===normalized);if(!exact&&clean)exact=state.items.find(i=>cleanDigits(i.sku)===clean);if(exact)return{query:String(exact.sku),item:exact,fromBarcode:false};if(clean.length>=8&&/^\d+$/.test(clean)){const possible=state.items.filter(i=>{const d=cleanDigits(i.sku);return d&&d.length>=3&&clean.includes(d)}).sort((a,b)=>cleanDigits(b.sku).length-cleanDigits(a.sku).length);if(possible[0])return{query:String(possible[0].sku),item:possible[0],fromBarcode:true}}return{query:value,item:null,fromBarcode:false}}
function restoreFilterStrip(){requestAnimationFrame(()=>{const strip=$('.filters');if(!strip)return;strip.scrollLeft=state.filterScroll||0;strip.onscroll=()=>{state.filterScroll=strip.scrollLeft}})}
'''
stock = replace_once(stock, "function start(){", helpers + "function start(){", 'employee helpers')

# Field-work visual system.
field_css = r'''
<style id="v56-8-field-ux">
:root{--field:#111827;--field2:#1f2937;--fieldGreen:#16a34a;--fieldGreenSoft:#ecfdf3;--fieldBg:#f3f5f7;--fieldLine:#e5e7eb}
html,body{background:var(--fieldBg)}
.app{max-width:780px;padding:10px 12px max(34px,env(safe-area-inset-bottom))}
.top{top:0;padding:10px 2px 12px;background:rgba(243,245,247,.94);border-bottom:0;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.head{gap:9px}.back{width:46px;height:46px;border:1px solid #dde1e6;border-radius:14px;background:#fff;font-size:23px;box-shadow:0 2px 8px rgba(17,24,39,.05)}
.title{font-size:20px;line-height:1.35;letter-spacing:-.2px}.sub{font-size:12px;color:#6b7280;line-height:1.55}.net{padding:7px 10px;font-size:10px;background:#eafaf0;color:#137a36}
.panel{border:1px solid rgba(17,24,39,.055);border-radius:22px;padding:16px;margin-top:12px;box-shadow:0 10px 30px rgba(17,24,39,.055),0 1px 2px rgba(17,24,39,.04)}
.mission{position:relative;overflow:hidden;background:linear-gradient(145deg,#111827 0%,#182235 58%,#1f2937 100%);color:#fff;border:0;padding:18px;box-shadow:0 16px 34px rgba(17,24,39,.18)}
.mission:after{content:"";position:absolute;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.18),rgba(34,197,94,0) 67%);left:-62px;top:-72px;pointer-events:none}
.missionHead{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:14px}.missionEyebrow{font-size:11px;color:#a7f3d0;font-weight:700}.missionValue{font-size:34px;line-height:1;font-weight:700;letter-spacing:-1px;margin-top:4px;direction:ltr;text-align:right}.missionCopy{font-size:12px;color:#d1d5db;text-align:left;line-height:1.5}.mission .stats{position:relative;z-index:1;gap:7px}.mission .stat{background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:10px 7px}.mission .stat b{font-size:20px;color:#fff}.mission .stat span{font-size:10px;color:#cbd5e1}.mission .progress{position:relative;z-index:1;height:8px;background:rgba(255,255,255,.12);margin-top:13px}.mission .progress>i{background:linear-gradient(90deg,#22c55e,#4ade80);box-shadow:0 0 16px rgba(74,222,128,.35)}
.workbench{padding:15px 15px 14px}.scanPrompt{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}.scanPrompt b{display:block;font-size:15px}.scanPrompt span:not(.scanBadge){display:block;font-size:11px;color:#6b7280;margin-top:2px}.scanBadge{white-space:nowrap;background:var(--fieldGreenSoft);color:#15803d;border:1px solid #d1fae5;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:700}
.filters{gap:8px;padding:1px 1px 8px;scroll-snap-type:x proximity;overscroll-behavior-inline:contain}.chip{scroll-snap-align:center;min-height:42px;padding:0 14px;border-color:#e2e5e9;background:#fff;color:#4b5563;font-size:12px;box-shadow:0 1px 2px rgba(17,24,39,.025)}.chip.active{background:var(--field);color:#fff;border-color:var(--field);box-shadow:0 7px 16px rgba(17,24,39,.14)}.chip span{font-variant-numeric:tabular-nums}
.searchrow{grid-template-columns:minmax(0,1fr) 104px;gap:9px;margin-top:4px}.search{height:56px;border:1px solid #dfe3e8;border-radius:16px;padding:0 15px;background:#f8fafc;font-size:16px;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}.search:focus{border-color:#86efac;box-shadow:0 0 0 4px rgba(34,197,94,.10);background:#fff}.scan{height:56px;border:0;border-radius:16px;background:var(--field);color:#fff;display:flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;font-size:13px;font-weight:700;box-shadow:0 8px 18px rgba(17,24,39,.15)}.scan:active{transform:scale(.985)}.scanGlyph{font-size:19px;line-height:1}.scanLabel{font-size:13px}.workbench>.hint{margin-top:9px;color:#6b7280;font-size:10.5px}
.list{gap:11px;margin-top:13px}.card{border:1px solid rgba(17,24,39,.065);border-radius:20px;padding:15px;box-shadow:0 8px 24px rgba(17,24,39,.05),0 1px 2px rgba(17,24,39,.035)}.card.shortage{border-color:#fecaca;box-shadow:0 8px 24px rgba(185,28,28,.045)}.card.surplus{border-color:#bae6fd;box-shadow:0 8px 24px rgba(3,105,161,.045)}.card.matched{border-color:#bbf7d0}.sku{font-size:19px;letter-spacing:.2px}.name{font-size:12px;color:#6b7280;margin-top:3px}.pill{font-size:10px;padding:6px 9px}.blind{position:relative;margin-top:12px;border:1px solid #e2e8f0;background:linear-gradient(180deg,#f8fafc,#f5f7f9);border-radius:14px;padding:12px 12px 11px;color:#4b5563;font-size:11px}.blind:before{content:"العد الأول • مخفي";display:block;color:#111827;font-weight:700;font-size:11px;margin-bottom:3px}.qtygrid{gap:8px;margin-top:12px}.q{background:#f8fafc;border:1px solid #edf0f3;border-radius:13px;padding:10px 7px}.q span{font-size:10px}.q b{font-size:16px}.variance{border-radius:13px;padding:10px 11px;font-size:12px}.actions{gap:8px;margin-top:12px}.btn{min-height:46px;height:auto;border-radius:13px;font-size:12px}.btn.entry{min-height:50px;background:var(--field);border-color:var(--field);font-size:13px;box-shadow:0 7px 16px rgba(17,24,39,.12)}.btn.found{min-height:50px}.btn.note{width:50px;min-height:50px}.editbox{margin-top:11px;border-color:#e1e5ea;border-radius:16px;padding:11px;background:#f8fafc}.actual{height:54px;border-radius:13px;font-size:20px;background:#fff}.save{height:54px;border-radius:13px;background:#15803d;padding:0 20px;font-size:13px}.loadmore{height:50px;border-radius:15px}.empty{padding:58px 15px;font-size:13px}
.scanner{background:radial-gradient(circle at 50% 34%,#273449 0%,#111827 48%,#080b11 100%)}.scannerhead{padding:max(16px,env(safe-area-inset-top)) 16px 12px;font-size:14px}.scannerhead button{width:44px;height:44px;border-radius:14px;font-size:20px}.scannerbody{padding:16px 16px max(24px,env(safe-area-inset-bottom))}.scannerbody #reader{max-width:540px;border-radius:24px;overflow:hidden;background:#05070a;box-shadow:0 20px 70px rgba(0,0,0,.42)}
.toast{bottom:max(28px,env(safe-area-inset-bottom));border-radius:14px;padding:12px 16px;box-shadow:0 12px 34px rgba(17,24,39,.25)}
@media(max-width:520px){.app{padding-left:10px;padding-right:10px}.mission{padding:16px 13px}.missionHead{align-items:center}.missionValue{font-size:30px}.missionCopy{max-width:145px;font-size:11px}.mission .stats{grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.mission .stat{padding:9px 4px}.mission .stat b{font-size:18px}.mission .stat span{font-size:9px}.workbench{padding:14px 12px}.scanPrompt{align-items:flex-start}.searchrow{grid-template-columns:minmax(0,1fr) 92px}.scan{padding:0 10px}.card{padding:14px 12px}.qtygrid{gap:5px}.q{padding:9px 4px}}
@media(min-width:640px){.mission .stats{grid-template-columns:repeat(4,1fr)}.panel{padding:18px}.searchrow{grid-template-columns:minmax(0,1fr) 120px}}
</style>
'''
stock = replace_once(stock, '</head>', field_css + '</head>', 'field UX stylesheet')

# Upgrade employee render markup while preserving stocktake semantics.
stock = replace_once(
    stock,
    '<div class="panel"><div class="stats">',
    '<div class="panel mission"><div class="missionHead"><div><div class="missionEyebrow">تقدم المجموعة</div><div class="missionValue">${progress}%</div></div><div class="missionCopy">${counted===total&&total?\'اكتمل الجرد ✓\':`أنجز ${counted} من ${total} صنف`}</div></div><div class="stats">',
    'mission panel',
)
stock = replace_once(
    stock,
    '<div class="panel"><div class="filters">',
    '<div class="panel workbench"><div class="scanPrompt"><div><b>وضع الجرد السريع</b><span>امسح الباركود أو اكتب رقم الصنف</span></div><span class="scanBadge">جاهز للمسح</span></div><div class="filters">',
    'scan workbench',
)
old_search = '<div class="searchrow"><input id="search" class="search" value="${esc(state.search)}" inputmode="text" autocomplete="off" placeholder="اكتب رقم الصنف"><button id="scanBtn" class="scan" title="مسح الباركود">▣</button></div><div class="hint">الباركود اختياري. الكمية المسجلة بالنظام تبقى مخفية حتى اعتماد العد الأول.</div>'
new_search = '<div class="searchrow"><input id="search" class="search" value="${esc(state.search)}" inputmode="text" autocomplete="off" placeholder="رقم الصنف أو الباركود"><button id="scanBtn" class="scan" title="مسح الباركود" aria-label="مسح الباركود"><span class="scanGlyph">⌗</span><span class="scanLabel">مسح</span></button></div><div class="hint">يمكن مسح الباركود الطويل مباشرة؛ النظام يستخرج رقم الصنف منه تلقائيًا مثل بحث المخزون. كمية النظام تبقى مخفية حتى اعتماد العد الأول.</div>'
stock = replace_once(stock, old_search, new_search, 'professional scanner search row')

# Restore strip position after all live snapshot rerenders.
stock = replace_once(stock, 'bindUi(readonly);if(state.activeEditId)', 'bindUi(readonly);restoreFilterStrip();if(state.activeEditId)', 'restore filter strip after render')
stock = replace_once(
    stock,
    "document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;state.visible=80;render()});",
    "document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{const strip=b.closest('.filters');if(strip)state.filterScroll=strip.scrollLeft;state.filter=b.dataset.filter;state.visible=80;render()});",
    'filter click scroll preservation',
)

old_search_handler = "const se=$('#search');if(se)se.oninput=e=>{state.search=e.target.value;state.visible=80;state.activeEditId='';const exact=state.items.find(i=>norm(i.sku)===norm(state.search));if(exact)state.activeEditId=exact.id;render();const next=$('#search');if(next&&!state.activeEditId){next.focus();try{next.setSelectionRange(next.value.length,next.value.length)}catch{}}};"
new_search_handler = "const se=$('#search');if(se)se.oninput=e=>{const resolved=resolveStocktakeSearch(e.target.value);state.search=resolved.query;state.visible=80;state.activeEditId=resolved.item?.id||'';render();const next=$('#search');if(next&&!state.activeEditId){next.focus();try{next.setSelectionRange(next.value.length,next.value.length)}catch{}}};"
stock = replace_once(stock, old_search_handler, new_search_handler, 'barcode-aware manual search')

# Scanner parity with normal inventory search (unrestricted formats, 10fps, embedded SKU extraction).
scanner_pattern = r"async function startScanner\(\)\{.*?\}async function stopScanner\(\)"
scanner_repl = r'''async function startScanner(){if(state.scanner)return;$('#scanner').classList.add('open');try{const scanner=new Html5Qrcode('reader');state.scanner=scanner;await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:320,height:180},aspectRatio:1,disableFlip:true},txt=>{const value=String(txt||'').trim();if(!value)return;try{navigator.vibrate&&navigator.vibrate(35)}catch{}const resolved=resolveStocktakeSearch(value);stopScanner();state.search=resolved.query;state.filter='all';state.visible=80;state.activeEditId=resolved.item?.id||'';render();toast(resolved.item?(resolved.fromBarcode?`تم التعرف على الصنف ${resolved.item.sku} من الباركود`:`تم العثور على الصنف ${resolved.item.sku}`):'تمت قراءة الباركود ولم يوجد صنف مطابق')},()=>{})}catch(e){console.error(e);stopScanner();toast('تعذر تشغيل الكاميرا')}}async function stopScanner()'''
stock = regex_once(stock, scanner_pattern, scanner_repl, 'scanner parity', flags=re.S)

# Admin strip preservation + light professional polish + employee cache key.
admin = replace_once(admin, "tab:'all',search:'',editTeamId:'',import:", "tab:'all',search:'',editTeamId:'',tabScroll:0,import:", 'admin tab scroll state')
admin = replace_once(admin, "$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.0';", "$('#employeeView').onclick=()=>location.href='./stocktake.html?v=56.8';", 'admin employee link cache key')
admin = replace_once(admin, ';bindUi()}', ';bindUi();restoreAdminTabs()}', 'admin restore tabs after render')
admin = replace_once(
    admin,
    "function tab(id,label){return `<button class=\"tab ${state.tab===id?'active':''}\" data-tab=\"${id}\">${label}</button>`}\n",
    "function tab(id,label){return `<button class=\"tab ${state.tab===id?'active':''}\" data-tab=\"${id}\">${label}</button>`}\nfunction restoreAdminTabs(){requestAnimationFrame(()=>{const strip=$('.tabs');if(!strip)return;strip.scrollLeft=state.tabScroll||0;strip.onscroll=()=>{state.tabScroll=strip.scrollLeft}})}\n",
    'admin tab helper',
)
admin = replace_once(
    admin,
    "document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});",
    "document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{const strip=b.closest('.tabs');if(strip)state.tabScroll=strip.scrollLeft;state.tab=b.dataset.tab;render()});",
    'admin tab click preservation',
)
admin_polish = r'''
<style id="v56-8-admin-polish">
html,body{background:#f3f5f7}.panel{border-color:rgba(17,24,39,.06);border-radius:20px;box-shadow:0 9px 28px rgba(17,24,39,.05),0 1px 2px rgba(17,24,39,.035)}.card{border-color:#e2e6ea;border-radius:16px}.card.active{border-color:#111827;box-shadow:0 0 0 2px rgba(17,24,39,.045)}.tabs{gap:8px;padding:2px 1px 6px;scroll-snap-type:x proximity;overscroll-behavior-inline:contain}.tab{scroll-snap-align:center;min-height:42px;height:42px;padding:0 14px;border-color:#e1e5e9;font-size:11px}.tab.active{background:#111827;border-color:#111827;box-shadow:0 7px 16px rgba(17,24,39,.13)}.reviewSearch{border-radius:14px;background:#f8fafc}.stats .stat{border-color:#e7eaee;border-radius:13px}.progress{height:8px}.progress i{background:linear-gradient(90deg,#15803d,#22c55e)}
@media(max-width:719px){.panel{border-radius:18px}.tab{height:44px;font-size:13px}.teams .card{padding:14px}.mobileItem{border-radius:17px;border-color:#e2e6ea;box-shadow:0 5px 18px rgba(17,24,39,.04)}}
</style>
'''
admin = replace_once(admin, '</head>', admin_polish + '</head>', 'admin V56.8 polish')

# Cache bust both employee/admin shells.
shell = shell.replace('stocktake.html?v=56.6', 'stocktake.html?v=56.8').replace('admin-stocktake.html?embedded=1&v=56.6', 'admin-stocktake.html?embedded=1&v=56.8')
if 'v=56.6' in shell:
    raise SystemExit('stale V56.6 shell cache key remains')
legacy_test = legacy_test.replace("admin-stocktake.html?embedded=1&v=56.6", "admin-stocktake.html?embedded=1&v=56.8").replace("stocktake.html?v=56.6", "stocktake.html?v=56.8").replace('current V56.6 stocktake page', 'current V56.8 stocktake page').replace('current V56.6 cache key', 'current V56.8 cache key')

stock_path.write_text(stock, encoding='utf-8')
admin_path.write_text(admin, encoding='utf-8')
shell_path.write_text(shell, encoding='utf-8')
legacy_test_path.write_text(legacy_test, encoding='utf-8')

new_test = r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const employee=fs.readFileSync('stocktake.html','utf8');
const admin=fs.readFileSync('admin-stocktake.html','utf8');
const shell=fs.readFileSync('admin-stocktake-shell.html','utf8');
const has=(src,x,m)=>assert.ok(src.includes(x),m||`missing ${x}`);

has(employee,"filterScroll:0",'employee filter strip needs persistent scroll state');
has(employee,'function restoreFilterStrip()','employee filter strip must restore after rerender');
has(employee,"b.closest('.filters')",'employee filter click must capture strip position before rerender');
has(admin,"tabScroll:0",'admin tabs need persistent scroll state');
has(admin,'function restoreAdminTabs()','admin tabs must restore after rerender');
has(admin,"b.closest('.tabs')",'admin tab click must capture strip position before rerender');

has(employee,'function cleanDigits(value)','stocktake must normalize numeric barcode content');
has(employee,'function resolveStocktakeSearch(raw)','stocktake must resolve scanned barcodes to SKUs');
has(employee,'clean.includes(d)','barcode must support SKU embedded inside a long barcode');
has(employee,'cleanDigits(b.sku).length-cleanDigits(a.sku).length','embedded barcode resolution must prefer the longest SKU match');
has(employee,'const resolved=resolveStocktakeSearch(value)','camera scanner must use the same barcode resolver');
has(employee,'const resolved=resolveStocktakeSearch(e.target.value)','manual/pasted barcode search must use the same resolver');
has(employee,'fps:10','scanner must retain the proven inventory scanning cadence');
has(employee,'disableFlip:true','scanner must retain proven decode behavior');

has(employee,'id="v56-8-field-ux"','employee stocktake must use the V56.8 field UX');
has(employee,'class="panel mission"','employee stocktake must expose a progress mission panel');
has(employee,'class="scanPrompt"','employee stocktake must expose a scanner-first workbench');
has(employee,'class="scanLabel">مسح','scanner CTA must be explicit instead of a cryptic glyph-only button');
has(employee,'العد الأول أعمى','blind-count control must remain intact');
has(employee,'كمية النظام تبقى مخفية حتى اعتماد العد الأول','expected quantity must remain hidden before the first count');
has(admin,'id="v56-8-admin-polish"','admin stocktake should share the polished V56.8 visual system');
has(shell,'stocktake.html?v=56.8','employee stocktake cache key must be V56.8');
has(shell,'admin-stocktake.html?embedded=1&v=56.8','admin stocktake cache key must be V56.8');

console.log('V56.8 stocktake field UX + barcode parity + sticky strips regression: OK');
'''
Path('tests/v56-8-stocktake-field-ux.mjs').write_text(new_test, encoding='utf-8')

workflow = r'''name: V56.8 Stocktake Field UX Regression

on:
  push:
    paths:
      - 'stocktake.html'
      - 'admin-stocktake.html'
      - 'admin-stocktake-shell.html'
      - 'tests/v56-8-stocktake-field-ux.mjs'
      - 'tests/v56-5-stocktake-direct-mobile.mjs'
      - '.github/workflows/v56-8-stocktake-field-ux-regression.yml'
  pull_request:
    paths:
      - 'stocktake.html'
      - 'admin-stocktake.html'
      - 'admin-stocktake-shell.html'
      - 'tests/v56-8-stocktake-field-ux.mjs'
      - 'tests/v56-5-stocktake-direct-mobile.mjs'
      - '.github/workflows/v56-8-stocktake-field-ux-regression.yml'
  workflow_dispatch:

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify stocktake field UX, barcode parity and strip persistence
        run: |
          node tests/v56-8-stocktake-field-ux.mjs
          node tests/v56-5-stocktake-direct-mobile.mjs
          node tests/v56-6-admin-responsive.mjs
          node tests/v56-7-readable-audit.mjs
          node tests/v56-stocktake-workflow.mjs
'''
Path('.github/workflows/v56-8-stocktake-field-ux-regression.yml').write_text(workflow, encoding='utf-8')

print('V56.8 patch prepared')
