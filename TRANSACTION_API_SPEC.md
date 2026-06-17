# Transaction Master & Cashbook — Backend API Specification

This document is the **exact contract** the Angular frontend expects for the
`/transaction-master` and `/transaction-cashbook` pages. It is generated
directly from the frontend source (`src/app/services/transaction.service.ts`,
`src/app/transaction-master/transaction-master.page.ts`,
`src/app/transaction-cashbook/transaction-cashbook.page.ts`) so that the
Spring Boot DTOs/entities/endpoints can be built to match field-for-field.

The frontend currently runs against an in-memory mock
(`TransactionService`). Each mock method already carries a `// Real: ...`
comment with the intended endpoint — those are the contracts below.

---

## 1. Scope

| Frontend Page | Route | Tabs / Sections |
|---|---|---|
| Transaction Master | `/transaction-master` | Create Ledger, Voucher Entry, Add Fund |
| Transaction Cashbook | `/transaction-cashbook` | Two-column Cashbook view, Ledger filter, Per-ledger breakdown modal |

ACL feature flags gating these routes in the sidebar (informational —
backend may want matching role/permission checks): `TRANSACTION` (Master),
`TRANSACTION_CASHBOOK` (Cashbook).

---

## 2. Global Conventions

### 2.1 Base URL

Add a new property to `src/environments/environment.ts` (and `.prod.ts`),
following the existing pattern (`ledgerUrl`, `dealerLedgerUrl`, etc.):

```ts
transactionUrl: 'https://api.imsnectarorigin.com/api/transaction',
```

All endpoints below are relative to this base, e.g.
`${environment.transactionUrl}/ledger`, `${environment.transactionUrl}/voucher`.

### 2.2 JSON field naming

The frontend TypeScript interfaces use **camelCase** field names. Spring
Boot's default Jackson configuration also serializes Java bean properties as
camelCase, so **Java field names must be identical to the TS field names
below** (no `@JsonProperty` remapping needed) — e.g. `ledgerName`,
`voucherNo`, `underGroup`, `paymentMode`, `createdAt`, `openingBalance`.

### 2.3 Dates

All dates are plain ISO strings, **`yyyy-MM-dd`** (no time component), e.g.
`"2026-06-10"`. Map to `java.time.LocalDate`. The Angular `<input
type="date">` and `Date.toISOString().split('T')[0]` both produce/consume
this format.

### 2.4 Amounts / currency

All amounts are plain JSON numbers (no currency symbol, no thousands
separators), e.g. `400`, `15000.50`. Recommend `BigDecimal` server-side
(Jackson serializes `BigDecimal` as a plain numeric literal by default, which
matches the TS `number` type). The frontend formats display values itself via
`toLocaleString('en-IN')` (Indian lakh/crore grouping) and a separate
`amountToWords()` utility — **neither of these needs backend support**, see
§8.

### 2.5 Auth

These endpoints should sit behind the same Bearer-token auth as the rest of
the API (`Auth` service attaches `Authorization: Bearer <token>` from
`localStorage`). No transaction-specific auth scheme is implied by the
frontend.

### 2.6 HTTP status / error conventions

- `POST` create endpoints → `201 Created` with the full created resource in
  the body (frontend reads `saved.voucherNo`, `saved.fundNo`, etc. from the
  response immediately).
- `GET` list endpoints → `200 OK` with a JSON array (`[]` if empty, never
  `null`).
- `GET /voucher/{voucherNo}` → `200 OK` with the voucher object if found, or
  **`404 Not Found`** if not. The frontend's `error` callback already sets
  `reprintNotFound = true` on *any* error, so a 404 is fully compatible — no
  special body format is required for the 404 case.
- Validation failures → `400 Bad Request`. The frontend does **not** parse
  error response bodies; on any non-2xx/network error it shows a generic
  toast like *"Failed to save voucher. Please try again."* A structured error
  body (e.g. `{ "message": "..." }`) is fine for future-proofing but isn't
  consumed today.

---

## 3. Shared Enums

```java
public enum LedgerType {
    EXPENSE,
    INCOME
}

public enum UnderGroup {
    DIRECT_EXPENSE,
    INDIRECT_EXPENSE,
    DIRECT_INCOME,
    INDIRECT_INCOME
}

public enum PaymentMode {
    CASH,
    UPI
}

public enum VoucherStatus {
    APPROVED,
    PENDING
}

public enum FundLocation {
    OFFICE,
    FACTORY
}
```

