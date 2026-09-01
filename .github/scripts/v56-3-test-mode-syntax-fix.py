from pathlib import Path

path = Path('admin-stocktake.html')
s = path.read_text()
old = '||12)))'
new = '||12))))'
count = s.count(old)
if count != 2:
    raise SystemExit(f'expected exactly two V56.3 sample-size syntax anchors, found {count}')
path.write_text(s.replace(old, new))
