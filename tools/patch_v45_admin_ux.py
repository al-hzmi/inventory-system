from pathlib import Path

FILES=['index.html','customer.html','admin-dashboard.html','command-center.html']
TAG='<script src="./v45-admin-ux.js?v=45.0"></script>'
for name in FILES:
    p=Path(name)
    if not p.exists():
        raise SystemExit(f'MISSING {name}')
    s=p.read_text()
    s=s.replace(TAG,'')
    if '</body>' not in s:
        raise SystemExit(f'NO_BODY {name}')
    s=s.replace('</body>',TAG+'\n</body>',1)
    p.write_text(s)
print('V45_PATCH_OK', ','.join(FILES))
