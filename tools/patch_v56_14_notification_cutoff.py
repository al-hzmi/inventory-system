from pathlib import Path

CUTOFF="2026-09-02T00:26:00Z"
FILES=[Path('runtime/index-v37-source.txt'),Path('runtime/customer-v37-source.txt')]
old="const legacyOnce=row=>Math.max(1,Number(row.maxShows)||1)===1&&Math.max(0,Number(row.receiptPolicyVersion)||0)<2;"
new=("const LEGACY_ONCE_CUTOFF_MS=Date.parse('"+CUTOFF+"');\n"
     "        const legacyOnce=row=>{const max=Math.max(1,Number(row.maxShows)||1);if(max!==1)return false;const policy=Math.max(0,Number(row.receiptPolicyVersion)||0),created=row?.createdAt?.toMillis?row.createdAt.toMillis():(new Date(row?.createdAt||0).getTime()||0);return policy<2||(created>0&&created<LEGACY_ONCE_CUTOFF_MS)};")
old_retire="if(row.status!=='active'||max!==1||policy>=2)return;"
new_retire="if(row.status!=='active'||!legacyOnce(row))return;"

for path in FILES:
    text=path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'{path}: legacyOnce marker missing')
    text=text.replace(old,new,1)
    if old_retire not in text:
        raise SystemExit(f'{path}: retireLegacy marker missing')
    text=text.replace(old_retire,new_retire,1)
    path.write_text(text,encoding='utf-8')

for path in [Path('index.html'),Path('customer.html')]:
    text=path.read_text(encoding='utf-8')
    import re
    text,n=re.subn(r"(runtime/(?:index|customer)-v37-source\.txt\?v=)[0-9.]+",r"\g<1>56.14",text,count=1)
    if n!=1: raise SystemExit(f'{path}: runtime version marker missing')
    path.write_text(text,encoding='utf-8')

# Regression contract: both surfaces suppress pre-cutoff one-time messages regardless of policy version.
for path in FILES:
    text=path.read_text(encoding='utf-8')
    assert "LEGACY_ONCE_CUTOFF_MS=Date.parse('2026-09-02T00:26:00Z')" in text
    assert "policy<2||(created>0&&created<LEGACY_ONCE_CUTOFF_MS)" in text
    assert "if(row.status!=='active'||!legacyOnce(row))return;" in text
print('V56.14 notification cutoff patch applied')
