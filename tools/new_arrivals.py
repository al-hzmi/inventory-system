#!/usr/bin/env python3
"""Build a stable 30-day new-arrivals registry from trusted inventory history."""

import argparse
import json
import os
from datetime import datetime, timedelta, timezone

import inventory_analytics as analytics


WINDOW_DAYS = 30


def global_snapshot(repo, commit):
    branches = {}
    merged = {}
    for branch, path in analytics.BRANCH_FILES.items():
        rows = analytics.parse_inventory(analytics.git_show(repo, commit, path))
        branches[branch] = rows
        for sku, row in rows.items():
            previous = merged.get(sku)
            if previous is None or (not previous.get("name") and row.get("name")):
                merged[sku] = dict(row)
    return branches, merged


def positive_branches(branches, sku):
    return [
        {"id": branch, "label": analytics.BRANCH_LABELS[branch], "qty": round(float(rows[sku]["qty"]), 6)}
        for branch, rows in branches.items()
        if sku in rows and float(rows[sku].get("qty") or 0) > 0
    ]


def build_payload(repo, now=None, window_days=WINDOW_DAYS):
    repo = os.path.abspath(repo)
    head = analytics.run_git(repo, "rev-parse", "HEAD").strip()
    commits = analytics.run_git(
        repo, "log", "--reverse", "--format=%H", "--", *analytics.BRANCH_FILES.values()
    ).splitlines()

    raw_events = []
    for commit in commits:
        try:
            event = analytics.make_event(repo, commit)
            if event and event.get("changes"):
                raw_events.append(event)
        except Exception as exc:
            print(f"WARN {commit[:8]}: {exc}")
    trusted, excluded = analytics.classify_events(raw_events)
    trusted_commits = {event["commit"] for event in trusted}

    first_seen = {}
    baseline_seeded = False
    for commit in commits:
        parent = analytics.parent_of(repo, commit)
        if not parent or commit not in trusted_commits:
            continue
        _, before = global_snapshot(repo, parent)
        _, after = global_snapshot(repo, commit)
        # The first complete inventory import is the baseline, not a mass arrival.
        if not baseline_seeded and not before and len(after) >= 20:
            baseline_seeded = True
            continue
        baseline_seeded = baseline_seeded or bool(before)
        meta = analytics.commit_meta(repo, commit)
        for sku in sorted(set(after) - set(before)):
            if float(after[sku].get("qty") or 0) <= 0 or sku in first_seen:
                continue
            first_seen[sku] = {
                "sku": sku,
                "name": after[sku].get("name") or sku,
                "unit": after[sku].get("unit") or "",
                "pack": after[sku].get("pack") or 0,
                "firstSeenAt": meta.get("timestamp") or "",
                "firstSeenCommit": commit,
            }

    current_branches, current = global_snapshot(repo, head)
    generated = now or datetime.now(timezone.utc)
    if generated.tzinfo is None:
        generated = generated.replace(tzinfo=timezone.utc)
    cutoff = generated - timedelta(days=window_days)
    active = []
    for sku, row in first_seen.items():
        seen_at = analytics.parse_ts(row.get("firstSeenAt"))
        if not seen_at or seen_at < cutoff or seen_at > generated + timedelta(hours=24):
            continue
        current_row = current.get(sku)
        branches = positive_branches(current_branches, sku)
        if not current_row or not branches:
            continue
        expires_at = seen_at + timedelta(days=window_days)
        active.append({
            **row,
            "name": current_row.get("name") or row.get("name") or sku,
            "unit": current_row.get("unit") or row.get("unit") or "",
            "pack": current_row.get("pack") or row.get("pack") or 0,
            "expiresAt": expires_at.isoformat().replace("+00:00", "Z"),
            "daysRemaining": max(0, int((expires_at - generated).total_seconds() // 86400) + 1),
            "branches": branches,
        })
    active.sort(key=lambda row: (row["firstSeenAt"], row["sku"]), reverse=True)

    return {
        "schema": 1,
        "generatedAt": generated.isoformat().replace("+00:00", "Z"),
        "head": head,
        "windowDays": window_days,
        "activeCount": len(active),
        "items": active,
        "quality": {
            "trustedEventCount": len(trusted),
            "excludedEventCount": len(excluded),
            "knownFirstSeenCount": len(first_seen),
            "baselineSeeded": baseline_seeded,
        },
        "notes": {
            "rule": "يعد الصنف جديدًا عند ظهوره لأول مرة في اتحاد مخزون جدة والرياض، ويظل ظاهرًا 30 يومًا.",
            "corrections": "حركات تصحيح المخزون المستبعدة من التحليلات لا تنشئ أصنافًا جديدة.",
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--output", default="data/new-arrivals.json")
    parser.add_argument("--window-days", type=int, default=WINDOW_DAYS)
    args = parser.parse_args()
    payload = build_payload(args.repo, window_days=args.window_days)
    out = os.path.join(os.path.abspath(args.repo), args.output)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
    print(f"new arrivals: {payload['activeCount']} active / {payload['quality']['knownFirstSeenCount']} known -> {args.output}")


if __name__ == "__main__":
    main()