### 3.1 `LedgerType` ↔ `UnderGroup` constraint (CRITICAL)

The Create-Ledger form's "Under Group" dropdown is populated **conditionally**
based on the selected `ledgerType`:

| `ledgerType` | Allowed `underGroup` values |
|---|---|
| `EXPENSE` | `DIRECT_EXPENSE`, `INDIRECT_EXPENSE` |
| `INCOME`  | `DIRECT_INCOME`, `INDIRECT_INCOME` |

The frontend UI makes the invalid combinations unreachable, but **the backend
must still validate this pairing** on `POST /ledger` (return `400` if
`underGroup` doesn't match `ledgerType`'s family).

This pairing is also why the Cashbook ledger-filter feature can safely do
`underGroup.startsWith('DIRECT')` / `.startsWith('INDIRECT')` — see §7.5.

---

## 4. Module A — Ledger Master (Create Ledger tab)

### 4.1 Data model — `TransactionLedger`

```java
public class TransactionLedger {
    private Long id;
    private String ledgerName;
    private LedgerType ledgerType;
    private UnderGroup underGroup;
    private LocalDate createdAt;
}
```

```json
{
  "id": 1,
  "ledgerName": "Wages",
  "ledgerType": "EXPENSE",
  "underGroup": "DIRECT_EXPENSE",
  "createdAt": "2026-06-01"
}
```

**Recommended DB constraint:** `ledgerName` should be **unique** (case
sensitivity TBD — see §10). It is used as a denormalized lookup key
throughout the Voucher and Cashbook modules (`ledgerName` is stored
redundantly on every voucher and cashbook entry — see §5.1, §7.1).

### 4.2 Endpoints

#### 1. `POST /api/transaction/ledger` — create ledger

Request body:
```json
{
  "ledgerName": "Wages",
  "ledgerType": "EXPENSE",
  "underGroup": "DIRECT_EXPENSE"
}
```

Response `201`: full `TransactionLedger` object (server assigns `id` and
`createdAt = today`).

#### 2. `GET /api/transaction/ledgers` — list all ledgers

Response `200`: `TransactionLedger[]`. Used to populate the ledger list shown
on the Create Ledger tab.

#### 3. `GET /api/transaction/ledgers?type=EXPENSE|INCOME` — list ledgers by type

Same shape as #2, filtered server-side by `ledgerType`. Used by the Voucher
Entry tab to populate the "Ledger" dropdown after the user picks
`voucherType` (only ledgers whose `ledgerType` equals the selected
`voucherType` are shown).

### 4.3 Validation (Create Ledger form — `saveLedger()`)

| Field | Rule |
|---|---|
| `ledgerName` | Required, non-blank after trim |
| `ledgerType` | Required, one of `EXPENSE` \| `INCOME` |
| `underGroup` | Required, must match `ledgerType` per §3.1 table |

Frontend trims `ledgerName` before sending (`this.ledgerName.trim()`).

---

## 5. Module B — Voucher Entry tab

### 5.1 Data model — `TransactionVoucher`

```java
public class TransactionVoucher {
    private Long id;
    private String voucherNo;       // e.g. "VCH-001" — server generated
    private LocalDate date;
    private VoucherType voucherType; // "INCOME" | "EXPENSE" — same values as LedgerType
    private Long ledgerId;
    private String ledgerName;       // denormalized snapshot of ledger name at creation time
    private PaymentMode paymentMode;
    private String transactionId;    // ⚠️ NEW FIELD — see §5.5 gap notice
    private BigDecimal amount;
    private String narration;
    private VoucherStatus status;    // currently always "APPROVED" on create
    private LocalDate createdAt;
}
```

```json
{
  "id": 1,
  "voucherNo": "VCH-001",
  "date": "2026-06-01",
  "voucherType": "EXPENSE",
  "ledgerId": 1,
  "ledgerName": "Wages",
  "paymentMode": "CASH",
  "transactionId": null,
  "amount": 400,
  "narration": "Being Amount Paid to Suresh Against Wages",
  "status": "APPROVED",
  "createdAt": "2026-06-01"
}
```

