#!/usr/bin/env python3
import argparse, csv, io, json, math, os, subprocess
from collections import defaultdict
from datetime import datetime, timezone

BRANCH_FILES = {"jeddah": "data/jeddah.tsv", "riyadh": "data/riyadh.tsv"}
BRANCH_LABELS = {"jeddah": "جدة", "riyadh": "الرياض"}

# Confirmed correction incident on 2026-08-27. These commits changed inventory files while
# recovering from an accidental Riyadh/Jeddah overwrite. They are audit history, not sales.
MANUAL_EXCLUSIONS = {
    "0047432de994a04c3da176a1981996a01cc551b6": ("confirmed_branch_overwrite", "استبدال مخزون الرياض بمحتوى فرع آخر بالخطأ — مستبعد من المبيعات"),
    "216f77727a9f8657521bd31e5606afad2b169d7a": ("confirmed_branch_clear", "مسح مؤقت لمخزون الرياض أثناء التصحيح — مستبعد من المبيعات"),
    "114b085e0f7a4f5d25ffe8f1e694ebfa4ded0540": ("confirmed_incident_cleanup", "تعديل ضمن نافذة استعادة حادثة المخزون — مستبعد من المبيعات"),
    "d1e021d5a0030375c1817c9ed06b4849797bf0ec": ("confirmed_branch_restore", "استعادة مخزون الرياض الأصلي بعد المسح — مستبعد من المبيعات"),
}


def run_git(repo, *args, check=True):
    p = subprocess.run(["git", "-C", repo, *args], text=True, capture_output=True)
    if check and p.returncode != 0:
        raise RuntimeError(p.stderr.strip() or "git command failed")
    return p.stdout


def clean_num(v):
    try:
        n = float(str(v).strip().replace(",", ""))
        return n if math.isfinite(n) else 0.0
    except Exception:
        return 0.0


def clean_id(v):
    return str(v or "").strip()


def parse_inventory(text):
    rows = {}
    if not text:
        return rows
    reader = csv.reader(io.StringIO(text.replace("\r", "")), delimiter="\t")
    all_rows = list(reader)
    if not all_rows:
        return rows
    for cols in all_rows[1:]:
        if not cols:
            continue
        sku = clean_id(cols[0] if len(cols) > 0 else "")
        if not sku:
            continue
        rows[sku] = {
            "sku": sku,
            "name": str(cols[1] if len(cols) > 1 else "").strip(),
            "unit": str(cols[2] if len(cols) > 2 else "").strip(),
            "qty": clean_num(cols[3] if len(cols) > 3 else 0),
            "pack": clean_num(cols[4] if len(cols) > 4 else 0),
        }
    return rows


def parse_prices(text):
    out = {"jeddah": {}, "riyadh": {}}
    if not text:
        return out
    rows = list(csv.reader(io.StringIO(text.replace("\r", "")), delimiter="\t"))
    for cols in rows[2:]:
        if len(cols) >= 2:
            sku = clean_id(cols[0])
            if sku:
                out["jeddah"][sku] = clean_num(cols[1])
        if len(cols) >= 7:
            sku = clean_id(cols[5])
            if sku:
                out["riyadh"][sku] = clean_num(cols[6])
    return out


def git_show(repo, commit, path):
    p = subprocess.run(["git", "-C", repo, "show", f"{commit}:{path}"], text=True, capture_output=True)
    return p.stdout if p.returncode == 0 else ""


def parent_of(repo, commit):
    p = subprocess.run(["git", "-C", repo, "rev-parse", f"{commit}^"], text=True, capture_output=True)
    return p.stdout.strip() if p.returncode == 0 else ""


def changed_inventory_paths(repo, commit):
    p = subprocess.run(
        ["git", "-C", repo, "diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--",
         "data/jeddah.tsv", "data/riyadh.tsv"], text=True, capture_output=True
    )
    return [x.strip() for x in p.stdout.splitlines() if x.strip()]


def commit_meta(repo, commit):
    raw = run_git(repo, "show", "-s", "--format=%H%x1f%cI%x1f%s", commit).strip()
    parts = raw.split("\x1f")
    return {"commit": parts[0], "timestamp": parts[1] if len(parts)>1 else "", "message": parts[2] if len(parts)>2 else ""}


