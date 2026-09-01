from pathlib import Path
p=Path('stocktake.html')
t=p.read_text(encoding='utf-8')
old='placeholder="رقم الصنف أو الباركود"'
new='placeholder="اكتب رقم الصنف"'
if old not in t:
    raise SystemExit('V56.8 search placeholder marker missing')
p.write_text(t.replace(old,new,1),encoding='utf-8')
print('V56.8 primary SKU entry contract preserved')
