from pathlib import Path
p=Path('admin-stocktake.html')
s=p.read_text(encoding='utf-8')
old='render();bindSelected();cleanupLegacyTestsOnce()'
new='render();bindSelected()'
if old not in s:
    raise SystemExit('auto-cleanup call anchor not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
print('disabled client auto cleanup; future full test campaigns are protected')