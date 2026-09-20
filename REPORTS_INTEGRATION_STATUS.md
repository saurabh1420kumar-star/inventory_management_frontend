# Reports API Integration — Status Report

Tracks what changed when wiring the Reports module to the backend `/api/reports/**` endpoints described in `REPORTS_README.md`. Read that file first for the endpoint list and per-report backend status (Ready / Needs fix / No API).

## Summary

Before this change, **every** report page rendered client-side mock data (`report-shared.ts`) — none of them called the backend, despite `REPORTS_README.md` claiming several were "live." That claim was verified false (see below) before any wiring started.

This pass wired **7 of 11** report pages to real endpoints. The other 4 stay on mock data because their backend APIs are either blocked by a known bug, return incomplete data, or don't exist yet.

A new `src/app/services/reports.service.ts` was added — no reports service existed before. It follows the same auth-header and list-unwrapping patterns already used by `SalesService`, `InvoiceService`, `InventoryService`, etc.

---

## Page-by-Page Status

### ✅ Wired to real backend

| Page | Route | Tab | Endpoint | Status |
|---|---|---|---|---|
| Inventory Reports | `/reports/inventory-reports` | Stock Summary | `GET /inventory/snapshot` | Wired |
| | | Category Wise Valuation | *(derived client-side from Stock Summary)* | Wired (not a separate API) |
| | | Low Stock Reorder | `GET /inventory/low-stock` | Wired |
| Production Reports | `/reports/production-reports` | Daily Production | `GET /production/log` | Wired |
| | | Material Consumption | `GET /production/bom-consumption` | Wired |
| | | BOM Report | *(no backend endpoint)* | **Still mock** |
| | | Production Cost | *(no backend endpoint)* | **Still mock** |
| Sales Reports | `/reports/sales-reports` | Sales Register | `GET /sales/invoice-grid` | Wired |
| | | Sales Summary | *(derived client-side from Sales Register)* | Wired (not a separate API call) |
| | | Product Wise | `GET /sales/by-product` | Wired |
| | | Distributor Wise | `GET /sales/by-distributor` | Wired |
| | | Top Selling Products | `GET /sales/top-products` | Wired |
| | | Salesman Performance | `GET /sales-orders/salesman-performance` | Wired |
| | | Dealer Wise | *(no backend endpoint — Excel #23, Category 3)* | **Still mock** |
| Receivables & Collections | `/reports/receivables-collections` | Collections | `GET /receivables/collection-history` | Wired |
| | | Outstanding Summary | *(backend returns empty — Excel #24, Category 2)* | **Still mock** |
| | | Ageing Analysis | *(same data source as Outstanding)* | **Still mock** |
| Sales Orders | `/reports/sales-orders` | All Orders / Pending / Dispatch Queue | `GET /sales-orders/grid` | Wired (one call, filtered client-side into the 3 views) |
| Inventory Issues | `/reports/inventory-issues` | Promotional / Spare Parts / History | `GET /inventory-issues/by-type` (called twice, once per itemType) | Wired |
| Scrap Management | `/reports/scrap-management` | Scrap Generation | `GET /scrap/lifecycle` | Wired |
| | | Scrap Disposal | `GET /scrap/disposal-status` | Wired |
| | | Scrap Sale | `GET /scrap/revenue` | Wired |

### ⛔ Not touched — still 100% mock data

| Page | Route | Why it was skipped |
|---|---|---|
| Batch Management | `/reports/batch-management` | Backend API exists but is missing fields (`mfgDate`, opening/inward/outward/closing qty) — Category 2 in README. |
| Stock Movement | `/reports/stock-movement` | Supplier/Material Inward endpoints work, but material name comes back as `"Raw Material ID: 47"` (README "Fix 1", not yet applied on backend). Wiring now would ship a page with a broken-looking material column. |
| Dispatch & Delivery | `/reports/dispatch-delivery` | Dispatch Register / Delivery Status / Pending Dispatch all need `customerName` added to the backend DTO first (README "Fix 2"). |
| MIS Dashboard | `/reports/mis-dashboard` | Backend `mis/kpi-summary` is missing production and purchase/inward totals — Category 2. |

Also: the README's proposed new `/reports/issues-scrap` page was **not created** — `inventory-issues` and `scrap-management` already exist as separate routes and already cover all 5 of those reports between them, so a new page would have been a duplicate.

---

## What Was Built

- **`src/app/services/reports.service.ts`** (new) — one method per wired endpoint, all `GET`, all attaching `Authorization: Bearer <token>` via `Auth.getToken()` (this codebase has no HTTP interceptor, per `CLAUDE.md`). List responses are defensively unwrapped (`Array.isArray(res) ? res : res?.content ?? res?.data ?? []`) using the same pattern already established in `InventoryService` and `AdminApprovalService`, since Spring endpoints in this backend sometimes return a bare array and sometimes a paged wrapper.
- Each of the 7 pages above had their mock `setTimeout(() => buildXRows(), 300)` generators replaced with real `HttpClient` calls (via `forkJoin` where a page needs more than one endpoint at once), keeping every existing interface, template, pagination, and Excel/PDF export function untouched — only the data source changed.
- Filters already on each page (date range, category, distributor, etc.) are now passed through as query params.

## ⚠️ Important Caveat — Field Names Are Unverified

`REPORTS_README.md` references a `REPORTS_API_REFERENCE.md` file for the full DTO field reference — **that file does not exist in this repo**, and the backend source (`inventoryManagement_Backend`) was not read, so the exact JSON field names each endpoint returns were never confirmed against real code or a live response.

To handle this safely, every mapping function (e.g. `mapStockRow`, `mapInvoiceRow`, `mapOrderRow` — one per tab, colocated in each page's `.ts` file) reads several plausible camelCase field name variants defensively (e.g. `raw.item ?? raw.itemName ?? raw.materialName ?? '—'`) instead of assuming one exact shape. This means the integration **will not crash** on an unexpected response shape, but individual columns may show `—` or `0` if the real field name doesn't match any of the guessed variants.

**When you test each page, the thing to look for is not "does it error" — it's "are the columns populated with real values."** Blank/zero columns point at a specific `map*Row()` function needing its field name corrected, not a broken integration.

## Suggested Verification Steps

1. Point `environment.ts` at staging (`inventorymanagement-backend-staging.onrender.com/api` — currently commented out) or localhost, run `npm start`, and log in with a role that has reports access.
2. Open each of the 7 wired pages, check the browser Network tab for the `/api/reports/...` calls, and compare the raw response against what's rendered in the table.
3. Fix any field-name mismatches in the relevant page's mapping function (small, isolated change — not a redesign).
4. Once backend Fix 1 (material name), Fix 2 (customer name), and Fix 3 (sales-order status counts) land, wire Stock Movement and Dispatch & Delivery following the same pattern used in the 7 pages above.
