from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
core_path = ROOT / 'runtime/index-v37-source.txt'
index_path = ROOT / 'index.html'
core = core_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')

old_loader = """        let __fbPromise = null;
        const loadScript = (src) => new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('load failed: ' + src));
            document.head.appendChild(s);
        });
        
        function getDb() {
            if (__fbPromise) return __fbPromise;
            __fbPromise = loadScript(\"https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js\")
                .then(() => loadScript(\"https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js\"))
                .then(() => {
                    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                    const db = firebase.firestore();
                    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                        console.warn(\"تنبيه: تعذر تفعيل وضع الأوفلاين للفايربيس\", err.code);
                    });
                    return db;
                });
            return __fbPromise;
        }
"""
new_loader = """        let __fbPromise = null;
        const FIREBASE_SCRIPT_TIMEOUT_MS = 8000;
        const loadScript = (src, timeoutMs = FIREBASE_SCRIPT_TIMEOUT_MS) => new Promise((res, rej) => {
            const existing = [...document.scripts].find(s => String(s.src || '') === src);
            if (existing && ((src.includes('firebase-app-compat') && window.firebase) || (src.includes('firebase-firestore-compat') && window.firebase?.firestore))) { res(); return; }
            const s = existing || document.createElement('script');
            let settled = false;
            const finish = (ok, error) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (ok) res(); else rej(error || new Error('load failed: ' + src));
            };
            const timer = setTimeout(() => {
                if (!existing) try { s.remove(); } catch {}
                finish(false, Object.assign(new Error('script timeout: ' + src), { code: 'SCRIPT_TIMEOUT' }));
            }, timeoutMs);
            s.onload = () => finish(true);
            s.onerror = () => finish(false, new Error('load failed: ' + src));
            if (!existing) { s.src = src; s.async = true; document.head.appendChild(s); }
        });
        
        function getDb() {
            if (__fbPromise) return __fbPromise;
            __fbPromise = loadScript(\"https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js\")
                .then(() => loadScript(\"https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js\"))
                .then(() => {
                    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
                    const db = firebase.firestore();
                    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
                        console.warn(\"تنبيه: تعذر تفعيل وضع الأوفلاين للفايربيس\", err.code);
                    });
                    return db;
                })
                .catch((err) => { __fbPromise = null; throw err; });
            return __fbPromise;
        }
"""
if old_loader not in core:
    raise SystemExit('V55_1_FIREBASE_LOADER_MARKER_MISSING')
core = core.replace(old_loader, new_loader, 1)

login_marker = "const LoginScreen = ({ onLogin, initialName = '' }) => {"
helpers = """const LOGIN_LOOKUP_TIMEOUT_MS = 7000;
const loginLookupTimeout = (promise, ms = LOGIN_LOOKUP_TIMEOUT_MS) => new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(Object.assign(new Error('LOGIN_LOOKUP_TIMEOUT'), { code: 'LOGIN_LOOKUP_TIMEOUT' }));
    }, ms);
    Promise.resolve(promise).then(value => {
        if (settled) return;
        settled = true; clearTimeout(timer); resolve(value);
    }, error => {
        if (settled) return;
        settled = true; clearTimeout(timer); reject(error);
    });
});

const LoginScreen = ({ onLogin, initialName = '' }) => {"""
if login_marker not in core:
    raise SystemExit('V55_1_LOGIN_MARKER_MISSING')
core = core.replace(login_marker, helpers, 1)

old_refs = """    const codeRef = useRef(null);
    const autoProbeRef = useRef(false);
"""
new_refs = """    const codeRef = useRef(null);
    const autoProbeRef = useRef(false);
    const verifyAttemptRef = useRef(0);
"""
if old_refs not in core:
    raise SystemExit('V55_1_LOGIN_REFS_MARKER_MISSING')
core = core.replace(old_refs, new_refs, 1)

core = core.replace("    const resolveNameFlow = async (trimmed) => {", "    const resolveNameFlow = async (trimmed, attemptId = verifyAttemptRef.current) => {", 1)
core = core.replace("        const account = await resolveEmployeeAccount(trimmed);", "        const account = await loginLookupTimeout(resolveEmployeeAccount(trimmed));\n        if (attemptId !== verifyAttemptRef.current) return;", 1)
core = core.replace("        const legacy = await resolveLegacyEmployeeIdentity(trimmed);", "        const legacy = await loginLookupTimeout(resolveLegacyEmployeeIdentity(trimmed));\n        if (attemptId !== verifyAttemptRef.current) return;", 1)

