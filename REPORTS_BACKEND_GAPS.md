# Reports Module — Outstanding Backend Gaps

**To:** Backend team
**From:** Frontend (Inventory Management)
**Date:** 2026-09-29

## Purpose

This tracks which Reports tabs are still running on **frontend mock data** because a backend
endpoint is missing, incomplete, or was last confirmed broken — and what we need from the backend
to finish wiring them to real data.

This supersedes `REPORTS_INTEGRATION_STATUS.md` for the pages listed there, several of which have
since been wired. Everything below was checked against the current frontend code on 2026-09-29.

## Already resolved since the last audit (for context)

These were previously blocked and have since been fixed on the backend — confirmed working and
wired on the frontend this pass:

- `GET /reports/dispatch/register`, `/dispatch/pending`, `/dispatch/delivery-confirmation` — all
  three now return `customerName` (previously missing, tracked as "Fix 2").
- `GET /reports/mis/dashboard` — now returns purchase totals, stock value, and full
  region/product/distributor breakdowns (previously missing, tracked as "Category 2").
- `GET /reports/sales/monthly-trend` — confirmed working, now backs the Sales Summary "Period" view.
- **Stock Movement — all 3 tabs (2026-10-07):** `materialName` now resolves correctly on
  `/stock-movement/ledger` (confirmed via sample response — e.g. `"Huller Bhushi"`, not
  `"Raw Material ID: 47"`). `/stock-movement/supplier-wise` and `/stock-movement/material-inward`
  also confirmed working with real sample responses. All three wired on the frontend this pass —
  see `src/app/reports/stock-movement/stock-movement.page.ts`. Note: query-param filtering
  (item/warehouse/dateFrom/dateTo) is sent from the frontend but not yet confirmed honored
  server-side — the sample responses were captured with no query params.
- **Production Reports — BOM Report & Production Cost tabs (2026-10-07):** both now have live
  endpoints — `GET /production/bom-report` (one BOM per product with a nested `components[]`
  array: rate, amount, contributionPercent) and `GET /production/cost` (per-run
  totalRawMaterialCost / totalAdditionalCost / totalProductionCost / costPerUnit). Both wired —
  see `src/app/reports/production-reports/production-reports.page.ts`. Two bonus endpoints with
  no prior tab, `/production/summary` (lifetime totals per product) and `/production/daily-summary`
  (totals per date), were also wired as two new tabs on the same page. The Plant and Product
  filters were also removed from this page's UI (2026-10-07, on request) — "Plant" was never a
  real backend concept (mock-only list), and no endpoint confirms product-name filtering. Only a
  date range filter remains.
- **Sales Reports — dealer directory (2026-10-07, partial):** `GET /dealers` (unscoped, all
  distributors) now backs the Dealer filter dropdown and the Dealer Wise Sales tab's dealer names —
  see new `src/app/services/dealer.service.ts` and `src/app/reports/sales-reports/sales-reports.page.ts`.
  This only resolves the "dealer directory" half of gap #3 below — the dealer-wise sales
  aggregation (orders/qty/revenue per dealer) still has no backend endpoint, so those figures stay
  mocked on top of the now-real dealer names. See the updated #3 below.

Flagging these so it's clear the list below is a live, moving target, not a permanent one — please
re-check anything marked "not re-verified" below, since similar issues have already been quietly
fixed before we got a chance to re-test them.

## Still mock — tabs with no real data at all

### 1. Batch Management page (`/reports/batch-management`)
**Tabs affected:** Batch Lot Tracking, Batch Production, FG Batch Report — all three, no backend call made yet.

Per an earlier audit (not re-verified this session): an endpoint existed but the response was
missing `mfgDate` and opening/inward/outward/closing quantity fields needed for lot tracking.

**Ask:** confirm whether these fields have been added, and share a sample response.

### 2. Receivables & Collections — Outstanding Summary & Ageing Analysis tabs
Per an earlier audit (not re-verified this session): the backend endpoint for this returned an
empty response.

**Ask:** confirm current behavior and share a sample response.

### 3. Sales Reports — Dealer Wise Sales tab (partially resolved 2026-10-07)
`GET /dealers` (global, unscoped) now gives us a real dealer directory, so the Dealer filter
dropdown and the dealer *names* in this tab are real. But there's still no dealer-grouped sales
aggregate endpoint, so orders/qty/revenue per dealer in this tab remain deterministic mock figures.

**Ask:** is a dealer-wise sales aggregate endpoint possible, analogous to the existing
`GET /reports/sales/by-distributor` (same shape: orders, qty, revenue, ideally region, grouped by
dealer instead of distributor)?

## Partial gaps — tab is real, one field/filter isn't

### 4. Sales Reports — Distributor Wise Sales, "Region" column
`GET /reports/sales/by-distributor` doesn't return a `region` field, so this one column is
currently a deterministic placeholder on the frontend, not real data.

**Ask:** can `region` be added to this response?

### 5. Dispatch & Delivery — Region / Status filters are currently inert
None of `/dispatch/register`, `/dispatch/pending`, `/dispatch/delivery-confirmation` return a
region field, and we haven't been able to confirm they accept a `status` or `region` query
parameter (only `dateFrom`/`dateTo` are currently sent, unconfirmed whether even those are honored).

**Ask:**
- Confirm whether `dateFrom`/`dateTo` are actually applied server-side on these 3 endpoints.
- Would a `status` filter param make sense for `/dispatch/register` and `/dispatch/pending`?
- Region filtering would need a region field added to all 3 DTOs.

### 6. MIS Dashboard — Region / Distributor filters only narrow their own table
`GET /reports/mis/dashboard` returns one fixed snapshot (all regions, all distributors) for the
requested date range — it isn't filterable by region or distributor server-side, and most of the
dashboard (KPI cards, charts, Top Products table) has no per-region/per-distributor breakdown to
filter on at all. This is a known, intentional frontend limitation, not something we need from
backend — noting it here only so it isn't mistaken for a bug during QA.

## Summary table

| Report page | Tab | Status | Blocker |
|---|---|---|---|
| Batch Management | Batch Lot Tracking | MOCK | missing fields (unverified) |
| Batch Management | Batch Production | MOCK | missing fields (unverified) |
| Batch Management | FG Batch Report | MOCK | missing fields (unverified) |
| Receivables & Collections | Outstanding Summary | MOCK | endpoint returns empty (unverified) |
| Receivables & Collections | Ageing Analysis | MOCK | same, shared data source |
| Sales Reports | Dealer Wise Sales | REAL names, MOCK figures | dealer directory is real; no sales-by-dealer aggregate endpoint |
| Sales Reports | Distributor Wise Sales | REAL (1 field mock) | `region` missing from response |
| Dispatch & Delivery | all 3 tabs | REAL (2 filters inert) | Region/Status filters unconfirmed |
| Stock Movement | all 3 tabs | REAL (filters unconfirmed) | item/warehouse/date query-param support unverified server-side |

## Fully wired to real data — no action needed

Inventory Reports (all 3 tabs), Sales Orders (all views), Inventory Issues (both tabs), Scrap
Management (all 3 tabs), Dispatch & Delivery (all 3 tabs), MIS Dashboard (KPIs/charts/3 tables),
Stock Movement (all 3 tabs), Production Reports (all 6 tabs — Production Log, BOM Report, Material
Consumption, Production Cost, Production Summary, Daily Summary), and Sales Reports' Register /
Summary-by-Period / Product Wise / Salesman Performance tabs.