def inventory_stats(rows):
    return {
        "skuCount": len(rows),
        "positiveSkuCount": sum(1 for x in rows.values() if x["qty"] > 0),
        "totalQty": round(sum(x["qty"] for x in rows.values()), 6),
    }


def inventory_similarity(a, b):
    if not a or not b:
        return {"skuOverlap": 0.0, "qtyMatch": 0.0, "countRatio": 0.0}
    ak, bk = set(a), set(b)
    shared = ak & bk
    if not shared:
        return {"skuOverlap": 0.0, "qtyMatch": 0.0, "countRatio": round(min(len(a), len(b))/max(len(a), len(b)), 4)}
    overlap = len(shared) / max(1, min(len(a), len(b)))
    qty_match = sum(1 for sku in shared if abs(a[sku]["qty"] - b[sku]["qty"]) <= 1e-6) / len(shared)
    return {
        "skuOverlap": round(overlap, 4),
        "qtyMatch": round(qty_match, 4),
        "countRatio": round(min(len(a), len(b))/max(len(a), len(b)), 4),
    }


def make_event(repo, commit):
    parent = parent_of(repo, commit)
    if not parent:
        return None
    paths = changed_inventory_paths(repo, commit)
    if not paths:
        return None
    meta = commit_meta(repo, commit)
    prices = parse_prices(git_show(repo, commit, "data/pricing.tsv"))
    states = {}
    for branch, path in BRANCH_FILES.items():
        states[branch] = {
            "before": parse_inventory(git_show(repo, parent, path)),
            "after": parse_inventory(git_show(repo, commit, path)),
        }

    all_changes = []
    summary = {"inboundQty":0.0,"outboundQty":0.0,"netQty":0.0,"changedSkus":0,"zeroedSkus":0,
               "activatedSkus":0,"outboundValue":0.0,"inboundValue":0.0,"sameEventTransferQty":0.0,
               "unexplainedOutboundQty":0.0,"unexplainedInboundQty":0.0}
    per_sku_branch = defaultdict(dict)
    changed_skus = set()
    structure = {}

    for branch, path in BRANCH_FILES.items():
        before = states[branch]["before"]
        after = states[branch]["after"]
        other_branch = "riyadh" if branch == "jeddah" else "jeddah"
        other_before = states[other_branch]["before"]
        other_after = states[other_branch]["after"]
        before_stats, after_stats = inventory_stats(before), inventory_stats(after)
        added = set(after) - set(before)
        removed = set(before) - set(after)
        structure[branch] = {
            "changed": path in paths or before != after,
            "beforeSkuCount": before_stats["skuCount"],
            "afterSkuCount": after_stats["skuCount"],
            "beforePositiveSkuCount": before_stats["positiveSkuCount"],
            "afterPositiveSkuCount": after_stats["positiveSkuCount"],
            "beforeTotalQty": before_stats["totalQty"],
            "afterTotalQty": after_stats["totalQty"],
            "addedSkuCount": len(added),
            "removedSkuCount": len(removed),
            "otherBeforeSimilarity": inventory_similarity(before, other_before),
            "otherAfterSimilarity": inventory_similarity(after, other_after),
        }
        if path not in paths and before == after:
            continue
        for sku in sorted(set(before) | set(after)):
            b = before.get(sku, {"sku":sku,"name":after.get(sku,{}).get("name",""),"unit":"","qty":0.0,"pack":0.0})
            a = after.get(sku, {"sku":sku,"name":b.get("name",""),"unit":b.get("unit",""),"qty":0.0,"pack":b.get("pack",0.0)})
            delta = round(a["qty"] - b["qty"], 6)
            if abs(delta) < 1e-9:
                continue
            price = prices.get(branch, {}).get(sku, 0.0)
            ch = {"branch":branch,"branchLabel":BRANCH_LABELS[branch],"sku":sku,"name":a.get("name") or b.get("name") or sku,
                  "unit":a.get("unit") or b.get("unit") or "","pack":a.get("pack") or b.get("pack") or 0,
                  "before":b["qty"],"after":a["qty"],"delta":delta,"price":price,
                  "valueDelta":round(delta*price,2) if price else 0.0,"zeroed":b["qty"]>0 and a["qty"]<=0,
                  "activated":b["qty"]<=0 and a["qty"]>0,"transferMatchedQty":0.0}
            all_changes.append(ch); per_sku_branch[sku][branch]=ch; changed_skus.add(sku)
            if delta > 0:
                summary["inboundQty"] += delta; summary["inboundValue"] += delta*price
            else:
                summary["outboundQty"] += -delta; summary["outboundValue"] += (-delta)*price
            if ch["zeroed"]: summary["zeroedSkus"] += 1
            if ch["activated"]: summary["activatedSkus"] += 1

    transfers=[]
    for sku,pair in per_sku_branch.items():
        j,r=pair.get("jeddah"),pair.get("riyadh")
        if not j or not r: continue
        if j["delta"]<0<r["delta"]: qty=min(-j["delta"],r["delta"]);source,dest=j,r
        elif r["delta"]<0<j["delta"]: qty=min(-r["delta"],j["delta"]);source,dest=r,j
        else: continue
        if qty<=0: continue
        source["transferMatchedQty"]=round(qty,6);dest["transferMatchedQty"]=round(qty,6)
        transfers.append({"sku":sku,"name":source["name"] or dest["name"],"from":source["branch"],"fromLabel":source["branchLabel"],
                          "to":dest["branch"],"toLabel":dest["branchLabel"],"qty":round(qty,6),"confidence":"high"})
        summary["sameEventTransferQty"] += qty
    summary["changedSkus"]=len(changed_skus);summary["netQty"]=summary["inboundQty"]-summary["outboundQty"]
    summary["unexplainedOutboundQty"]=max(0.0,summary["outboundQty"]-summary["sameEventTransferQty"])
    summary["unexplainedInboundQty"]=max(0.0,summary["inboundQty"]-summary["sameEventTransferQty"])
    for k in list(summary):
        if isinstance(summary[k],float): summary[k]=round(summary[k],6 if "Qty" in k or k=="netQty" else 2)
    return {"id":commit[:12],**meta,"paths":paths,"summary":summary,"structure":structure,"transfers":transfers,
            "changes":sorted(all_changes,key=lambda x:abs(x["delta"]),reverse=True)}


