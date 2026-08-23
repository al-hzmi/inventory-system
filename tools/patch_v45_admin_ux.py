from pathlib import Path

FILES=['admin-dashboard.html','command-center.html']
TAG='<script src="./v45-admin-ux.js?v=45.0"></script>'
for name in FILES:
    p=Path(name)
    if not p.exists():
        raise SystemExit(f'MISSING {name}')
    s=p.read_text()
    s=s.replace(TAG,'')
    marker='</body>'
    pos=s.rfind(marker)
    if pos < 0:
        raise SystemExit(f'NO_BODY {name}')
    s=s[:pos]+TAG+'\n'+s[pos:]
    p.write_text(s)
print('V45_PATCH_OK', ','.join(FILES))
