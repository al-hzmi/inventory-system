from pathlib import Path

path = Path('admin-stocktake.html')
s = path.read_text()
old = "button=$('#testCreate'];"
new = "button=$('#testCreate');"
count = s.count(old)
if count != 1:
    raise SystemExit(f'expected exactly one V56.3 selector typo, found {count}')
path.write_text(s.replace(old, new, 1))