def parse_ts(s):
    try:
        return datetime.fromisoformat(str(s or "").replace("Z", "+00:00"))
    except Exception:
        return None


def direct_exclusion(ev):
    commit = ev.get("commit", "")
    if commit in MANUAL_EXCLUSIONS:
        kind, reason = MANUAL_EXCLUSIONS[commit]
        return kind, reason, []

    restore_candidates = []
    for branch, m in (ev.get("structure") or {}).items():
        if not m.get("changed"):
            continue
        before_n = int(m.get("beforeSkuCount") or 0)
        after_n = int(m.get("afterSkuCount") or 0)
        before_pos = int(m.get("beforePositiveSkuCount") or 0)
        after_pos = int(m.get("afterPositiveSkuCount") or 0)
        added = int(m.get("addedSkuCount") or 0)
        removed = int(m.get("removedSkuCount") or 0)
        other_after = m.get("otherAfterSimilarity") or {}
        other_before = m.get("otherBeforeSimilarity") or {}

        if before_n >= 50 and after_n <= max(2, int(before_n * 0.05)):
            return "branch_clear", f"مسح شبه كامل لفرع {BRANCH_LABELS[branch]} ({before_n} → {after_n} صنف) — مستبعد تلقائيًا", []

        if before_pos >= 50 and after_pos <= max(2, int(before_pos * 0.08)):
            return "mass_zero", f"تصفير جماعي غير اعتيادي لفرع {BRANCH_LABELS[branch]} ({before_pos} → {after_pos} صنف موجب) — مستبعد تلقائيًا", []

        if (after_n >= 50 and float(other_after.get("countRatio") or 0) >= 0.85 and
                float(other_after.get("skuOverlap") or 0) >= 0.92 and float(other_after.get("qtyMatch") or 0) >= 0.90 and
                (float(other_before.get("skuOverlap") or 0) < 0.90 or float(other_before.get("qtyMatch") or 0) < 0.85)):
            return "branch_clone", f"محتوى فرع {BRANCH_LABELS[branch]} أصبح مطابقًا تقريبًا للفرع الآخر — مستبعد تلقائيًا", []

        if before_n >= 100 and after_n >= 100:
            churn = (added + removed) / max(before_n, after_n, 1)
            if churn >= 0.60:
                return "bulk_replacement", f"استبدال هيكلي واسع لفرع {BRANCH_LABELS[branch]} ({round(churn*100)}% تغير هوية الأصناف) — مستبعد تلقائيًا", []

        if before_n <= 2 and after_n >= 50:
            restore_candidates.append(branch)

    return "", "", restore_candidates


