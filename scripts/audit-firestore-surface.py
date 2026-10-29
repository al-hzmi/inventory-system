"""Static call-site inventory. Does not connect to Firestore or infer billed reads."""
import json,re,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
paths=subprocess.check_output(['git','ls-files'],cwd=root,text=True).splitlines()
records=[];files=[]
patterns={'listener':r'\.onSnapshot\s*\(', 'transaction':r'\.runTransaction\s*\(', 'get_candidate':r'\.get\s*\(', 'timer':r'\bsetInterval\s*\(', 'write_candidate':r'\.(?:set|update|add|delete|commit)\s*\('}
for name in paths:
 p=root/name
 if p.suffix not in {'.js','.html','.txt','.cjs','.mjs'} or name.startswith(('tests/','tools/','scripts/','.github/','docs/','assets/build/')):continue
 try: source=p.read_text()
 except (UnicodeError,OSError):continue
 files.append({'path':name,'bytes':p.stat().st_size})
 for line_no,line in enumerate(source.splitlines(),1):
  categories={k:len(re.findall(v,line)) for k,v in patterns.items() if re.search(v,line)}
  if categories:records.append({'path':name,'line':line_no,'candidates':categories,'collections':re.findall(r"\.collection\(['\"]([^'\"]+)['\"]\)",line)})
out={'basis':'Static text scan, includes wrappers/runtime duplicates and non-Firestore Map.get/set. NOT billed operations or coverage proof. Manually trace candidates.','files':files,'callSites':records}
(root/'docs/reliability-20261028/firestore-call-sites.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'sourceFilesScanned':len(files),'candidateLines':len(records),'listeners':sum(r['candidates'].get('listener',0) for r in records),'transactions':sum(r['candidates'].get('transaction',0) for r in records)}))