old_submit = """    const handleNameSubmit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || loading) return;
        setError(''); setCode(''); setLoading(true);
        try { await resolveNameFlow(trimmed); }
        catch (err) { console.error(err); setError('تعذر التحقق من حساب الموظف. حاول مرة أخرى.'); }
        finally { setLoading(false); }
    };
"""
new_submit = """    const handleNameSubmit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || loading) return;
        const attemptId = ++verifyAttemptRef.current;
        setError(''); setCode(''); setLoading(true);
        try { await resolveNameFlow(trimmed, attemptId); }
        catch (err) {
            if (attemptId !== verifyAttemptRef.current) return;
            console.error(err);
            setError(err?.code === 'LOGIN_LOOKUP_TIMEOUT' || err?.code === 'SCRIPT_TIMEOUT'
                ? 'الاتصال تأخر قليلًا. اضغط متابعة مرة أخرى — لا تحتاج تحديث الصفحة.'
                : 'تعذر التحقق من حساب الموظف. حاول مرة أخرى.');
        }
        finally { if (attemptId === verifyAttemptRef.current) setLoading(false); }
    };
"""
if old_submit not in core:
    raise SystemExit('V55_1_SUBMIT_MARKER_MISSING')
core = core.replace(old_submit, new_submit, 1)

old_probe = """    useEffect(() => {
        if (autoProbeRef.current || !initialName || isProtectedName(initialName)) return;
        autoProbeRef.current = true;
        setLoading(true);
        resolveNameFlow(String(initialName).trim()).catch(()=>{}).finally(()=>setLoading(false));
    }, []);
"""
new_probe = """    useEffect(() => {
        if (autoProbeRef.current || !initialName || isProtectedName(initialName)) return;
        autoProbeRef.current = true;
        const attemptId = ++verifyAttemptRef.current;
        setLoading(true);
        resolveNameFlow(String(initialName).trim(), attemptId)
            .catch(err => {
                if (attemptId !== verifyAttemptRef.current) return;
                console.warn('[Employee auto verify]', err?.message || err);
                setStep('name');
                if (err?.code === 'LOGIN_LOOKUP_TIMEOUT' || err?.code === 'SCRIPT_TIMEOUT') setError('الاتصال تأخر قليلًا. اضغط متابعة مرة أخرى.');
            })
            .finally(() => { if (attemptId === verifyAttemptRef.current) setLoading(false); });
    }, []);
"""
if old_probe not in core:
    raise SystemExit('V55_1_AUTOPROBE_MARKER_MISSING')
core = core.replace(old_probe, new_probe, 1)

# Warm Firebase in the background so the employee usually never sees the verification spinner.
warm_marker = "    useEffect(() => { if ((step === 'password' || step === 'employee_password' || step === 'activate_password') && codeRef.current) codeRef.current.focus(); }, [step]);\n"
warm_patch = warm_marker + "    useEffect(() => { getDb().catch(err => console.warn('[Employee login prewarm]', err?.message || err)); }, []);\n"
if warm_marker not in core:
    raise SystemExit('V55_1_PREWARM_MARKER_MISSING')
core = core.replace(warm_marker, warm_patch, 1)

for required in ['LOGIN_LOOKUP_TIMEOUT_MS = 7000', "__fbPromise = null; throw err", 'verifyAttemptRef = useRef(0)', 'لا تحتاج تحديث الصفحة']:
    if required not in core:
        raise SystemExit('V55_1_OUTPUT_CHECK_' + required)

if "const CORE='./runtime/index-v37-source.txt?v=55.0';" not in index:
    raise SystemExit('V55_1_INDEX_CORE_VERSION_MARKER_MISSING')
index = index.replace("const CORE='./runtime/index-v37-source.txt?v=55.0';", "const CORE='./runtime/index-v37-source.txt?v=55.1';", 1)

core_path.write_text(core, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
print('V55.1 login resilience patch applied')
