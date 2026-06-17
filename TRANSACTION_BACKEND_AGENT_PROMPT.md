# Backend Agent Task — Transaction Master & Cashbook (Spring Boot + PostgreSQL)

> **You are a backend engineering agent.** Build the complete Spring Boot REST
> backend for the **Transaction Master** and **Transaction Cashbook** features
> of the Nectar Origin inventory app. The Angular frontend is already built and
> runs against an in-memory mock; your job is to deliver the real API so the
> frontend can swap the mock for HTTP calls **with zero shape changes**. Every
> request/response below is the **exact, non-negotiable contract** — match it
> field-for-field so the integration fits together like a puzzle.
>
> This document **supersedes** the older `TRANSACTION_API_SPEC.md` in the repo,
> which predates four voucher fields (`partyName`, `mobileNo`, `invoiceRef`,
> `lessAdjustment`) and the wiring of `transactionId`. Where they differ, **this
> file wins.**

---

## 0. Ground rules (read first)

1. **No regression.** Add a **new self-contained `transaction` module/package**.
   Do **not** modify, rename, or delete any existing controller, service,
   entity, or config that belongs to other features. The only existing files
   you may touch are shared cross-cutting ones (security whitelist, global
   exception handler, OpenAPI config) and only by **adding** entries — never
   removing or rewriting existing ones.
2. **Follow the host project's conventions.** Before writing code, inspect the
   existing Spring Boot codebase and mirror its: package layout, base path
   strategy, DTO vs entity exposure pattern, response-wrapper convention (if the
   project wraps responses in an envelope, follow it — but see §2.6, the
   frontend expects raw objects/arrays), security/auth filter, and naming style.
   **Do not invent a new architecture** that diverges from the rest of the repo.
3. **Database: PostgreSQL.** Use JPA/Hibernate entities + a migration tool if
   the project already uses one (Flyway/Liquibase); otherwise provide the DDL in
   §4 and matching entities. Use **native Postgres sequences** for the
   human-readable `VCH-###` / `FND-###` numbers (see §7).
4. **Deliverables:** entities, enums, repositories, DTOs, services, controllers,
   exception handling, DB migration/DDL, and a short README section describing
   how to run + the seed data. Unit/integration tests for the cashbook
   computation (§6) are strongly encouraged because that math must balance.
