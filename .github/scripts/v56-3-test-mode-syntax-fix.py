from pathlib import Path

path = Path('admin-stocktake.html')
s = path.read_text()
old = "wanted=Math.min(30,Math.max(1,Math.trunc(Number($('#testCount').value)||12))),button=$('#testCreate')"
new = "wanted=Math.min(30,Math.max(1,Math.trunc(Number($('#testCount').value)||12)))),button=$('#testCreate')"
count = s.count(old)
if count != 1:
    raise SystemExit(f'expected exactly one V56.3 syntax anchor, found {count}')
path.write_text(s.replace(old, new, 1))
