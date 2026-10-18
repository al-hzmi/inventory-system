# Stocktake workspace V73

## Scope

Reorganizes the existing employee, admin and both accountant surfaces. Retains campaign preparation/activation/closure/reopening, test campaigns, teams and assistants, blind first count, barcode search, notes, found-later corrections, audit, import, print and Excel exports. No production Firestore data was modified during development or verification.

## Correctness and data protection

- Empty and malformed quantities are rejected; Arabic/Persian digits and decimal quantities are supported.
- Account/campaign/team/item-scoped drafts survive live rerenders and refreshes. Firestore persistence owns queued writes; drafts are recovery copies, never automatically replayed, avoiding duplicate increments.
- Local snapshot acceptance and server acknowledgment are distinct. An unacknowledged write does not masquerade as server-confirmed. Rejected writes preserve recovery values.
- Count and associated audit records commit atomically. Updates cannot recreate a deleted item. Found-later audit is in the same batch as its quantity update.
- The historical automatic test-campaign cleanup is removed from page load. Protected setup actions require connectivity, explicit confirmation and fresh server checks. Existing counted rows and notes block deletion/replacement. Previous imported rows are audited before changes; replacement rows are written before obsolete rows are removed.
- Service worker caches only stocktake pages, their assets and pinned SDK scripts. API, Firestore, employee identity responses and unrelated pages are excluded.

## Reports

The existing full/variance Excel export produces styled RTL OOXML with a summary, frozen headings, filters, print settings and explicit incomplete/local/test labels. SKU and free-text cells are literal strings. Pending counts remain blank. Differences are calculated from expected/actual quantities, rather than trusting an outdated stored difference. Empty reports retain headings.

## Verification and limits

Local syntax and regression checks; generated XLSX independently reopened with openpyxl. GitHub Actions runs Chromium against isolated Firestore fixtures: Arabic draft survival, blank rejection, pending local acknowledgment, server acknowledgment/rejection, closed-campaign editing, guarded deletion, live checkbox retention, and mobile/desktop screenshots. Service worker tests exercise offline fallback and excluded routes.

Browser fixtures do not certify actual Firestore authorization rules, physical iPhone storage behavior, camera scanning, or multi-device network races. The repository contains no deployed Firestore rules to validate. Offline operation requires that pages/dependencies and relevant campaign data were previously loaded and persistent browser storage remains available. Existing Firestore last-write-wins behavior across devices is unchanged; batch audit preserves submitted changes. Large legacy imports/deletions remain multi-batch operations, not a globally atomic server transaction. These boundaries must not be represented as a complete security audit or an absolute no-loss guarantee.