def classify_events(events, restore_window_hours=24):
    trusted, excluded = [], []
    last_incident = {}
    for ev in events:
        kind, reason, restore_candidates = direct_exclusion(ev)
        when = parse_ts(ev.get("timestamp"))
        if not kind and restore_candidates:
            for branch in restore_candidates:
                prev = last_incident.get(branch)
                if not prev or not when or not prev[0]:
                    continue
                hours = abs((when - prev[0]).total_seconds()) / 3600
                if hours <= restore_window_hours:
                    kind = "branch_restore"
                    reason = f"استعادة فرع {BRANCH_LABELS[branch]} بعد عملية تصحيح مستبعدة قبل {round(hours,1)} ساعة — مستبعد تلقائيًا"
                    break
        if kind:
            ev["analyticsExcluded"] = True
            ev["exclusionType"] = kind
            ev["exclusionReason"] = reason
            excluded.append(ev)
            for branch, m in (ev.get("structure") or {}).items():
                if m.get("changed"):
                    last_incident[branch] = (when, kind)
        else:
            ev["analyticsExcluded"] = False
            trusted.append(ev)
    return trusted, excluded


def compact_excluded(ev):
    return {k: ev.get(k) for k in ("id","commit","timestamp","message","paths","summary","structure","analyticsExcluded","exclusionType","exclusionReason")}


def cross_event_transfers(events,max_hours=72,min_ratio=0.70):
    negatives,positives=defaultdict(list),defaultdict(list)
    def pdt(s): return datetime.fromisoformat(s.replace("Z","+00:00"))
    for ev in events:
        for ch in ev.get("changes",[]):
            rem=abs(ch["delta"])-float(ch.get("transferMatchedQty",0) or 0)
            if rem<=1e-9: continue
            rec={"event":ev["id"],"timestamp":ev.get("timestamp",""),"branch":ch["branch"],"branchLabel":ch["branchLabel"],
                 "sku":ch["sku"],"name":ch["name"],"remaining":rem}
            (negatives if ch["delta"]<0 else positives)[ch["sku"]].append(rec)
    out=[]
    for sku in set(negatives)|set(positives):
        ns=sorted(negatives.get(sku,[]),key=lambda x:x["timestamp"]);ps=sorted(positives.get(sku,[]),key=lambda x:x["timestamp"])
        for n in ns:
            for p in ps:
                if n["remaining"]<=1e-9: break
                if p["remaining"]<=1e-9 or p["branch"]==n["branch"]: continue
                try: hours=abs((pdt(p["timestamp"])-pdt(n["timestamp"])).total_seconds())/3600
                except Exception: continue
                if hours>max_hours: continue
                largest=max(n["remaining"],p["remaining"])
                if largest<=1e-9: continue
                ratio=min(n["remaining"],p["remaining"])/largest
                if ratio<min_ratio: continue
                qty=min(n["remaining"],p["remaining"])
                if qty<=1e-9: continue
                n["remaining"]-=qty;p["remaining"]-=qty
                out.append({"sku":sku,"name":n["name"] or p["name"],"from":n["branch"],"fromLabel":n["branchLabel"],
                            "to":p["branch"],"toLabel":p["branchLabel"],"qty":round(qty,6),"fromEvent":n["event"],
                            "toEvent":p["event"],"hoursApart":round(hours,1),"quantityRatio":round(ratio,3),"confidence":"medium"})
    return sorted(out,key=lambda x:x["qty"],reverse=True)[:500]


def current_snapshot(repo,head):
    result={}
    for branch,path in BRANCH_FILES.items():
        rows=parse_inventory(git_show(repo,head,path))
        result[branch]={"label":BRANCH_LABELS[branch],"skuCount":len(rows),"positiveSkuCount":sum(1 for x in rows.values() if x["qty"]>0),
                        "totalQty":round(sum(x["qty"] for x in rows.values()),6)}
    return result


