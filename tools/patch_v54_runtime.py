#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

obs=ROOT/'v44-observability.js'
s=obs.read_text(encoding='utf-8')
marker="function boot(){db=initDb();if(!db){setTimeout(boot,450);return}window.__V44_OBSERVABILITY={version:VERSION,actor:me,log,permissions:()=>({...effective}),syncCart};connectPermissions();"
replacement="function loadV54Policy(){if(document.getElementById('v54-policy-runtime'))return;const s=document.createElement('script');s.id='v54-policy-runtime';s.src='./v54-policy-engine.js?v=54.0';s.async=true;document.head.appendChild(s)}\nfunction boot(){db=initDb();if(!db){setTimeout(boot,450);return}window.__V44_OBSERVABILITY={version:VERSION,actor:me,log,permissions:()=>({...effective}),syncCart};loadV54Policy();connectPermissions();"
if replacement not in s:
    if marker not in s: raise SystemExit('V54_OBSERVABILITY_MARKER_MISSING')
    s=s.replace(marker,replacement,1)
obs.write_text(s,encoding='utf-8')

p=ROOT/'tools/inventory_analytics.py'
s=p.read_text(encoding='utf-8')
old='''def current_snapshot(repo,head):
    result={}
    for branch,path in BRANCH_FILES.items():
        rows=parse_inventory(git_show(repo,head,path))
        result[branch]={"label":BRANCH_LABELS[branch],"skuCount":len(rows),"positiveSkuCount":sum(1 for x in rows.values() if x["qty"]>0),
                        "totalQty":round(sum(x["qty"] for x in rows.values()),6)}
    return result
'''
new='''def current_snapshot(repo,head):
    result={}
    prices=parse_prices(git_show(repo,head,"data/pricing.tsv"))
    for branch,path in BRANCH_FILES.items():
        rows=parse_inventory(git_show(repo,head,path));items=[]
        for sku,row in rows.items():
            price=prices.get(branch,{}).get(sku,0.0);qty=row["qty"];pack=row.get("pack",0) or 0;limit=pack if pack>0 else 5
            items.append({"sku":sku,"name":row.get("name","") or sku,"unit":row.get("unit","") or "","qty":qty,"pack":pack,"price":price,
                          "value":round(max(0,qty)*price,2) if price else 0.0,"low":qty>0 and qty<=limit})
        result[branch]={"label":BRANCH_LABELS[branch],"skuCount":len(items),"positiveSkuCount":sum(1 for x in items if x["qty"]>0),
                        "zeroSkuCount":sum(1 for x in items if x["qty"]==0),"negativeSkuCount":sum(1 for x in items if x["qty"]<0),
                        "lowStockSkuCount":sum(1 for x in items if x["low"]),"noPriceSkuCount":sum(1 for x in items if x["qty"]>0 and not x["price"]),
                        "totalQty":round(sum(x["qty"] for x in items),6),"inventoryValue":round(sum(x["value"] for x in items),2),
                        "items":sorted(items,key=lambda x:(x["qty"],x["sku"]))}
    return result
'''
if new not in s:
    if old not in s: raise SystemExit('V54_ANALYTICS_MARKER_MISSING')
    s=s.replace(old,new,1)
s=s.replace('"outbound":"انخفاض المخزون مؤكد من فرق النسخ، لكنه ليس إثبات بيع بمفرده."','"outbound":"يُعامل انخفاض المخزون كمبيعات داخل لوحة الإدارة، مع استبعاد التحويل المطابق بين الفرعين."')
p.write_text(s,encoding='utf-8')
print('V54_RUNTIME_PATCH_OK')