> `voucherType` reuses the same two literal values as `LedgerType`
> (`"INCOME" | "EXPENSE"`) — you can reuse the `LedgerType` enum or define a
> separate `VoucherType` enum with identical values; either is fine as long
> as the JSON values match exactly.

### 5.2 Voucher numbering — `VCH-NNN`

- Format: `"VCH-" + zero-padded sequence number, minimum width 3` (e.g.
  `VCH-001`, `VCH-042`, `VCH-999`, `VCH-1000`, …). Equivalent to Java
  `String.format("VCH-%03d", seq)`.
- The sequence is **global** (not per-ledger, not per-date) and **strictly
  increasing**. Use a DB sequence / dedicated counter table — **do not** use
  `COUNT(*) + 1`, since deletions would cause number collisions.
- `voucherNo` is generated **server-side** on `POST /voucher` and returned in
  the response. The frontend immediately uses `saved.voucherNo` to open the
  print-preview modal.
- The frontend also displays a **"Next Voucher No."** preview field
  (`nextVoucherNo`) *before* saving, computed client-side as `vouchers.length
  + 1` from `GET /vouchers`. This is purely a **display estimate** — it is not
  sent to the server and does not need to match the authoritative number
  exactly (though in normal operation with no deletions it will).

### 5.3 Endpoints

#### 4. `POST /api/transaction/voucher` — create voucher

Request body:
```json
{
  "date": "2026-06-10",
  "voucherType": "EXPENSE",
  "ledgerId": 1,
  "ledgerName": "Wages",
  "paymentMode": "CASH",
  "transactionId": null,
  "amount": 400,
  "narration": "Being amount paid to Suresh against wages"
}
```

Response `201`: full `TransactionVoucher` (server adds `id`, `voucherNo`,
`status = "APPROVED"`, `createdAt = today`).

> `ledgerName` is sent by the frontend in addition to `ledgerId` (it's looked
> up client-side from the already-fetched ledger list). The backend should
> treat `ledgerId` as the source of truth and may either (a) trust the
> incoming `ledgerName` as a point-in-time snapshot, or (b) re-derive
> `ledgerName` from `ledgerId` server-side and ignore the client's value —
> either way, **persist `ledgerName` on the voucher row** so historical
> vouchers retain their original ledger name even if the ledger is later
> renamed (this denormalized name is what Cashbook breakdown queries match
> against — see §7.4).

#### 5. `GET /api/transaction/vouchers` — list all vouchers

Response `200`: `TransactionVoucher[]`. Currently used **only** to compute the
"Next Voucher No." preview (`vouchers.length + 1`). As voucher volume grows
this may need pagination — flagged in §10.

#### 6. `GET /api/transaction/vouchers?ledgerName=Wages` — list vouchers for one ledger

Response `200`: `TransactionVoucher[]`, filtered to `ledgerName ===
"Wages"` (exact match). Used by the **Cashbook breakdown modal** (§7.4) — the
frontend then further filters the result client-side by a date range
(`detailFromDate`/`detailToDate`).

#### 7. `GET /api/transaction/voucher/{voucherNo}` — fetch one voucher (Reprint)

- Path param `voucherNo` is sent **uppercased and trimmed** by the frontend
  (`this.reprintVoucherNo.trim().toUpperCase()`), e.g. `VCH-001`.
- Response `200`: `TransactionVoucher` if found.
- Response `404`: if not found (frontend sets `reprintNotFound = true` on any
  error — a plain 404 with no body is sufficient).

### 5.4 Validation (Voucher Entry form — `saveAndApproveVoucher()`)

| Field | Rule |
|---|---|
| `date` | Required (defaults to today on form load) |
| `voucherType` | Required, `INCOME` \| `EXPENSE` |
| `ledgerId` (`selectedLedgerId`) | Required; must reference an existing ledger whose `ledgerType` equals `voucherType` |
| `paymentMode` | Required, `CASH` \| `UPI` |
| `transactionId` (`voucherTransactionId`) | **Required, non-blank, IF `paymentMode === 'UPI'`**. Cleared to `''` when payment mode is switched away from UPI. |
| `amount` | Required, must be truthy/`> 0` |
| `narration` | Required, non-blank after trim |
| `status` | **Not client-supplied.** Server always sets `"APPROVED"` on creation — see §10 (no PENDING/approval workflow exists in the frontend yet). |

### 5.5 ⚠️ KNOWN GAP — `transactionId` not yet wired in frontend