def aggregate(events):
    out=defaultdict(lambda:{"sku":"","name":"","outboundQty":0.0,"inboundQty":0.0,"events":0})
    for ev in events:
        seen=set()
        for ch in ev.get("changes",[]):
            x=out[ch["sku"]];x["sku"]=ch["sku"];x["name"]=ch.get("name") or ch["sku"]
            if ch["delta"]<0:x["outboundQty"]+=-ch["delta"]
            else:x["inboundQty"]+=ch["delta"]
            if ch["sku"] not in seen:x["events"]+=1;seen.add(ch["sku"])
    rows=[]
    for x in out.values():
        x["outboundQty"]=round(x["outboundQty"],6);x["inboundQty"]=round(x["inboundQty"],6);x["netQty"]=round(x["inboundQty"]-x["outboundQty"],6);rows.append(x)
    return {"topOutbound":sorted(rows,key=lambda x:x["outboundQty"],reverse=True)[:100],"topInbound":sorted(rows,key=lambda x:x["inboundQty"],reverse=True)[:100],
            "mostChanged":sorted(rows,key=lambda x:x["events"],reverse=True)[:100]}


def excluded_quality(excluded):
    outbound = 0.0
    inbound = 0.0
    for ev in excluded:
        s = ev.get("summary") or {}
        outbound += float(s.get("unexplainedOutboundQty") or 0)
        inbound += float(s.get("unexplainedInboundQty") or 0)
    latest = max((ev.get("timestamp","") for ev in excluded), default="")
    return {
        "excludedEventCount": len(excluded),
        "excludedOutboundQty": round(outbound, 6),
        "excludedInboundQty": round(inbound, 6),
        "latestExcludedAt": latest,
    }


def main():
    ap=argparse.ArgumentParser();ap.add_argument("--repo",default=".");ap.add_argument("--output",default="data/inventory-analytics.json");ap.add_argument("--limit",type=int,default=250);args=ap.parse_args()
    repo=os.path.abspath(args.repo);head=run_git(repo,"rev-parse","HEAD").strip()
    commits=run_git(repo,"log","--reverse","--format=%H","--","data/jeddah.tsv","data/riyadh.tsv").splitlines()[-args.limit:]
    raw_events=[]
    for c in commits:
        try:
            ev=make_event(repo,c)
            if ev and ev["changes"]: raw_events.append(ev)
        except Exception as e: print(f"WARN {c[:8]}: {e}")
    events, excluded = classify_events(raw_events)
    quality = excluded_quality(excluded)
    payload={"schema":2,"generatedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"head":head,
             "rawEventCount":len(raw_events),"eventCount":len(events),"excludedEventCount":len(excluded),
             "current":current_snapshot(repo,head),"events":list(reversed(events)),"excludedEvents":list(reversed([compact_excluded(x) for x in excluded])),
             "quality":quality,"transferCandidates":cross_event_transfers(events),"aggregate":aggregate(events),
             "notes":{"outbound":"انخفاض المخزون في الأحداث المقبولة هو تقدير حركة خروج، وليس إثبات بيع محاسبي بمفرده.",
                      "quality":"المسح الجماعي، نسخ فرع فوق فرع، الاستبدال الهيكلي الواسع، والاستعادة المرتبطة بحادثة مستبعدة لا تدخل في المبيعات أو التحويلات أو التجميعات.",
                      "excluded":"الأحداث المستبعدة تبقى في excludedEvents كأثر تدقيقي مختصر ولا تدخل في مؤشرات المبيعات.",
                      "transfer":"التحويلات المحتملة استدلال من انخفاض فرع وزيادة الفرع الآخر لنفس الصنف خلال 72 ساعة، ولا تعرض إلا عندما تكون الكميتان متقاربتين بنسبة 70% فأعلى.",
                      "pricing":"قيم الحركة تقديرية باستخدام سعر البيع الموجود في pricing.tsv عند ذلك الإصدار."}}
    out=os.path.join(repo,args.output);os.makedirs(os.path.dirname(out),exist_ok=True)
    with open(out,"w",encoding="utf-8") as f: json.dump(payload,f,ensure_ascii=False,separators=(",",":"))
    print(f"inventory analytics: {len(events)} trusted / {len(excluded)} excluded / {len(raw_events)} raw -> {args.output}")
if __name__=="__main__": main()
