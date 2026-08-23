from pathlib import Path


def once(s, old, new, label):
    if new in s:
        return s
    if old not in s:
        raise SystemExit(label)
    return s.replace(old, new, 1)

# Employee wrapper: define QA before the generated app, suppress legacy QA telemetry,
# allow zero-result searches to be observable in production, and load V44 runtime.
p=Path('index.html'); s=p.read_text()
s=once(s,
    "(async function(){\n  const CORE='./runtime/index-v37-source.txt?v=37.1';",
    "(async function(){\n  // V44_QA_BOOTSTRAP: automated browsers must never pollute production presence or logs.\n  window.__V44_QA=Boolean(['127.0.0.1','localhost'].includes(location.hostname)||navigator.webdriver===true||/[?&](?:qa|test)=1(?:&|$)/.test(location.search));\n  const CORE='./runtime/index-v37-source.txt?v=37.1';",
    'V44_INDEX_BOOT')
marker="    const msgStart=html.indexOf('const EmployeeAdminMessageScreen =');"
if 'V44_EMPLOYEE_CORE_PATCH' not in s:
    patch="""    // V44_EMPLOYEE_CORE_PATCH: keep QA out of legacy Firestore logs while preserving real production telemetry.\n    html=html.replace(\"if (!warehouse || !search || search.total === 0) return;\",\"if (window.__V44_QA || !warehouse || !search) return;\");\n    html=html.replace(\"let isTracking = true;\",\"let isTracking = !window.__V44_QA; if (window.__V44_QA) return;\");\n"""
    if marker not in s: raise SystemExit('V44_INDEX_CORE_MARKER')
    s=s.replace(marker,patch+marker,1)
write_marker='    document.open();document.write(html);document.close();'
if 'v44-observability.js?v=44.0' not in s:
    if write_marker not in s: raise SystemExit('V44_INDEX_WRITE_MARKER')
    s=s.replace(write_marker,"    html=html.replace('</body>','<script src=\"./v44-observability.js?v=44.0\"></scr'+'ipt></body>');\n"+write_marker,1)
p.write_text(s)

# Customer wrapper: QA includes webdriver, and V44 observability is injected after all V40-V43 transforms.
p=Path('customer.html'); s=p.read_text()
s=once(s,
    "(async function(){\n  const params=new URLSearchParams(location.search)",
    "(async function(){\n  // V44_QA_BOOTSTRAP\n  window.__V44_QA=Boolean(['127.0.0.1','localhost'].includes(location.hostname)||navigator.webdriver===true||/[?&](?:qa|test)=1(?:&|$)/.test(location.search));\n  const params=new URLSearchParams(location.search)",
    'V44_CUSTOMER_BOOT')
s=s.replace("['127.0.0.1','localhost'].includes(location.hostname)","(['127.0.0.1','localhost'].includes(location.hostname)||navigator.webdriver===true||window.__V44_QA===true)")
write_marker='    document.open();document.write(html);document.close();'
if 'v44-observability.js?v=44.0' not in s:
    if write_marker not in s: raise SystemExit('V44_CUSTOMER_WRITE_MARKER')
    s=s.replace(write_marker,"    html=html.replace('</body>','<script src=\"./v44-observability.js?v=44.0\"></scr'+'ipt></body>');\n"+write_marker,1)
p.write_text(s)

# Old admin remains useful, but test identities are hidden and a compact command-center entry is added.
p=Path('admin-dashboard.html'); s=p.read_text()
if 'v44-admin-bridge.js?v=44.0' not in s:
    if '</body>' not in s: raise SystemExit('V44_ADMIN_BODY')
    s=s.replace('</body>','<script src="./v44-admin-bridge.js?v=44.0"></script>\n</body>',1)
p.write_text(s)

# Security center also gets the same small navigation entry without altering its workflows.
p=Path('security-center.html'); s=p.read_text()
if 'v44-admin-bridge.js?v=44.0' not in s:
    if '</body>' not in s: raise SystemExit('V44_SECURITY_BODY')
    s=s.replace('</body>','<script src="./v44-admin-bridge.js?v=44.0"></script>\n</body>',1)
p.write_text(s)

print('V44_PATCH_OK')
