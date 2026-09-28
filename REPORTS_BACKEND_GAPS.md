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

Flagging these so it's clear the list below is a live, moving target, not a permanent one — please
re-check anything marked "not re-verified" below, since similar issues have already been quietly
fixed before we got a chance to re-test them.

## Still mock — tabs with no real data at all

### 1. Stock Movement page (`/reports/stock-movement`)
**Tabs affected:** Stock Ledger, Supplier Wise Inward, Material Inward — all three, no backend call made yet.

Per an earlier audit (not re-verified this session): the Supplier/Material Inward endpoints
existed, but the material name field came back as a raw placeholder like `"Raw Material ID: 47"`
instead of the actual material name.

**Ask:** confirm whether material name now resolves correctly on these endpoints, and share a
sample response for each of the 3 tabs so we can wire them up.

### 2. Batch Management page (`/reports/batch-management`)
**Tabs affected:** Batch Lot Tracking, Batch Production, FG Batch Report — all three, no backend call made yet.

Per an earlier audit (not re-verified this session): an endpoint existed but the response was
missing `mfgDate` and opening/inward/outward/closing quantity fields needed for lot tracking.

**Ask:** confirm whether these fields have been added, and share a sample response.

### 3. Production Reports — BOM Report & Production Cost tabs
No backend endpoint exists for either of these as far as we know.

**Ask:** is either of these on the roadmap? If not, we'll leave these two tabs as-is for now.

### 4. Receivables & Collections — Outstanding Summary & Ageing Analysis tabs
Per an earlier audit (not re-verified this session): the backend endpoint for this returned an
empty response.

**Ask:** confirm current behavior and share a sample response.

### 5. Sales Reports — Dealer Wise Sales tab
There's no "all dealers" aggregate/listing endpoint — dealers are currently only fetchable scoped
to a single distributor (`GET /dealers/distributor/{id}`).

**Ask:** is a dealer-wise sales aggregate endpoint possible, analogous to the existing
`GET /reports/sales/by-distributor`?

## Partial gaps — tab is real, one field/filter isn't

### 6. Sales Reports — Distributor Wise Sales, "Region" column
`GET /reports/sales/by-distributor` doesn't return a `region` field, so this one column is
currently a deterministic placeholder on the frontend, not real data.

**Ask:** can `region` be added to this response?

### 7. Dispatch & Delivery — Region / Status filters are currently inert
None of `/dispatch/register`, `/dispatch/pending`, `/dispatch/delivery-confirmation` return a
region field, and we haven't been able to confirm they accept a `status` or `region` query
parameter (only `dateFrom`/`dateTo` are currently sent, unconfirmed whether even those are honored).

**Ask:**
- Confirm whether `dateFrom`/`dateTo` are actually applied server-side on these 3 endpoints.
- Would a `status` filter param make sense for `/dispatch/register` and `/dispatch/pending`?
- Region filtering would need a region field added to all 3 DTOs.

### 8. MIS Dashboard — Region / Distributor filters only narrow their own table
`GET /reports/mis/dashboard` returns one fixed snapshot (all regions, all distributors) for the
requested date range — it isn't filterable by region or distributor server-side, and most of the
dashboard (KPI cards, charts, Top Products table) has no per-region/per-distributor breakdown to
filter on at all. This is a known, intentional frontend limitation, not something we need from
backend — noting it here only so it isn't mistaken for a bug during QA.

## Summary table

| Report page | Tab | Status | Blocker |
|---|---|---|---|
| Stock Movement | Stock Ledger | MOCK | no endpoint wired |
| Stock Movement | Supplier Wise Inward | MOCK | material name bug (unverified) |
| Stock Movement | Material Inward | MOCK | material name bug (unverified) |
| Batch Management | Batch Lot Tracking | MOCK | missing fields (unverified) |
| Batch Management | Batch Production | MOCK | missing fields (unverified) |
| Batch Management | FG Batch Report | MOCK | missing fields (unverified) |
| Production Reports | BOM Report | MOCK | no endpoint |
| Production Reports | Production Cost | MOCK | no endpoint |
| Receivables & Collections | Outstanding Summary | MOCK | endpoint returns empty (unverified) |
| Receivables & Collections | Ageing Analysis | MOCK | same, shared data source |
| Sales Reports | Dealer Wise Sales | MOCK | no "all dealers" endpoint |
| Sales Reports | Distributor Wise Sales | REAL (1 field mock) | `region` missing from response |
| Dispatch & Delivery | all 3 tabs | REAL (2 filters inert) | Region/Status filters unconfirmed |

## Fully wired to real data — no action needed

Inventory Reports (all 3 tabs), Sales Orders (all views), Inventory Issues (both tabs), Scrap
Management (all 3 tabs), Dispatch & Delivery (all 3 tabs), MIS Dashboard (KPIs/charts/3 tables),
and Sales Reports' Register / Summary-by-Period / Product Wise / Salesman Performance tabs.