**Current state of the frontend code:**
- The Voucher Entry form **collects** `voucherTransactionId` and **validates**
  it as required when `paymentMode === 'UPI'` (`saveAndApproveVoucher()`,
  step 2 of validation).
- However, the `createVoucher()` payload **does not include** this field, and
  the `TransactionVoucher` TypeScript interface **has no `transactionId`
  property** at all.

**Intended contract (what this spec documents above):** `TransactionVoucher`
should have a `transactionId: string | null` field — mirroring
`TransactionFund.transactionId` (§6.1) — populated when `paymentMode ===
'UPI'` and `null`/empty when `CASH`.

**Action items:**
- **Backend:** Add a nullable `transaction_id` column to the voucher table /
  field to the DTO now, accepting it as optional in `POST /voucher`. This
  avoids a future migration once the frontend bug below is fixed.
- **Frontend (separate follow-up, not yet done):** Update
  `createVoucher()`'s payload in `transaction-master.page.ts` to include
  `transactionId: this.paymentMode === 'UPI' ? this.voucherTransactionId.trim() : null`,
  matching the pattern already used in `saveFund()` for `TransactionFund`.

---

## 6. Module C — Add Fund tab

### 6.1 Data model — `TransactionFund`

```java
public class TransactionFund {
    private Long id;
    private String fundNo;          // e.g. "FND-001" — server generated
    private LocalDate date;
    private BigDecimal amount;
    private PaymentMode paymentMode;
    private String transactionId;   // empty string "" when CASH, populated when UPI
    private FundLocation location;  // OFFICE | FACTORY
    private String narration;
    private LocalDate createdAt;
}
```

```json
{
  "id": 1,
  "fundNo": "FND-001",
  "date": "2026-06-01",
  "amount": 10000,
  "paymentMode": "UPI",
  "transactionId": "UPI24061500123",
  "location": "OFFICE",
  "narration": "Fund received from HO",
  "createdAt": "2026-06-01"
}
```

> Note: unlike the Voucher gap above, here `transactionId` is sent as an
> **empty string `""`** (not `null`) when `paymentMode === 'CASH'` — the
> frontend explicitly does `transactionId: this.fundPaymentMode === 'UPI' ?
> this.fundTransactionId.trim() : ''`. Accept both `""` and `null` as "no
> transaction id" server-side for robustness.

### 6.2 Fund numbering — `FND-NNN`

