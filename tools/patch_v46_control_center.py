from pathlib import Path
FILES=['admin-dashboard.html','command-center.html']
TAG='<script src="./v46-admin-nav.js?v=46.0"></script>'
for name in FILES:
    p=Path(name)
    s=p.read_text()
    s=s.replace(TAG,'')
    if '</body>' not in s:
        raise SystemExit(f'NO_BODY {name}')
    s=s.replace('</body>',TAG+'\n</body>',1)
    p.write_text(s)
print('V46_PATCH_OK',','.join(FILES))
