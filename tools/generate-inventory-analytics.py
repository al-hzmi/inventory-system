#!/usr/bin/env python3
"""Build admin inventory movement analytics from Git history.

The inventory TSV files are the source of truth. This script reconstructs quantity
movements from commits, detects same-commit inter-warehouse transfers, and writes
a static JSON document consumed by the admin movement dashboard.
"""
from __future__ import annotations

import csv
import io
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "inventory-analytics.json"
PATHS = {
    "jeddah": ROOT / "data" / "jeddah.tsv",
    "riyadh": ROOT / "data" / "riyadh.tsv",
}
LABELS = {"jeddah": "جدة", "riyadh": "الرياض"}
HISTORY_DAYS = 365


def git(*args: str, check: bool = True) -> str:
    p = subprocess.run(
        ["git", *args], cwd=ROOT, text=True, encoding="utf-8",
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    if check and p.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {p.stderr.strip()}")
    return p.stdout


def english_digits(value: str) -> str:
    return str(value or "").translate(str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789"))


def clean_sku(value: str) -> str:
    text = english_digits(value).strip()
    digits = re.sub(r"\D", "", text)
    return digits or text


def parse_number(value: str) -> float:
    s = english_digits(value).replace(",", "").strip()
    if not s:
        return 0.0
    try:
        return float(s)
    except ValueError:
        m = re.search(r"-?\d+(?:\.\d+)?", s)
        return float(m.group()) if m else 0.0


def pick(headers: list[str], patterns: tuple[str, ...]) -> int:
    for i, header in enumerate(headers):
        low = header.strip().lower()
        if any(re.search(p, low, re.I) for p in patterns):
            return i
    return -1


def parse_tsv(text: str) -> dict[str, dict]:
    if not text:
        return {}
    text = text.lstrip("\ufeff").rstrip()
    if not text:
        return {}
    rows = list(csv.reader(io.StringIO(text), delimiter="\t"))
    if len(rows) < 2:
        return {}
    headers = [str(x or "").strip() for x in rows[0]]
    id_idx = pick(headers, (r"رقم", r"كود", r"sku", r"item"))
    name_idx = pick(headers, (r"اسم", r"وصف", r"description", r"name"))
    qty_idx = pick(headers, (r"كمية", r"رصيد", r"متوفر", r"qty", r"quantity"))
    unit_idx = pick(headers, (r"وحدة", r"unit", r"uom"))
    if id_idx < 0 and headers and headers[0] == "" and name_idx == 1 and qty_idx >= 2:
        id_idx = 0
    if id_idx < 0 or qty_idx < 0:
        return {}
    result: dict[str, dict] = {}
    for row in rows[1:]:
        if id_idx >= len(row):
            continue
        sku = clean_sku(row[id_idx])
        if not sku:
            continue
        name = row[name_idx].strip() if 0 <= name_idx < len(row) else ""
        unit = row[unit_idx].strip() if 0 <= unit_idx < len(row) else ""
        qty = parse_number(row[qty_idx]) if qty_idx < len(row) else 0.0
        result[sku] = {"sku": sku, "name": name, "unit": unit, "qty": qty}
    return result


def show_file(commit: str, rel_path: str) -> str:
    p = subprocess.run(
        ["git", "show", f"{commit}:{rel_path}"], cwd=ROOT, text=True,
        encoding="utf-8", stdout=subprocess.PIPE, stderr=subprocess.DEVNULL
    )
    return p.stdout if p.returncode == 0 else ""


def parent_of(commit: str) -> str | None:
    line = git("rev-list", "--parents", "-n", "1", commit).strip().split()
    return line[1] if len(line) > 1 else None


def commit_paths(commit: str) -> list[str]:
    out = git(
        "diff-tree", "--no-commit-id", "--name-only", "-r", commit, "--",
        "data/jeddah.tsv", "data/riyadh.tsv"
    )
    return [x.strip() for x in out.splitlines() if x.strip()]


def changes_for_path(parent: str | None, commit: str, rel_path: str, branch: str) -> list[dict]:
    # Without a baseline, an initial import is not a real stock movement.
    if not parent:
        return []
    before_text = show_file(parent, rel_path)
    after_text = show_file(commit, rel_path)
    if not before_text or not after_text:
        return []
    before = parse_tsv(before_text)
    after = parse_tsv(after_text)
    changes: list[dict] = []
    for sku in sorted(set(before) | set(after), key=lambda x: (len(x), x)):
        old = before.get(sku, {"sku": sku, "name": "", "unit": "", "qty": 0.0})
        new = after.get(sku, {"sku": sku, "name": old.get("name", ""), "unit": old.get("unit", ""), "qty": 0.0})
        b = float(old.get("qty", 0) or 0)
        a = float(new.get("qty", 0) or 0)
        delta = a - b
        if abs(delta) < 1e-9:
            continue
        changes.append({
            "sku": sku,
            "name": new.get("name") or old.get("name") or "",
            "unit": new.get("unit") or old.get("unit") or "",
            "branch": branch,
            "branchLabel": LABELS[branch],
            "before": b,
            "after": a,
            "delta": delta,
            "zeroed": b > 0 and a <= 0,
            "transferMatchedQty": 0,
            "price": 0,
            "valueDelta": 0,
        })
    return changes


def match_transfers(changes: list[dict]) -> list[dict]:
    by_sku: dict[str, list[dict]] = {}
    for c in changes:
        by_sku.setdefault(c["sku"], []).append(c)
    transfers: list[dict] = []
    for sku, rows in by_sku.items():
        downs = [c for c in rows if c["delta"] < 0]
        ups = [c for c in rows if c["delta"] > 0]
        for down in downs:
            remaining = abs(float(down["delta"])) - float(down.get("transferMatchedQty", 0))
            if remaining <= 0:
                continue
            for up in ups:
                if up["branch"] == down["branch"]:
                    continue
                up_remaining = float(up["delta"]) - float(up.get("transferMatchedQty", 0))
                if up_remaining <= 0:
                    continue
                qty = min(remaining, up_remaining)
                if qty <= 0:
                    continue
                down["transferMatchedQty"] += qty
                up["transferMatchedQty"] += qty
                remaining -= qty
                transfers.append({
                    "sku": sku,
                    "name": down.get("name") or up.get("name") or "",
                    "qty": qty,
                    "from": down["branch"],
                    "to": up["branch"],
                    "fromLabel": down["branchLabel"],
                    "toLabel": up["branchLabel"],
                })
                if remaining <= 0:
                    break
    return transfers


def normalize_numbers(obj):
    if isinstance(obj, dict):
        return {k: normalize_numbers(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [normalize_numbers(v) for v in obj]
    if isinstance(obj, float) and obj.is_integer():
        return int(obj)
    return obj


def current_summary(path: Path) -> dict:
    rows = parse_tsv(path.read_text(encoding="utf-8"))
    qty = sum(float(x.get("qty", 0) or 0) for x in rows.values())
    in_stock = sum(1 for x in rows.values() if float(x.get("qty", 0) or 0) > 0)
    return {"skuCount": len(rows), "inStock": in_stock, "totalQty": qty}


def main() -> None:
    log = git(
        "log", "--reverse", f"--since={HISTORY_DAYS} days ago",
        "--format=%H%x09%cI", "--", "data/jeddah.tsv", "data/riyadh.tsv"
    )
    events: list[dict] = []
    for line in log.splitlines():
        if not line.strip() or "\t" not in line:
            continue
        commit, timestamp = line.split("\t", 1)
        paths = commit_paths(commit)
        if not paths:
            continue
        parent = parent_of(commit)
        changes: list[dict] = []
        for rel_path in paths:
            if rel_path == "data/jeddah.tsv":
                changes.extend(changes_for_path(parent, commit, rel_path, "jeddah"))
            elif rel_path == "data/riyadh.tsv":
                changes.extend(changes_for_path(parent, commit, rel_path, "riyadh"))
        if not changes:
            continue
        transfers = match_transfers(changes)
        message = git("show", "-s", "--format=%s", commit).strip() or "تحديث مخزون"
        events.append({
            "id": commit[:12],
            "commit": commit,
            "timestamp": timestamp,
            "message": message,
            "paths": paths,
            "changes": changes,
            "transfers": transfers,
        })

    # Newest event first: dashboards can render directly and filters remain cheap.
    events.sort(key=lambda e: e["timestamp"], reverse=True)
    payload = {
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "historyDays": HISTORY_DAYS,
        "source": "git-inventory-tsv-history",
        "current": {
            "jeddah": current_summary(PATHS["jeddah"]),
            "riyadh": current_summary(PATHS["riyadh"]),
        },
        "events": events,
        "transferCandidates": [],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(normalize_numbers(payload), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_changes = sum(len(e["changes"]) for e in events)
    print(f"Generated {len(events)} events / {total_changes} stock changes -> {OUT.relative_to(ROOT)}")
    if not payload["current"]["jeddah"]["skuCount"] or not payload["current"]["riyadh"]["skuCount"]:
        raise SystemExit("Inventory parser returned zero SKUs for a warehouse")


if __name__ == "__main__":
    main()