Identical scheme to voucher numbering (§5.2): `"FND-" + zero-padded sequence,
minimum width 3` (`FND-001`, `FND-002`, …), global monotonic sequence,
generated server-side, returned in the `POST /fund` response. There is **no**
client-side "next fund number" preview field — the number only appears after
a successful save (in the success toast: *"Fund FND-003 of Rs. 10,000
added successfully."*).

### 6.3 Endpoints

#### 8. `POST /api/transaction/fund` — add fund

Request body:
```json
{
  "date": "2026-06-10",
  "amount": 10000,
  "paymentMode": "UPI",
  "transactionId": "UPI24061500123",
  "location": "OFFICE",
  "narration": "Fund received from HO"
}
```

Response `201`: full `TransactionFund` (server adds `id`, `fundNo`,
`createdAt = today`).

#### 9. `GET /api/transaction/funds` — list all funds

Response `200`: `TransactionFund[]`. Populates the "Existing Funds" table on
the Add Fund tab.

### 6.4 Validation (Add Fund form — `saveFund()`)

| Field | Rule |
|---|---|
| `date` (`fundDate`) | Defaults to today on form load; sent as-is |
| `amount` (`fundAmount`) | Required, must be `> 0` |
| `paymentMode` (`fundPaymentMode`) | Required, `CASH` \| `UPI` |
| `transactionId` (`fundTransactionId`) | **Required, non-blank, IF `paymentMode === 'UPI'`**. Sent as `""` when `CASH`. |
| `location` (`fundLocation`) | Required, `OFFICE` \| `FACTORY` |
| `narration` (`fundNarration`) | Optional — sent trimmed, may be `""` |

---

## 7. Module D — Cashbook (`/transaction-cashbook`)

### 7.1 Data model — `CashbookSummary` / `CashbookEntry`

```java
public class CashbookEntry {
    private String ledgerName;
    private LedgerType ledgerType;   // EXPENSE | INCOME
    private UnderGroup underGroup;   // DIRECT_EXPENSE | INDIRECT_EXPENSE | DIRECT_INCOME | INDIRECT_INCOME
    private BigDecimal amount;       // sum of voucher amounts for this ledger within [fromDate, toDate]
}

public class CashbookSummary {
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private List<CashbookEntry> entries;
    private LocalDate fromDate;
    private LocalDate toDate;
}
```

```json
{
  "openingBalance": 100,
  "closingBalance": 20103,
  "fromDate": "2026-06-01",
  "toDate": "2026-06-10",
  "entries": [
    { "ledgerName": "Wages",            "ledgerType": "EXPENSE", "underGroup": "DIRECT_EXPENSE",   "amount": 400 },
    { "ledgerName": "Spare Parts",      "ledgerType": "EXPENSE", "underGroup": "DIRECT_EXPENSE",   "amount": 2000 },
    { "ledgerName": "Sale From Scrap",  "ledgerType": "INCOME",  "underGroup": "DIRECT_INCOME",    "amount": 15000 },
    { "ledgerName": "Received From HO", "ledgerType": "INCOME",  "underGroup": "DIRECT_INCOME",    "amount": 10000 },
    { "ledgerName": "Other Receive",    "ledgerType": "INCOME",  "underGroup": "DIRECT_INCOME",    "amount": 2500 }
  ]
}
```

### 7.2 Endpoint

#### 10. `GET /api/transaction/cashbook?from=2026-06-01&to=2026-06-10` — cashbook summary

Response `200`: `CashbookSummary` as above. Both `from` and `to` are required
query params, `yyyy-MM-dd`. The response should echo them back as
`fromDate`/`toDate`.

`entries[]` should contain **one row per ledger that had ≥1 voucher in the
date range**, with `amount` = the **sum of `TransactionVoucher.amount`** for
all vouchers of that ledger where `date` is between `from` and `to`
(inclusive). Ledgers with zero activity in the range may be **omitted**
entirely (the frontend treats `amount === 0` the same as "absent").

### 7.3 Business rules / computation (CRITICAL)

The cashbook is a classic two-column ledger that **must always balance**.
Given:

- `totalIncome` = Σ `entries[i].amount` where `ledgerType == INCOME`
- `totalExpense` = Σ `entries[i].amount` where `ledgerType == EXPENSE`

The frontend computes (independently, for display):

- `rightTotal` (Income side total) = `openingBalance + totalIncome`
- `leftTotal` (Expenditure side total) = `totalExpense + closingBalance`

**These two must be equal** — i.e. the backend must compute:

```
closingBalance = openingBalance + totalIncome - totalExpense
```

Verified against the current mock data: `openingBalance=100`,
`totalIncome=27500`, `totalExpense=7497` → `closingBalance = 100 + 27500 -
7497 = 20103` ✅ (matches `mockCashbookSummary.closingBalance`), and both
`leftTotal` and `rightTotal` equal `27600`.

#### Opening balance carry-forward

`openingBalance` for a given `from` date should be the **running cash
balance as of the day before `from`** — i.e.:

```
openingBalance(from) = baseOpeningBalance
                      + Σ(income amounts with date < from)
                      - Σ(expense amounts with date < from)
                      + Σ(fund amounts received before `from`, if funds count toward cash balance)
```

`baseOpeningBalance` is the company's all-time starting cash balance (the
mock hardcodes `100`). **This base value is not defined anywhere in the
frontend** — the backend team needs to decide where it's configured (e.g. a
single-row config table, or a seed value). See open question in §10.

> Whether `TransactionFund` entries (Add Fund) should be folded into the
> opening/closing balance computation, or kept as a separate ledger, is also
> an open question — the frontend currently has **no UI that displays funds
> within the Cashbook** (Add Fund is its own tab/table on the Master page).
> See §10.

### 7.4 Frontend display structure — `LEFT_STRUCTURE` / `RIGHT_STRUCTURE`

⚠️ **This is a frontend-side rendering limitation, not something the backend
needs to "fix" — but the backend's response shape must be compatible with
it.**

