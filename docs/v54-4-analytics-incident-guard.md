# V54.4 — Inventory Analytics Incident Guard

## Confirmed incident repaired
The inventory correction sequence on 2026-08-27 is excluded from sales-grade analytics while remaining available as compact audit evidence in `excludedEvents`.

Confirmed excluded commits:
- `0047432de994a04c3da176a1981996a01cc551b6` — accidental branch overwrite.
- `216f77727a9f8657521bd31e5606afad2b169d7a` — temporary branch clear.
- `114b085e0f7a4f5d25ffe8f1e694ebfa4ded0540` — incident cleanup edit.
- `d1e021d5a0030375c1817c9ed06b4849797bf0ec` — branch restoration.

## Automatic future protection
The analytics engine now excludes structural inventory incidents from sales calculations when it detects:
- near-total branch clear;
- mass zeroing of a branch;
- one branch becoming an almost exact clone of the other;
- structural replacement of most SKU identities;
- restoration shortly after an excluded incident.

Excluded events do not enter sales KPIs, inbound/outbound aggregates, transfer inference, charts, or top-item rankings. They remain summarized in `excludedEvents` and `quality` for auditability.

## Regression protection
`tools/test_inventory_analytics.py` reproduces a normal sale followed by clone, clear, and restore operations and asserts that only the normal decrease remains trusted. PR and main rebuild workflows run these tests before analytics generation.