5. **Definition of done:** all 10 endpoints in §8 return exactly the documented
   JSON; the cashbook always balances (§6.4); the worked example in §9 passes;
   funds surface as "Received From HO" in both the cashbook summary and its
   breakdown modal (§6.3 + §8 endpoint #6).

---

## 1. Scope

| Frontend Page | Route | Tabs / Sections |
|---|---|---|
| Transaction Master | `/transaction-master` | Create Ledger · Voucher Entry · Add Fund |
| Transaction Cashbook | `/transaction-cashbook` | Two-column cashbook · cascading ledger filter · per-ledger breakdown modal (with Transactions + Chart tabs) |

Source of truth on the frontend (already implemented):
`src/app/services/transaction.service.ts` (the contract),
`src/app/transaction-master/transaction-master.page.ts`,
`src/app/transaction-cashbook/transaction-cashbook.page.ts`.

---

## 2. Global conventions

### 2.1 Base path
All endpoints are under **`/api/transaction`**. The frontend will point
`environment.transactionUrl` at `https://<host>/api/transaction` (see §10).

### 2.2 JSON naming
Frontend interfaces are **camelCase**. Spring/Jackson defaults already emit
camelCase, so **Java field names must equal the JSON names below** — no
`@JsonProperty` remapping needed **except** where a DB column name differs from
the JSON key (the `date` fields — see §4).

### 2.3 Dates
All dates are plain **`yyyy-MM-dd`** strings (no time), e.g. `"2026-06-14"`. Map
to `java.time.LocalDate`.

### 2.4 Money
All amounts are plain JSON numbers (`400`, `15000.5`) — no symbols/separators.
Use **`BigDecimal`** (`NUMERIC(15,2)`) server-side; Jackson serializes it as a
bare numeric literal which matches the TS `number` type. The frontend handles
all `en-IN` formatting and amount-in-words itself — **no backend support
needed** for display formatting.

### 2.5 Auth
Sit behind the same Bearer-token auth as the rest of the API
(`Authorization: Bearer <token>`). No transaction-specific scheme. If the
project gates routes by feature/role, the sidebar uses feature flags
`TRANSACTION` (Master) and `TRANSACTION_CASHBOOK` (Cashbook) — wire matching
role checks **only if** the project already does this for other modules.

### 2.6 Response shape & status codes
The frontend consumes **raw** objects/arrays (no envelope). If the project
mandates an envelope, the frontend service layer must unwrap it — flag this, but
prefer raw to match the documented contract.

- `POST` create → **`201 Created`**, body = the full created resource (frontend
  immediately reads `saved.voucherNo` / `saved.fundNo`).
- `GET` list → **`200 OK`**, JSON array (`[]` when empty, **never `null`**).
- `GET /voucher/{voucherNo}` → **`200`** with the object, or **`404`** if absent.
- Validation failure → **`400`**. The frontend does **not** parse error bodies
  (it shows a generic toast on any non-2xx), so a structured
  `{ "message": "..." }` body is nice-to-have but not required.

### 2.7 PDFs are NOT a backend concern (do not build PDF storage/generation)
**All PDFs are generated client-side from JSON.** The voucher / fund / cashbook
PDFs are rendered in the browser by `src/app/shared/utils/voucher-pdf.ts`
(jsPDF) directly from the same data objects returned by the endpoints below. The
PDF is a *view* of the data, not a stored asset.

Therefore:
- **Do NOT** add a `pdf`/`document` BLOB column, a file-storage path
  (S3/disk), or any PDF-generation library to the backend.
- **Do NOT** add a "download PDF" / "generate PDF" endpoint. Reprint works by
  fetching the voucher data (`GET /voucher/{voucherNo}`) and re-rendering in the
  browser.
- Your only job is to return **correct, complete data** (every field in §5) so
  the client can rebuild the exact document on demand. One source of truth =
  template/letterhead fixes apply retroactively to all vouchers.

*(If a legally-frozen archival copy is ever required later, the agreed approach
is to store a `SHA-256` hash of the canonical voucher data for tamper-evidence —
**not** a rendered PDF blob. This is out of scope now; do not implement it
unless explicitly asked.)*

---

## 3. Enums

```java
public enum LedgerType   { EXPENSE, INCOME }
public enum UnderGroup   { DIRECT_EXPENSE, INDIRECT_EXPENSE, DIRECT_INCOME, INDIRECT_INCOME }
public enum PaymentMode  { CASH, UPI }
public enum VoucherStatus{ APPROVED, PENDING }   // always APPROVED on create today
public enum FundLocation { OFFICE, FACTORY }
```
`voucherType` reuses the `INCOME | EXPENSE` literals — reuse `LedgerType` or
define an identical `VoucherType`; JSON values must match exactly.

### 3.1 LedgerType ↔ UnderGroup constraint (enforce server-side)
| `ledgerType` | Allowed `underGroup` |
|---|---|
| `EXPENSE` | `DIRECT_EXPENSE`, `INDIRECT_EXPENSE` |
| `INCOME`  | `DIRECT_INCOME`, `INDIRECT_INCOME` |

The UI makes bad combos unreachable, but **validate on `POST /ledger`** → `400`
if mismatched. This underscore convention is also load-bearing for the cashbook
filter, which matches `underGroup.startsWith("DIRECT") / "INDIRECT"` — so the
four enum values **must** keep this exact spelling.

---

## 4. Data model & PostgreSQL DDL

> JSON key `date` maps to a non-reserved column name to stay safe in Postgres.
> Use `@Column(name = "...")` on the entity and keep the **JSON property named
> `date`** (Jackson uses the Java field name `date`, which is fine).

```sql
-- ── Ledgers ────────────────────────────────────────────────
CREATE TABLE transaction_ledger (
    id           BIGSERIAL PRIMARY KEY,
    ledger_name  VARCHAR(120) NOT NULL UNIQUE,      -- unique, case-insensitive (see §4.1)
    ledger_type  VARCHAR(16)  NOT NULL,             -- EXPENSE | INCOME
    under_group  VARCHAR(24)  NOT NULL,             -- DIRECT_EXPENSE | ...
    created_at   DATE         NOT NULL
);
CREATE UNIQUE INDEX ux_ledger_name_lower ON transaction_ledger (LOWER(ledger_name));

-- ── Vouchers ───────────────────────────────────────────────
CREATE SEQUENCE voucher_seq START 1 INCREMENT 1;
CREATE TABLE transaction_voucher (
    id              BIGSERIAL PRIMARY KEY,
    voucher_no      VARCHAR(20)  NOT NULL UNIQUE,    -- VCH-001, generated server-side
    voucher_date    DATE         NOT NULL,           -- JSON: "date"
    voucher_type    VARCHAR(16)  NOT NULL,           -- EXPENSE | INCOME
    ledger_id       BIGINT       REFERENCES transaction_ledger(id),
    ledger_name     VARCHAR(120) NOT NULL,           -- denormalized snapshot
    party_name      VARCHAR(150),                    -- "Paid To" / "Received From"
    mobile_no       VARCHAR(20),
    invoice_ref     VARCHAR(60),                     -- invoice / bill no
    payment_mode    VARCHAR(8)   NOT NULL,           -- CASH | UPI
    transaction_id  VARCHAR(60),                     -- UPI ref; "" or NULL for CASH
    amount          NUMERIC(15,2) NOT NULL,          -- GROSS amount
    less_adjustment NUMERIC(15,2) NOT NULL DEFAULT 0,
    narration       TEXT         NOT NULL,
    status          VARCHAR(12)  NOT NULL,           -- APPROVED
    created_at      DATE         NOT NULL
);
CREATE INDEX ix_voucher_ledger_name ON transaction_voucher (ledger_name);
CREATE INDEX ix_voucher_date        ON transaction_voucher (voucher_date);

-- ── Funds (Add Fund) ───────────────────────────────────────
CREATE SEQUENCE fund_seq START 1 INCREMENT 1;
CREATE TABLE transaction_fund (
    id              BIGSERIAL PRIMARY KEY,
    fund_no         VARCHAR(20)  NOT NULL UNIQUE,    -- FND-001, generated server-side
    fund_date       DATE         NOT NULL,           -- JSON: "date"
    amount          NUMERIC(15,2) NOT NULL,
    payment_mode    VARCHAR(8)   NOT NULL,           -- CASH | UPI
    transaction_id  VARCHAR(60),                     -- UPI ref; "" or NULL for CASH
    location        VARCHAR(8)   NOT NULL,           -- OFFICE | FACTORY
    narration       TEXT,
    created_at      DATE         NOT NULL
);
CREATE INDEX ix_fund_date ON transaction_fund (fund_date);
```

### 4.1 `ledgerName` uniqueness
`ledger_name` is a denormalized lookup key on every voucher and is the join key
the cashbook uses. Enforce **case-insensitive uniqueness** (the `LOWER()` index
above). **Reserved name:** do **not** allow a manually created ledger named
`Received From HO` — that exact name is a **virtual ledger fed by funds**
(§6.3). Reject it on `POST /ledger` (`400`), or document it as reserved.

---

## 5. DTO field reference (per resource)

### 5.1 `TransactionLedger` (response)
```json
{ "id": 1, "ledgerName": "Wages", "ledgerType": "EXPENSE", "underGroup": "DIRECT_EXPENSE", "createdAt": "2026-06-01" }
```

### 5.2 `TransactionVoucher` (response — note all new fields)
```json
{
  "id": 1,
  "voucherNo": "VCH-001",
  "date": "2026-06-01",
  "voucherType": "EXPENSE",
  "ledgerId": 1,
  "ledgerName": "Wages",
  "partyName": "Suresh",
  "mobileNo": "9876543210",
  "invoiceRef": "BILL-22",
  "paymentMode": "CASH",
  "transactionId": "",
  "amount": 400,
  "lessAdjustment": 0,
  "narration": "Being Amount Paid to Suresh Against Wages",
  "status": "APPROVED",
  "createdAt": "2026-06-01"
}
```

### 5.3 `TransactionFund` (response)
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

### 5.4 `CashbookEntry` (response — exposes all three figures)
```json
{
  "ledgerName": "Wages",
  "ledgerType": "EXPENSE",
  "underGroup": "DIRECT_EXPENSE",
  "grossAmount": 400,
  "lessAdjustment": 0,
  "amount": 400
}
```
- `amount` = **NET** = `grossAmount − lessAdjustment`. **The frontend reads
  `amount`**, so it must be the net figure.
- `grossAmount` and `lessAdjustment` are additional fields so the UI can show
  all three (a planned frontend enhancement). They are harmless to send today.

### 5.5 `CashbookSummary` (response)
```json
{
  "openingBalance": 0,
  "closingBalance": 29500,
  "fromDate": "2026-06-01",
  "toDate": "2026-06-30",
  "entries": [ /* CashbookEntry[] */ ]
}
```

---

## 6. Cashbook computation (the critical part)

### 6.1 Inputs
`GET /api/transaction/cashbook?from=<f>&to=<t>` (both `yyyy-MM-dd`, inclusive).

### 6.2 Per-ledger entries (voucher-derived)
For every ledger that has **≥1 voucher** with `voucher_date ∈ [f, t]`, emit one
`CashbookEntry`:
- `grossAmount` = Σ `amount` of those vouchers
- `lessAdjustment` = Σ `less_adjustment` of those vouchers
- `amount` (net) = `grossAmount − lessAdjustment`
- `ledgerType` / `underGroup` come from the ledger.

Ledgers with **no** activity in the range are **omitted** (frontend treats
absent == 0). Return entries for **every** active ledger — do **not** restrict to
the names in §6.6.

### 6.3 Funds → synthetic "Received From HO" income entry (cash-in)
Funds are **money received from Head Office into cash**. They appear in the
cashbook as a single **income** entry. For the range `[f, t]`, sum **all**
`transaction_fund.amount` with `fund_date ∈ [f, t]` and emit:
```json
{ "ledgerName": "Received From HO", "ledgerType": "INCOME", "underGroup": "DIRECT_INCOME",
  "grossAmount": <Σ funds>, "lessAdjustment": 0, "amount": <Σ funds> }
```
Only emit it if the sum > 0. This entry:
- counts toward `totalIncome` / cash-in (§6.4),
- is selectable in the cascading filter (it has type INCOME, group DIRECT),
- is **clickable** → its breakdown modal calls `GET /vouchers?ledgerName=Received From HO`,
  which you must back with **fund records mapped into voucher shape** (see §8 #6).

> **Funds remain independently creatable/listable** via `POST /fund` and
> `GET /funds` (the Add Fund tab). They are simply *also* projected into the
> cashbook as "Received From HO". Do not double-count: funds are **not** vouchers
> and must never appear under any other ledger.
>
> **Assumption (flag if wrong):** sum funds from **both** OFFICE and FACTORY
> locations. (The seed data happens to match only the OFFICE fund, but no
> location filter exists in the cashbook contract. If office/factory cashbooks
> must be separated later, that needs a new `location` query param — out of
> scope now.)

### 6.4 Balance rule (must always hold)
Let, over `[f, t]`:
- `totalIncome` = Σ `entries[i].amount` where `ledgerType == INCOME` (**includes** Received From HO)
- `totalExpense` = Σ `entries[i].amount` where `ledgerType == EXPENSE`

Then:
```
closingBalance = openingBalance + totalIncome − totalExpense
```
The frontend independently computes
`rightTotal = openingBalance + totalIncome` and
`leftTotal  = totalExpense + closingBalance`; these **must be equal**. They are,
by construction of the formula above.

### 6.5 Opening balance (starts from 0, carry-forward)
Base starting cash balance is **0** (confirmed). For a query starting at `f`:
```
openingBalance(f) =
      Σ (net income amounts with date <  f)      // vouchers, INCOME, net = amount − lessAdjustment
    + Σ (fund amounts        with date <  f)      // funds count as income/cash-in
    − Σ (net expense amounts with date <  f)      // vouchers, EXPENSE, net
```
i.e. the running cash position the day before `f`. With no prior-period rows,
`openingBalance = 0`.

### 6.6 Frontend fixed-table names (compatibility note — NOT a backend filter)
The cashbook page renders a fixed two-column layout keyed by **exact**
ledger-name strings. Names not in these lists still appear in the **filter
dropdown** and **breakdown modal**, just not as a fixed table row. **Do not
filter your response to these names** — return all active ledgers; just be aware
these are the seed names that render in the static table:

- **Direct Expense:** Wages, Spare Parts, Unloading Charge, Loading Charge, Freight Outward, Tea, Stationery
- **Indirect Expense:** Fooding Exp, Maintenance Machinery, Maintenance Electricity, Freight Inward, Courier Exp, Office Maintenance, MIS Expense
- **Direct Income:** Sale From Scrap, **Received From HO** (virtual/funds, amber-highlighted), Other Receive

Seed these expense/income ledgers (§11) so the table renders populated out of
the box. **Do not** seed a `Received From HO` ledger row — it is virtual.

---

## 7. Numbering (`VCH-###` / `FND-###`)
- Format: prefix + zero-padded sequence, **min width 3**: `VCH-001`, `VCH-042`,
  `VCH-1000` (Java `String.format("VCH-%03d", n)`). Same for `FND-`.
- Use the **Postgres sequences** `voucher_seq` / `fund_seq` (`SELECT nextval(...)`)
  — **never** `COUNT(*) + 1` (deletions would collide). Global, monotonic.
- Generated server-side on create, returned in the `201` body.
- The Master page shows a **"Next Voucher No." preview** computed client-side as
  `GET /vouchers`.length + 1 — purely cosmetic, not authoritative, needs no
  dedicated endpoint.

---

## 8. Endpoints (exact contract)

| # | Method | Path | Params | Purpose |
|---|---|---|---|---|
| 1 | POST | `/api/transaction/ledger` | – | Create ledger |
| 2 | GET | `/api/transaction/ledgers` | – | List all ledgers |
| 3 | GET | `/api/transaction/ledgers` | `?type=EXPENSE\|INCOME` | List ledgers by type |
| 4 | POST | `/api/transaction/voucher` | – | Create voucher |
| 5 | GET | `/api/transaction/vouchers` | – | List all vouchers |
| 6 | GET | `/api/transaction/vouchers` | `?ledgerName=<name>` | Vouchers for one ledger (funds for "Received From HO") |
| 7 | GET | `/api/transaction/voucher/{voucherNo}` | path | Single voucher (reprint); 404 if absent |
| 8 | POST | `/api/transaction/fund` | – | Add fund |
| 9 | GET | `/api/transaction/funds` | – | List all funds |
| 10 | GET | `/api/transaction/cashbook` | `?from=&to=` | Cashbook summary |

#### #1 `POST /ledger`
Request: `{ "ledgerName": "Wages", "ledgerType": "EXPENSE", "underGroup": "DIRECT_EXPENSE" }`
→ `201` full `TransactionLedger` (server sets `id`, `createdAt = today`).
Validate: non-blank name (trimmed), valid enums, §3.1 pairing, name not reserved/duplicate.

#### #2 `GET /ledgers` → `200 TransactionLedger[]`.
#### #3 `GET /ledgers?type=EXPENSE` → `200 TransactionLedger[]` filtered by `ledgerType`. Used by Voucher Entry to populate the ledger dropdown after the user picks `voucherType`.

#### #4 `POST /voucher`
Request (exactly what the frontend sends — `transactionId` is `""` for CASH;
`partyName`/`mobileNo`/`invoiceRef` may be `""`; `lessAdjustment` defaults `0`):
```json
{
  "date": "2026-06-10",
  "voucherType": "EXPENSE",
  "ledgerId": 1,
  "ledgerName": "Wages",
  "partyName": "Suresh",
  "mobileNo": "9876543210",
  "invoiceRef": "BILL-22",
  "paymentMode": "CASH",
  "transactionId": "",
  "amount": 400,
  "lessAdjustment": 0,
  "narration": "Being amount paid to Suresh against wages"
}
```
→ `201` full `TransactionVoucher` (server adds `id`, `voucherNo`,
`status="APPROVED"`, `createdAt=today`). Treat `ledgerId` as source of truth;
**persist `ledgerName`** as a point-in-time snapshot (re-derive from `ledgerId`
if you prefer, but store it — cashbook & breakdown match on this name).

#### #5 `GET /vouchers` → `200 TransactionVoucher[]` (all). Drives the next-number preview only.

#### #6 `GET /vouchers?ledgerName=<name>`
→ `200 TransactionVoucher[]` for that ledger (exact `ledgerName` match),
**unfiltered by date** (the modal filters client-side).
- **Special case `ledgerName == "Received From HO"`:** return the **fund**
  records mapped into voucher shape so the breakdown modal / CASH-UPI split /
  monthly chart all work:
  ```json
  [{
    "id": 1, "voucherNo": "FND-001", "date": "2026-06-01",
    "voucherType": "INCOME", "ledgerId": null, "ledgerName": "Received From HO",
    "partyName": "Head Office", "mobileNo": "", "invoiceRef": "",
    "paymentMode": "UPI", "transactionId": "UPI24061500123",
    "amount": 10000, "lessAdjustment": 0,
    "narration": "Fund received from HO", "status": "APPROVED", "createdAt": "2026-06-01"
  }]
  ```
  (`voucherNo` ← `fundNo`, `paymentMode`/`transactionId`/`amount`/`narration`/
  `date` ← fund; `ledgerId` null; `voucherType` INCOME.)

#### #7 `GET /voucher/{voucherNo}`
Path param arrives **trimmed + UPPERCASED** (e.g. `VCH-001`). → `200` voucher or
**`404`** (frontend treats any error as "not found", so a bare 404 is fine).

#### #8 `POST /fund`
Request:
```json
{ "date": "2026-06-10", "amount": 10000, "paymentMode": "UPI",
  "transactionId": "UPI24061500123", "location": "OFFICE", "narration": "Fund received from HO" }
```
→ `201` full `TransactionFund` (server adds `id`, `fundNo`, `createdAt=today`).
`transactionId` arrives as `""` for CASH — accept `""` or `null`.

#### #9 `GET /funds` → `200 TransactionFund[]`.

#### #10 `GET /cashbook?from=&to=`
→ `200 CashbookSummary` per §6. Echo `fromDate`/`toDate`. `entries[]` = active
voucher ledgers (§6.2) **plus** the synthetic "Received From HO" fund entry
(§6.3).

---

## 9. Validation rules (mirror the frontend)

**Create Ledger:** `ledgerName` required (trim, non-blank, unique CI, not
reserved); `ledgerType ∈ {EXPENSE,INCOME}`; `underGroup` matches §3.1.

**Create Voucher:** `date` required; `voucherType ∈ {INCOME,EXPENSE}`;
`ledgerId` references an existing ledger whose `ledgerType == voucherType`;
`paymentMode ∈ {CASH,UPI}`; **if `paymentMode==UPI` then `transactionId`
required non-blank**; `amount > 0`; `lessAdjustment ≥ 0` and `≤ amount`
(net must not go negative); `narration` required non-blank. Server forces
`status = APPROVED`.

**Add Fund:** `amount > 0`; `paymentMode ∈ {CASH,UPI}`; **if UPI then
`transactionId` required**; `location ∈ {OFFICE,FACTORY}`; `narration` optional
(may be `""`); `date` required.

### Worked example (acceptance test for §6)
Seed (all dates in June 2026, nothing prior):
- VCH-001 EXPENSE Wages CASH amount 400 lessAdjustment 0 → net 400
- VCH-002 EXPENSE Tea CASH amount 100 lessAdjustment 0 → net 100
- VCH-003 INCOME "Sale From Scrap" UPI amount 15000 → net 15000
- FND-001 amount 10000, FND-002 amount 5000

`GET /cashbook?from=2026-06-01&to=2026-06-30` must yield:
- `openingBalance = 0`
- entries: Wages(net 400), Tea(net 100), Sale From Scrap(net 15000), **Received From HO(15000)**
- `totalIncome = 15000 + 15000 = 30000`, `totalExpense = 500`
- `closingBalance = 0 + 30000 − 500 = 29500`
- frontend `leftTotal = 500 + 29500 = 30000`, `rightTotal = 0 + 30000 = 30000` ✅ balanced

Then `GET /cashbook?from=2026-07-01&to=2026-07-31` (no July rows) must yield
`openingBalance = 29500` (carry-forward), empty `entries`, `closingBalance = 29500`.

---

## 10. Frontend integration (so the swap is trivial — do NOT change frontend shapes)

Once your API is live, the frontend will:
1. Add to `src/environments/environment.ts` (+ `.prod.ts`):
   `transactionUrl: 'https://<host>/api/transaction'`.
2. Replace each mock body in `src/app/services/transaction.service.ts` with the
   matching `HttpClient` call below — **interfaces stay identical**, so no page
   code changes:

| Service method | HTTP call |
|---|---|
| `createLedger(p)` | `POST {transactionUrl}/ledger` |
| `getAllLedgers()` | `GET {transactionUrl}/ledgers` |
| `getLedgersByType(t)` | `GET {transactionUrl}/ledgers?type=${t}` |
| `createVoucher(p)` | `POST {transactionUrl}/voucher` |
| `getAllVouchers()` | `GET {transactionUrl}/vouchers` |
| `getVouchersByLedger(n)` | `GET {transactionUrl}/vouchers?ledgerName=${encodeURIComponent(n)}` |
| `getVoucherByNo(no)` | `GET {transactionUrl}/voucher/${no}` (handle 404 → `of(null)`) |
| `addFund(p)` | `POST {transactionUrl}/fund` |
| `getAllFunds()` | `GET {transactionUrl}/funds` |
| `getCashbookSummary(f,t)` | `GET {transactionUrl}/cashbook?from=${f}&to=${t}` |

**This frontend swap is a separate follow-up — your task is the backend only.**
Your contract just has to make that swap a one-liner per method.

> **Frontend follow-ups already noted (not your job, listed for context):**
> the breakdown-modal "Total" card currently sums **gross** `amount`; once
> `lessAdjustment` is in play it should sum **net** to match the cashbook row,
> and the cashbook table can be extended to show gross / less-adj / net columns
> using the three fields you now return.

---

## 11. Seed data (so the cashbook renders populated)
Insert these ledgers (via migration or a seeder) with `createdAt = today`. **Do
not** seed `Received From HO` (virtual/funds):

| ledgerName | ledgerType | underGroup |
|---|---|---|
| Wages, Spare Parts, Unloading Charge, Loading Charge, Freight Outward, Tea, Stationery | EXPENSE | DIRECT_EXPENSE |
| Fooding Exp, Maintenance Machinery, Maintenance Electricity, Freight Inward, Courier Exp, Office Maintenance, MIS Expense | EXPENSE | INDIRECT_EXPENSE |
| Sale From Scrap, Other Receive | INCOME | DIRECT_INCOME |

Optionally seed a few sample vouchers + funds matching §9 so the UI shows data
immediately.

---

## 12. Decisions locked (do not re-litigate)
- **DB:** PostgreSQL, native sequences for numbering.
- **Cashbook figure:** NET (`amount − lessAdjustment`); also return `grossAmount`
  and `lessAdjustment` so all three are available.
- **Funds:** included as cash-in, surfaced as the income row **"Received From
  HO"** (virtual ledger), and drive that row's breakdown via endpoint #6.
- **Opening balance base:** **0**, with running carry-forward (§6.5).
- **Voucher status:** always `APPROVED` on create (no approval workflow yet).

If anything in the live frontend contradicts this file, **the frontend source in
§1 wins** — re-read it and conform.
```