The Cashbook page renders a fixed two-column table. Each column is built from
a **hardcoded, ordered list of exact ledger-name strings**
(`LEFT_STRUCTURE` / `RIGHT_STRUCTURE` in `transaction-cashbook.page.ts`). For
each `entries[]` item, the frontend does `entryMap.set(e.ledgerName,
amount)`, then walks the structure list and looks up `entryMap.get(key)` —
**any `ledgerName` that doesn't exactly match one of these strings (case- and
spelling-sensitive) will simply not appear in the table.**

**LEFT column (Expenditure)** — sub-headers shown only if ≥1 child has a
non-zero amount:

| Sub-header | Ledger names (must match exactly) |
|---|---|
| Direct Expense | `Wages`, `Spare Parts`, `Unloading Charge`, `Loading Charge`, `Freight Outward`, `Tea`, `Stationery` |
| Indirect Expense | `Fooding Exp`, `Maintenance Machinery`, `Maintenance Electricity`, `Freight Inward`, `Courier Exp`, `Office Maintenance`, `MIS Expense` |
| *(fixed rows)* | `Closing Balance` (= `closingBalance`), `Total` (= Σ left entries + Closing Balance) |

**RIGHT column (Income)**:

| Section | Ledger names (must match exactly) |
|---|---|
| *(fixed row)* | `Opening Balance` (= `openingBalance`) |
| Direct Income | `Sale From Scrap`, `Received From HO` ⭐ *(rendered with amber highlight)*, `Other Receive` |
| Indirect Income | *(no ledger names currently mapped — this sub-header never renders)* |
| *(fixed row)* | `Total` (= Opening Balance + Σ right entries) |

**Implications for the backend:**
- For the table to render correctly **today**, `entries[]` should include
  rows whose `ledgerName` matches the strings above exactly (these correspond
  to the seed ledgers — see `mockLedgers` for the subset that already exist:
  `Wages`, `Spare Parts`, `Tea`, `Fooding Exp`, `Sale From Scrap`, `Other
  Receive`; the rest — `Unloading Charge`, `Loading Charge`, `Freight
  Outward`, `Stationery`, `Maintenance Machinery`, `Maintenance Electricity`,
  `Freight Inward`, `Courier Exp`, `Office Maintenance`, `MIS Expense`,
  `Received From HO` — need to be created via `POST /ledger` with matching
  names/types/under-groups before they'll show up in the cashbook table).
- **The backend should NOT filter `entries[]` down to only these names** —
  return entries for **every** ledger with activity in the period. Any ledger
  not in the table above will still be:
  - Selectable via the Cashbook **filter dropdowns** (§7.5), and
  - Viewable via its own **breakdown modal** (`GET
    /vouchers?ledgerName=...`).
  
  It just won't appear as a row in the two-column summary table until the
  frontend's hardcoded structure is extended (a separate frontend task, not
  requested yet).

### 7.5 `underGroup` usage — Direct/Indirect ledger filter

Separately from §7.4's fixed table, the Cashbook page has a **cascading
filter** (Type → Direct/Indirect → Ledger) that builds its option lists
**dynamically from `entries[]`** (not from `LEFT_STRUCTURE`/`RIGHT_STRUCTURE`):

1. **Type** dropdown: "All Ledgers" (`''`), "Expenses" (`EXPENSE`), "Income"
   (`INCOME`) → filters `entries` where `entry.ledgerType === filterLedgerType`.
2. **Group** dropdown (shown once Type is picked): "Direct {Expense/Income}"
   (`DIRECT`), "Indirect {Expense/Income}" (`INDIRECT`) → filters where
   `entry.underGroup.startsWith(filterUnderGroup)`. **This is why
   `underGroup` MUST be one of the four exact enum values
   `DIRECT_EXPENSE`/`INDIRECT_EXPENSE`/`DIRECT_INCOME`/`INDIRECT_INCOME`** —
   the `.startsWith('DIRECT')` / `.startsWith('INDIRECT')` prefix match relies
   on the underscore-separated naming convention.
3. **Ledger** dropdown: every distinct `ledgerName` remaining after the above
   two filters, alphabetically sorted.
4. **"View Breakdown"** button → opens the same detail modal as clicking a
   table row (§7.6), calling `GET /vouchers?ledgerName=<selected>`.

So: `CashbookEntry.underGroup` is **functionally required** (used for
filtering) even though it plays no role in the fixed-table layout of §7.4.

### 7.6 Per-ledger breakdown modal

Triggered by clicking any ledger row in the cashbook table (including the
highlighted `Received From HO` row), or via the filter's "View Breakdown"
button.

