from pathlib import Path

ROOT = Path('.')


def replace_once(path, old, new, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def insert_before(path, marker, block, label):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    if block.strip() in text:
        return
    count = text.count(marker)
    if count != 1:
        raise SystemExit(f'{label}: expected one marker in {path}, found {count}')
    p.write_text(text.replace(marker, block + marker, 1), encoding='utf-8')

employee_files = ['runtime/index-v37-source.txt', 'index.html']
customer_files = ['runtime/customer-v37-source.txt', 'customer.html']

employee_helper_old = """const removeImageBindingOverride = async ({ sku }) => {
    const exactSku=normalizeImageSku(sku);if(!exactSku)return;
    return imageBindingMutation({action:'unbind',sku:exactSku});
};

const parseCategories = (text) => {
"""
employee_helper_new = """const removeImageBindingOverride = async ({ sku }) => {
    const exactSku=normalizeImageSku(sku);if(!exactSku)return;
    return imageBindingMutation({action:'unbind',sku:exactSku});
};

// V56.33 — تحكم إداري دائم في قسم «جديدنا» بدون تعديل ملف التوليد التلقائي.
const NEW_ARRIVALS_ADMIN_BACKEND = './api/new-arrivals-admin';
const sanitizeNewArrivalOverrides = raw => ({
    include: [...new Set((Array.isArray(raw?.include) ? raw.include : []).map(normalizeCleanId).filter(Boolean))],
    exclude: [...new Set((Array.isArray(raw?.exclude) ? raw.exclude : []).map(normalizeCleanId).filter(Boolean))]
});
const loadNewArrivalOverrides = async () => {
    try {
        const r = await fetch(`${NEW_ARRIVALS_ADMIN_BACKEND}?action=overrides`, { cache:'no-store', headers:{'Cache-Control':'no-cache'} });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'NEW_ARRIVALS_OVERRIDES_LOAD_FAILED');
        return sanitizeNewArrivalOverrides(data);
    } catch (err) {
        console.warn('[V56.33 new arrivals overrides]', err);
        return { include:[], exclude:[] };
    }
};
const newArrivalMutation = async ({ action, sku }) => {
    const cleanSku = normalizeCleanId(sku);
    if (!cleanSku || !['add','remove','auto'].includes(action)) throw new Error('INVALID_NEW_ARRIVAL_ACTION');
    const r = await fetch(NEW_ARRIVALS_ADMIN_BACKEND, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ action, sku:cleanSku, updatedBy:'مهند', adminToken:imageAdminToken(), adminProof:imageAdminProof() })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || 'NEW_ARRIVALS_SAVE_FAILED');
    return sanitizeNewArrivalOverrides(data);
};

const parseCategories = (text) => {
"""

state_old = """    const [newArrivalsMeta, setNewArrivalsMeta] = useState({ items: [] });
"""
state_new = """    const [newArrivalsMeta, setNewArrivalsMeta] = useState({ items: [] });
    const [newArrivalOverrides, setNewArrivalOverrides] = useState({ include:[], exclude:[] });
"""

boot_old = """                const bindingOverrides = await loadImageBindingOverrides();
                if (!alive) return;
                setImageBindingOverrides(bindingOverrides);
                setImagesList(buildResolvedImagesMap(rawImgMap, nextDatabases, bindingOverrides));
                setNewArrivalsMeta(nJ && Array.isArray(nJ.items) ? nJ : { items: [] });
"""
boot_new = """                const [bindingOverrides, arrivalOverrides] = await Promise.all([loadImageBindingOverrides(), loadNewArrivalOverrides()]);
                if (!alive) return;
                setImageBindingOverrides(bindingOverrides);
                setImagesList(buildResolvedImagesMap(rawImgMap, nextDatabases, bindingOverrides));
                setNewArrivalsMeta(nJ && Array.isArray(nJ.items) ? nJ : { items: [] });
                setNewArrivalOverrides(arrivalOverrides);
"""

ids_old = """    const newArrivalIds = useMemo(() => new Set((newArrivalsMeta.items || []).map(row => normalizeCleanId(row.sku)).filter(Boolean)), [newArrivalsMeta]);
"""
ids_new = """    const newArrivalIds = useMemo(() => {
        const next = new Set((newArrivalsMeta.items || []).map(row => normalizeCleanId(row.sku)).filter(Boolean));
        (newArrivalOverrides.include || []).forEach(id => { const clean = normalizeCleanId(id); if (clean) next.add(clean); });
        (newArrivalOverrides.exclude || []).forEach(id => { const clean = normalizeCleanId(id); if (clean) next.delete(clean); });
        return next;
    }, [newArrivalsMeta, newArrivalOverrides]);
"""

handler_old = """    const currentCategoryById = useMemo(() => buildCategoryLookup(categories), [categories]);
    const imageCatalogItems = useMemo(() => {
"""
handler_new = """    const currentCategoryById = useMemo(() => buildCategoryLookup(categories), [categories]);
    const setNewArrivalManual = useCallback(async (item, shouldInclude) => {
        const sku = normalizeCleanId(item?.cleanId || item?.id || item);
        if (!sku) throw new Error('INVALID_SKU');
        const next = await newArrivalMutation({ action: shouldInclude ? 'add' : 'remove', sku });
        setNewArrivalOverrides(next);
        return next;
    }, []);
    useEffect(() => {
        let alive = true;
        const timer = setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            loadNewArrivalOverrides().then(next => { if (alive) setNewArrivalOverrides(next); });
        }, 15000);
        return () => { alive = false; clearInterval(timer); };
    }, []);
    const imageCatalogItems = useMemo(() => {
"""

panel_component = r'''const NewArrivalsAdminPanel = memo(({ catalogItems, newArrivalIds, onChange }) => {
    const [query, setQuery] = useState('');
    const [busySku, setBusySku] = useState('');
    const [notice, setNotice] = useState('');
    const results = useMemo(() => {
        const raw = query.trim();
        if (!raw) return [];
        const qClean = normalizeCleanId(raw);
        const qText = normalizeText(raw);
        return (catalogItems || []).filter(item => {
            const id = normalizeCleanId(item.cleanId || item.id);
            return (qClean && id.includes(qClean)) || (qText && normalizeText(item.name || '').includes(qText)) || normalizeText(item.id || '').includes(qText);
        }).slice(0, 8);
    }, [query, catalogItems]);

    const change = async item => {
        const sku = normalizeCleanId(item?.cleanId || item?.id);
        if (!sku || busySku) return;
        const included = newArrivalIds.has(sku);
        if (included && !window.confirm(`إزالة الصنف ${item.id || sku} من قسم جديدنا؟`)) return;
        setBusySku(sku); setNotice('');
        try {
            await onChange(item, !included);
            setNotice(included ? 'تمت الإزالة من جديدنا ✓' : 'تمت الإضافة إلى جديدنا ✓');
            if (!included) setQuery('');
            setTimeout(() => setNotice(''), 2200);
        } catch (err) {
            console.error('[V56.33 new arrivals admin]', err);
            alert(err?.message || 'تعذر تحديث قسم جديدنا.');
        } finally { setBusySku(''); }
    };

    return (
        <div className="mb-16 rounded-16 border border-accent/20 bg-accentSoft/30 p-14 sm:p-16 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-8 mb-12">
                <div>
                    <div className="text-[11px] font-bold text-accent">إدارة القسم</div>
                    <h3 className="text-[16px] font-bold text-primary mt-2">إضافة أو حذف منتج من «جديدنا»</h3>
                    <p className="text-[11px] text-secondary mt-3">التعديل يدوي ودائم، ولا يلغيه التحديث التلقائي للمخزون.</p>
                </div>
                <div className="text-[11px] text-secondary bg-white border border-border rounded-full px-10 h-30 inline-flex items-center self-start">{newArrivalIds.size} صنف</div>
            </div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث برقم الصنف أو اسم المنتج..."
                className="w-full h-44 px-12 rounded-12 border border-border bg-white text-[13px] outline-none focus:border-accent" />
            {notice && <div className="mt-8 text-[11px] font-bold text-success">{notice}</div>}
            {query.trim() && (
                <div className="mt-10 flex flex-col gap-6 max-h-[330px] overflow-y-auto overscroll-contain">
                    {results.length ? results.map(item => {
                        const sku = normalizeCleanId(item.cleanId || item.id);
                        const included = newArrivalIds.has(sku);
                        return <div key={sku} className="bg-white border border-border rounded-12 p-10 flex items-center gap-10">
                            <div className="min-w-0 flex-1">
                                <div className="text-[12px] font-bold text-primary bidi-isolate">{item.id}</div>
                                <div className="text-[11px] text-secondary truncate mt-2">{item.name || '—'}</div>
                            </div>
                            <span className={`hidden sm:inline-flex px-8 h-26 items-center rounded-full text-[9px] font-bold ${included ? 'bg-successSoft text-success' : 'bg-surface text-muted'}`}>{included ? 'ضمن جديدنا' : 'غير مضاف'}</span>
                            <button disabled={Boolean(busySku)} onClick={() => change(item)}
                                className={`h-34 px-12 rounded-10 border text-[11px] font-bold disabled:opacity-50 ${included ? 'bg-dangerSoft text-danger border-danger/15' : 'bg-accent text-white border-accent'}`}>
                                {busySku === sku ? 'جاري...' : included ? 'حذف' : 'إضافة'}
                            </button>
                        </div>;
                    }) : <div className="bg-white border border-border rounded-12 p-14 text-center text-[11px] text-muted">لا يوجد صنف مطابق.</div>}
                </div>
            )}
        </div>
    );
});

'''

panel_marker = "const GalleryCard = memo(({ item, imageFileName, showImage, isGrid, view, onTap, onCycle, onZoom, warehouseName, cart, setCart, isAdmin, currentCategory, onAdminCategoryEdit }) => {"

render_old = """                                        {galleryResults.length === 0 ? (
"""
render_new = """                                        {isAdmin && activeCategory === SPECIAL_CATEGORIES.NEW_ARRIVALS && (
                                            <NewArrivalsAdminPanel catalogItems={imageCatalogItems} newArrivalIds={newArrivalIds} onChange={setNewArrivalManual} />
                                        )}

                                        {galleryResults.length === 0 ? (
"""

for path in employee_files:
    replace_once(path, employee_helper_old, employee_helper_new, 'employee helper')
    replace_once(path, state_old, state_new, 'employee state')
    replace_once(path, boot_old, boot_new, 'employee boot')
    replace_once(path, ids_old, ids_new, 'employee ids')
    replace_once(path, handler_old, handler_new, 'employee handler')
    insert_before(path, panel_marker, panel_component, 'employee panel')
    replace_once(path, render_old, render_new, 'employee render')

customer_helper_old = """async function loadCustomerImageBindings(){
  try{const r=await fetch('./api/image-admin?action=bindings',{cache:'no-store',headers:{'Cache-Control':'no-cache'}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'IMAGE_BINDINGS_LOAD_FAILED');return data?.bindings||{}}catch(e){console.warn('[V56.32 customer image bindings]',e);return{}}
}
"""
customer_helper_new = customer_helper_old + """async function loadCustomerNewArrivalOverrides(){
  try{const r=await fetch('./api/new-arrivals-admin?action=overrides',{cache:'no-store',headers:{'Cache-Control':'no-cache'}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data?.error||'NEW_ARRIVALS_OVERRIDES_LOAD_FAILED');return {include:Array.isArray(data?.include)?data.include.map(normalizeCleanId).filter(Boolean):[],exclude:Array.isArray(data?.exclude)?data.exclude.map(normalizeCleanId).filter(Boolean):[]}}catch(e){console.warn('[V56.33 customer new arrivals overrides]',e);return{include:[],exclude:[]}}
}
"""

customer_state_old = """  const [loading,setLoading]=useState(true),[products,setProducts]=useState([]),[newArrivalsMeta,setNewArrivalsMeta]=useState({items:[]}),[baseCategories,setBaseCategories]=useState({}),"""
customer_state_new = """  const [loading,setLoading]=useState(true),[products,setProducts]=useState([]),[newArrivalsMeta,setNewArrivalsMeta]=useState({items:[]}),[newArrivalOverrides,setNewArrivalOverrides]=useState({include:[],exclude:[]}),[baseCategories,setBaseCategories]=useState({}),"""

customer_boot_old = """    Promise.all([fetchText(DATA_PATH+'jeddah.tsv'),fetchText(DATA_PATH+'riyadh.tsv'),fetchText(DATA_PATH+'images_list.txt'),fetchText(DATA_PATH+'categories.tsv'),fetchText(DATA_PATH+'pricing.tsv'),fetchJson(DATA_PATH+'new-arrivals.json'),loadCustomerImageBindings()]).then(([j,r,imgs,cats,pricingText,arrivals,bindings])=>{if(!alive)return;const images=buildImagesMap(imgs);const pricing=parsePricingMap(pricingText);const inventory=mergeInventories(parseInventory(j),parseInventory(r));const collisions=buildCustomerImageCollisionIndex(inventory);const merged=inventory.filter(x=>x.allowedMax>=CART_STEP).map(x=>{const imageFile=resolveCustomerImage(images,x,collisions,bindings);const cartonPrice=Number(pricing[x.cleanId]||0);const packNum=parseFloat(toEnglishDigits(x.pack||'').replace(/[^0-9.]/g,''));return {...x,imageFile,cartonPrice,approxPrice:cartonPrice>0&&Number.isFinite(packNum)&&packNum>0?cartonPrice/packNum:0}}).filter(x=>Boolean(x.imageFile));setProducts(merged);setNewArrivalsMeta(arrivals&&Array.isArray(arrivals.items)?arrivals:{items:[]});setBaseCategories(parseCategories(cats));setLoading(false)}).catch(err=>{console.error(err);if(alive){setLoading(false);setToast({type:'error',message:'تعذر تحميل بيانات المعرض.'})}});
"""
customer_boot_new = """    Promise.all([fetchText(DATA_PATH+'jeddah.tsv'),fetchText(DATA_PATH+'riyadh.tsv'),fetchText(DATA_PATH+'images_list.txt'),fetchText(DATA_PATH+'categories.tsv'),fetchText(DATA_PATH+'pricing.tsv'),fetchJson(DATA_PATH+'new-arrivals.json'),loadCustomerImageBindings(),loadCustomerNewArrivalOverrides()]).then(([j,r,imgs,cats,pricingText,arrivals,bindings,arrivalOverrides])=>{if(!alive)return;const images=buildImagesMap(imgs);const pricing=parsePricingMap(pricingText);const inventory=mergeInventories(parseInventory(j),parseInventory(r));const collisions=buildCustomerImageCollisionIndex(inventory);const merged=inventory.filter(x=>x.allowedMax>=CART_STEP).map(x=>{const imageFile=resolveCustomerImage(images,x,collisions,bindings);const cartonPrice=Number(pricing[x.cleanId]||0);const packNum=parseFloat(toEnglishDigits(x.pack||'').replace(/[^0-9.]/g,''));return {...x,imageFile,cartonPrice,approxPrice:cartonPrice>0&&Number.isFinite(packNum)&&packNum>0?cartonPrice/packNum:0}}).filter(x=>Boolean(x.imageFile));setProducts(merged);setNewArrivalsMeta(arrivals&&Array.isArray(arrivals.items)?arrivals:{items:[]});setNewArrivalOverrides(arrivalOverrides||{include:[],exclude:[]});setBaseCategories(parseCategories(cats));setLoading(false)}).catch(err=>{console.error(err);if(alive){setLoading(false);setToast({type:'error',message:'تعذر تحميل بيانات المعرض.'})}});
"""

customer_effective_old = """  const newArrivalProducts=useMemo(()=>{const byId=new Map(enriched.map(p=>[p.cleanId,p]));return (newArrivalsMeta.items||[]).map(row=>{const product=byId.get(normalizeCleanId(row.sku));return product?{...product,newFirstSeenAt:row.firstSeenAt,newDaysRemaining:row.daysRemaining}:null}).filter(Boolean)},[enriched,newArrivalsMeta]);
"""
customer_effective_new = """  const newArrivalProducts=useMemo(()=>{const byId=new Map(enriched.map(p=>[p.cleanId,p]));const metaById=new Map((newArrivalsMeta.items||[]).map(row=>[normalizeCleanId(row.sku),row]));const excluded=new Set((newArrivalOverrides.exclude||[]).map(normalizeCleanId).filter(Boolean));const manual=(newArrivalOverrides.include||[]).map(normalizeCleanId).filter(id=>id&&!excluded.has(id));const automatic=[...metaById.keys()].filter(id=>id&&!excluded.has(id)&&!manual.includes(id));return [...manual,...automatic].map(id=>{const product=byId.get(id),row=metaById.get(id);return product?{...product,newFirstSeenAt:row?.firstSeenAt||null,newDaysRemaining:row?.daysRemaining||30}:null}).filter(Boolean)},[enriched,newArrivalsMeta,newArrivalOverrides]);
"""

customer_effect_anchor = """  // الطلبات والمسودات لحظية: التنقل لصفحة «طلباتي» لا ينتظر أي جلب جديد.
"""
customer_poll = """  useEffect(()=>{let alive=true;const t=setInterval(()=>{if(document.visibilityState!=='visible')return;loadCustomerNewArrivalOverrides().then(x=>{if(alive)setNewArrivalOverrides(x)})},15000);return()=>{alive=false;clearInterval(t)}},[]);
"""

for path in customer_files:
    replace_once(path, customer_helper_old, customer_helper_new, 'customer helper')
    replace_once(path, customer_state_old, customer_state_new, 'customer state')
    replace_once(path, customer_boot_old, customer_boot_new, 'customer boot')
    replace_once(path, customer_effective_old, customer_effective_new, 'customer effective')
    insert_before(path, customer_effect_anchor, customer_poll, 'customer poll')

api_code = r'''const crypto = require('crypto');
const API_VERSION = '2026-03-10';
const STATE_REF = 'new-arrivals-state';
const STATE_PATH = 'data/new_arrivals_overrides.json';
const ADMIN_TOKEN_SHA256 = 'f03cbd5064d744450fd61c889dabc2874a8acbb0005d06561db00159bfd3c0c7';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cfg() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || '',
    repo: process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || '',
    branch: process.env.GITHUB_BRANCH || ''
  };
}

async function gh(config, path, options = {}) {
  const r = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'BATCO-New-Arrivals-Admin',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data?.message || `GitHub API ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

const norm = value => String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
const base = config => `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
const decode = row => row?.content ? Buffer.from(String(row.content).replace(/\s/g, ''), 'base64').toString('utf8') : '';

async function repoBranch(config) {
  const info = await gh(config, base(config));
  return config.branch || info.default_branch || 'main';
}

async function readText(config, path, ref) {
  try {
    const row = await gh(config, `${base(config)}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    return { text: decode(row), sha: row.sha || '' };
  } catch (err) {
    if (err.status === 404) return { text: '', sha: '' };
    throw err;
  }
}

async function ensureStateBranch(config, mainBranch) {
  try {
    const ref = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);
    return ref.object.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
    const main = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(mainBranch)}`);
    try {
      await gh(config, `${base(config)}/git/refs`, { method:'POST', body:JSON.stringify({ ref:`refs/heads/${STATE_REF}`, sha:main.object.sha }) });
    } catch (createErr) {
      if (createErr.status !== 422) throw createErr;
    }
    const ref = await gh(config, `${base(config)}/git/ref/heads/${encodeURIComponent(STATE_REF)}`);
    return ref.object.sha;
  }
}

function sanitize(raw) {
  const include = [...new Set((Array.isArray(raw?.include) ? raw.include : []).map(norm).filter(Boolean))];
  const exclude = [...new Set((Array.isArray(raw?.exclude) ? raw.exclude : []).map(norm).filter(Boolean))];
  const excluded = new Set(exclude);
  return { include: include.filter(id => !excluded.has(id)), exclude };
}

async function readState(config) {
  const row = await readText(config, STATE_PATH, STATE_REF);
  if (!row.text) return { state:{ include:[], exclude:[] }, sha:'' };
  try { return { state:sanitize(JSON.parse(row.text)), sha:row.sha }; }
  catch { return { state:{ include:[], exclude:[] }, sha:row.sha }; }
}

function sameOrigin(req) {
  const origin = String(req.headers?.origin || '');
  if (!origin) return true;
  try { return new URL(origin).host === String(req.headers?.host || ''); } catch { return false; }
}

function adminOK(req) {
  const supplied = String(req.body?.adminToken || '');
  const digest = crypto.createHash('sha256').update(supplied).digest('hex');
  const proof = req.body?.adminProof || {};
  return sameOrigin(req) && digest === ADMIN_TOKEN_SHA256 && proof?.role === 'admin' && Boolean(proof?.photoId);
}

async function validateSku(config, mainBranch, sku) {
  const [j, r] = await Promise.all([readText(config, 'data/jeddah.tsv', mainBranch), readText(config, 'data/riyadh.tsv', mainBranch)]);
  const found = [j.text, r.text].some(raw => {
    const lines = String(raw || '').split(/\r?\n/).filter(Boolean);
    if (!lines.length) return false;
    const headers = lines[0].split('\t');
    let idx = headers.findIndex(x => /رقم|كود|sku|item/i.test(x));
    if (idx < 0) idx = 0;
    return lines.slice(1).some(line => norm(line.split('\t')[idx] || '') === sku);
  });
  if (!found) { const err = new Error('الصنف المطلوب غير موجود في المخزون الحالي.'); err.status = 400; throw err; }
}

async function persist(config, state, updatedBy, message, existingSha) {
  const body = {
    message,
    content:Buffer.from(JSON.stringify({ ...sanitize(state), updatedAt:new Date().toISOString(), updatedBy:String(updatedBy || 'مهند'), version:'56.33' }, null, 2) + '\n', 'utf8').toString('base64'),
    branch:STATE_REF
  };
  if (existingSha) body.sha = existingSha;
  const result = await gh(config, `${base(config)}/contents/${STATE_PATH}`, { method:'PUT', body:JSON.stringify(body) });
  return result?.commit?.sha || null;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.setHeader('Allow', 'GET,POST,OPTIONS'); return json(res, 204, {}); }
  const config = cfg();
  const action = req.method === 'GET' ? String(req.query?.action || 'status') : String(req.body?.action || '');

  if (req.method === 'GET' && action === 'status') return json(res, 200, { configured:Boolean(config.token && config.owner && config.repo), owner:config.owner || null, repo:config.repo || null, version:'56.33' });
  if (req.method === 'GET' && action === 'overrides') {
    if (!config.token || !config.owner || !config.repo) return json(res, 503, { error:'خدمة إدارة جديدنا غير مهيأة على الخادم.' });
    try { const { state } = await readState(config); return json(res, 200, { ...state, version:'56.33' }); }
    catch (err) { console.error('[new-arrivals-admin read]', err); return json(res, 500, { error:'تعذر تحميل تعديلات جديدنا.' }); }
  }

  if (req.method !== 'POST') return json(res, 405, { error:'Method not allowed' });
  if (!config.token || !config.owner || !config.repo) return json(res, 503, { error:'خدمة إدارة جديدنا غير مهيأة على الخادم.' });
  if (!adminOK(req)) return json(res, 401, { error:'جلسة الإدارة غير صالحة لهذه العملية.' });
  if (!['add','remove','auto'].includes(action)) return json(res, 400, { error:'عملية غير معروفة.' });

  try {
    const sku = norm(req.body?.sku || '');
    if (!sku) return json(res, 400, { error:'رقم الصنف غير صالح.' });
    const mainBranch = await repoBranch(config);
    await validateSku(config, mainBranch, sku);
    await ensureStateBranch(config, mainBranch);
    const { state, sha } = await readState(config);
    let include = state.include.filter(id => id !== sku);
    let exclude = state.exclude.filter(id => id !== sku);
    if (action === 'add') include = [sku, ...include];
    if (action === 'remove') exclude = [sku, ...exclude];
    const next = sanitize({ include, exclude });
    const commitSha = await persist(config, next, req.body?.updatedBy, `state(new-arrivals): ${action} ${sku}`, sha);
    return json(res, 200, { ok:true, ...next, saved:sku, action, commitSha, version:'56.33' });
  } catch (err) {
    console.error('[new-arrivals-admin]', err);
    const status = [400,401,409].includes(err.status) ? err.status : 500;
    return json(res, status, { error:status === 409 ? 'حدث تعديل متزامن في جديدنا. أعد المحاولة.' : (err.message || 'تعذر تحديث جديدنا.') });
  }
};
'''
(ROOT / 'api/new-arrivals-admin.js').write_text(api_code, encoding='utf-8')

test_code = r'''import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const api=read('api/new-arrivals-admin.js');
const employee=read('runtime/index-v37-source.txt');
const customer=read('runtime/customer-v37-source.txt');
const index=read('index.html');
const customerHtml=read('customer.html');
assert.match(api,/STATE_REF = 'new-arrivals-state'/);
assert.match(api,/action === 'overrides'/);
assert.match(api,/\['add','remove','auto'\]/);
assert.match(api,/adminOK\(req\)/);
assert.match(api,/validateSku/);
assert.match(employee,/NEW_ARRIVALS_ADMIN_BACKEND = '\.\/api\/new-arrivals-admin'/);
assert.match(employee,/NewArrivalsAdminPanel/);
assert.match(employee,/setNewArrivalManual/);
assert.match(employee,/newArrivalOverrides\.include/);
assert.match(employee,/newArrivalOverrides\.exclude/);
assert.match(employee,/إضافة أو حذف منتج من «جديدنا»/);
assert.match(customer,/loadCustomerNewArrivalOverrides/);
assert.match(customer,/newArrivalOverrides/);
assert.match(customer,/\.\/api\/new-arrivals-admin\?action=overrides/);
assert.ok(index.includes('NewArrivalsAdminPanel'));
assert.ok(customerHtml.includes('loadCustomerNewArrivalOverrides'));
console.log('V56.33 new arrivals admin regression: PASS');
'''
(ROOT / 'tests/v56-33-new-arrivals-admin.mjs').write_text(test_code, encoding='utf-8')

regression_workflow = '''name: V56.33 New Arrivals Admin Regression\n\non:\n  push:\n    branches: [main]\n  pull_request:\n  workflow_dispatch:\n\npermissions:\n  contents: read\n\njobs:\n  regression:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Verify V56.33 contracts\n        run: |\n          node --check api/new-arrivals-admin.js\n          node tests/v56-33-new-arrivals-admin.mjs\n          git diff --check\n'''
(ROOT / '.github/workflows/v56-33-new-arrivals-admin-regression.yml').write_text(regression_workflow, encoding='utf-8')

smoke = ROOT / '.github/workflows/v56-12-production-smoke.yml'
smoke_text = smoke.read_text(encoding='utf-8')
needle = """          grep -Fq \"./api/image-admin?action=bindings\" /tmp/customer-runtime.txt\n\n          status=\"$(curl -fsSL --retry 3 --retry-delay 2 \"$PROD/api/image-admin?action=status\")\"\n"""
replacement = """          grep -Fq \"./api/image-admin?action=bindings\" /tmp/customer-runtime.txt\n          grep -Fq \"NEW_ARRIVALS_ADMIN_BACKEND = './api/new-arrivals-admin'\" /tmp/runtime.txt\n          grep -Fq \"./api/new-arrivals-admin?action=overrides\" /tmp/customer-runtime.txt\n\n          arrival_status=\"$(curl -fsSL --retry 3 --retry-delay 2 \"$PROD/api/new-arrivals-admin?action=status\")\"\n          echo \"$arrival_status\"\n          echo \"$arrival_status\" | grep -Fq '\"configured\":true'\n          curl -fsSL --retry 3 --retry-delay 2 \"$PROD/api/new-arrivals-admin?action=overrides\" -o /tmp/new-arrivals-overrides.json\n          grep -Fq '\"include\"' /tmp/new-arrivals-overrides.json\n          grep -Fq '\"exclude\"' /tmp/new-arrivals-overrides.json\n\n          status=\"$(curl -fsSL --retry 3 --retry-delay 2 \"$PROD/api/image-admin?action=status\")\"\n"""
if replacement not in smoke_text:
    if smoke_text.count(needle) != 1:
        raise SystemExit(f'production smoke anchor count={smoke_text.count(needle)}')
    smoke.write_text(smoke_text.replace(needle, replacement, 1), encoding='utf-8')

print('V56.33 new arrivals admin patch applied')