- Calls `GET /api/transaction/vouchers?ledgerName=<name>` (endpoint #6, §5.3)
  — returns **all** vouchers for that ledger, unfiltered by date.
- Frontend then filters client-side to a date range
  (`detailFromDate`/`detailToDate`, independently adjustable from the page's
  main date range, defaulting to it on open).
- Displays: total amount, CASH count + total, UPI count + total, and a table
  of `voucherNo` / `date` / `paymentMode` / `amount` / `narration`.
- "Export PDF" / "Export Excel" for this filtered list are generated
  **entirely client-side** — no backend involvement.

---

## 8. Client-side-only features (no backend work required)

- **PDF generation** (voucher print/reprint, cashbook export, ledger
  breakdown export) — via `jsPDF` + `jspdf-autotable`, fully client-side from
  data already returned by the JSON endpoints above.
- **Excel export** — via the `xlsx` library, fully client-side.
- **Amount-in-words** (`amountToWords()` in
  `src/app/shared/utils/amount-to-words.ts`) — converts a numeric amount to
  Indian-numbering words (Crore/Lakh/Thousand/Hundred + "Rupees ... Only"),
  used on printed vouchers and in the Add Fund/Voucher Entry forms. Purely a
  display helper; **the API does not need to return word-form amounts.**

---

## 9. Endpoint quick reference

| # | Method | Path | Query / Path params | Purpose |
|---|---|---|---|---|
| 1 | `POST` | `/api/transaction/ledger` | – | Create ledger |
| 2 | `GET` | `/api/transaction/ledgers` | – | List all ledgers |
| 3 | `GET` | `/api/transaction/ledgers` | `?type=EXPENSE\|INCOME` | List ledgers by type |
| 4 | `POST` | `/api/transaction/voucher` | – | Create voucher |
| 5 | `GET` | `/api/transaction/vouchers` | – | List all vouchers |
| 6 | `GET` | `/api/transaction/vouchers` | `?ledgerName=<name>` | List vouchers for one ledger |
| 7 | `GET` | `/api/transaction/voucher/{voucherNo}` | path: `voucherNo` (e.g. `VCH-001`) | Fetch single voucher (reprint); 404 if not found |
| 8 | `POST` | `/api/transaction/fund` | – | Add fund |
| 9 | `GET` | `/api/transaction/funds` | – | List all funds |
| 10 | `GET` | `/api/transaction/cashbook` | `?from=yyyy-MM-dd&to=yyyy-MM-dd` | Cashbook summary for date range |

(8 distinct routes; #2/#3 and #5/#6 share a route differentiated by query
param presence.)

---

## 10. Open questions / action items for backend team

1. **`TransactionVoucher.transactionId`** (§5.5) — add the field now
   (nullable) so the frontend can be wired up without a follow-up migration.
2. **Voucher `status` workflow** — frontend always creates vouchers as
   `APPROVED` (no `PENDING` state is ever set or read). Confirm whether an
   approval workflow is planned; if not, the `status` field could
   theoretically be hardcoded, but keeping it as a field is harmless and
   future-proof.
3. **`baseOpeningBalance`** (§7.3) — where is the company's all-time starting
   cash balance configured? Needs a config value/table; the mock uses `100`.
4. **Do `TransactionFund` records affect the cashbook balance?** Currently no
   frontend view combines Funds with the Cashbook. Clarify whether fund
   receipts should feed into `openingBalance`/`closingBalance` computation or
   remain a fully separate ledger.
5. **`ledgerName` uniqueness / casing** — should ledger names be unique
   (recommended, since they're used as lookup keys for vouchers and cashbook
   entries)? Case-sensitive or case-insensitive uniqueness?
6. **`GET /vouchers` (no params) pagination** — currently used only to derive
   a "next voucher number" preview via `array.length + 1`. Fine for now;
   flag if voucher volume will make returning the full list impractical (a
   future frontend change could swap this for a lightweight count endpoint).
7. **Seeding the `LEFT_STRUCTURE`/`RIGHT_STRUCTURE` ledger names** (§7.4) —
   the 17 ledger names referenced by the fixed cashbook table layout should
   exist as seed/default `TransactionLedger` rows with the correct
   `ledgerType`/`underGroup`, so the table renders fully populated out of the
   box.
