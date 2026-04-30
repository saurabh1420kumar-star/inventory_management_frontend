# Frontend Scope Audit — Inventory Management System
**Project:** Nayla Inventory Tool (`nayla-inventory-tool`)  
**Framework:** Angular 20 + Ionic 8 + Capacitor 7 (iOS/Android)  
**Audit Date:** April 29, 2026  
**Audited By:** GitHub Copilot (automated static analysis)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total distinct routes / screens** | 29 |
| **Embedded sub-components (non-routed screens)** | 2 |
| **Total pages / screens audited** | **31** |
| **IN SCOPE** | 17 |
| **OUT OF SCOPE (extra work delivered)** | **14** |
| **Out-of-scope services / utilities** | **7** |
| **Out-of-scope third-party libraries** | **7** |

---

## Section 1 — Complete Page & Route Inventory

### 1.1 Authentication & Access

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 1 | `/login` | `LoginPage` | ✅ IN SCOPE | Standard credential-based login |
| 2 | `/signup` | `SignupPage` | ❌ OUT OF SCOPE | Self-service multi-field registration with 20+ role options — proposal specifies Super Admin creates users |
| 3 | `/forgot-password` | `ForgotPasswordPage` | ❌ OUT OF SCOPE | 3-step self-service password reset with real-time strength meter and confirm-password validation |
| 4 | `/user-right` | `UserRightPage` | ✅ IN SCOPE | Role-based feature access control; however the granular per-feature CRUD matrix (canCreate / canRead / canUpdate / canDelete) is an expansion beyond basic role assignment |

### 1.2 Dashboard

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 5 | `/dashboard` | `DashboardPage` | ✅ IN SCOPE | Admin analytics dashboard with MTD/YTD metrics |
| 6 | `/dashboard` (embedded) | `DistributorDashboardPage` | ✅ IN SCOPE | Distributor-specific analytics view, lazy-loaded inside the same route |

### 1.3 Inventory

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 7 | `/master-inventory` | `MasterInventoryPage` | ❌ OUT OF SCOPE | Full inventory with raw materials, finished products, scrap, promotional items, **and a built-in Bill of Materials (BOM) builder with component linking and additional cost tracking** — far beyond a basic product catalog |
| 8 | `/unit-master` | `UnitMasterPage` | ❌ OUT OF SCOPE | Dedicated module for measurement units, raw material definitions, and finished product definitions — not mentioned in the original proposal |
| 9 | `/machine-inventory` | `MachineInventoryPage` | ❌ OUT OF SCOPE | Entirely new category: machine parts, spare parts, and tools inventory with CRUD, category filters (TOOL / SPARE_PART / MACHINE), vendor tracking, warranty expiry, and purchase dates |

### 1.4 Distributor & Cart

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 10 | `/distributor` | `DistributorPage` | ✅ IN SCOPE | Create distributors, assign sales employees, manage credit limits and bank guarantees. Includes full India state/district/pincode dropdown dataset (all 36 states/UTs) |
| 11 | `/distributor-cart` | `DistributorCartPage` | ✅ IN SCOPE | Distributor mobile app product catalog, add-to-cart, and order placement workflow |
| 12 | `/sales-distributor` | `SalesDistributorPage` | ❌ OUT OF SCOPE | Empty placeholder page with no implemented functionality — was scaffolded but not removed |

### 1.5 Sales Team

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 13 | `/sales` | `SalesPage` | ✅ IN SCOPE | Sales management root — order approval, PI-ready invoices, GDN handling |
| 14 | `/sales/salesperson-onboarding` | `SalespersonOnboardingPage` | ✅ IN SCOPE | Hierarchy manager: NSM → SSM → ZSM → RSM → ASM → SO → SE with CRUD and org-chart display |
| 15 | `/sales/hierarchy-orders` | `HierarchyOrdersPage` | ✅ IN SCOPE | Orders grouped by Zone → RSM → ASM → SE with expand/collapse and totals |
| 16 | `/sales/sales-dashboard` | `SalesDashboardPage` | ❌ OUT OF SCOPE | Dedicated dark-themed analytics dashboard for individual sales reps: Today/Month/Year period filters, volume analytics (MTD/WTD/YTD), payment & collections section, add-dealer workflow, payment form with RTGS/NEFT/IMPS/UPI/CHEQUE modes |
| 17 | `/sales/my-payments` | `MyPaymentsPage` | ❌ OUT OF SCOPE | Individual salesperson payment tracking screen showing pending payments per salesperson ID — not in original hierarchy-orders scope |
| — | (reusable component) | `HierarchyMapComponent` | ❌ OUT OF SCOPE | Visual interactive org-chart / hierarchy map component used inside salesperson-onboarding and hierarchy-orders — beyond the text/tabular hierarchy originally described |

### 1.6 Accounts

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 18 | `/accounts-master` | `AccountsMasterPage` | ✅ IN SCOPE | Accounts ledger, distributor credit tracking, transaction history |
| 19 | `/payment-request` | `PaymentRequestPage` | ✅ IN SCOPE | Payment verification, approve/reject workflows with UTR/cheque/bank details |
| 20 | `/proforma-invoice` | `ProformaInvoicePage` | ✅ IN SCOPE | Proforma invoices with PDF preview/download and dispatch modal |
| 21 | `/pi-update` | `PiUpdatePage` | ✅ IN SCOPE | PI approval against ledger balance, credit-based approval, rejection workflow |

### 1.7 Operations & Dispatch

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 22 | `/dispatch` | `DispatchPage` | ✅ IN SCOPE | Dispatch confirmation; protected by ACL feature gate (`DISPATCH`) |
| 23 | `/gdn` | `GdnPage` | ✅ IN SCOPE | Goods Dispatch Note listing, PDF download/preview with cross-platform (web/Android) handling |
| 24 | `/order-details` | `OrderDetailsPage` | ✅ IN SCOPE | Order tracking dashboard for pending/approved orders |
| 25 | `/logistics` | `LogisticsPage` | ❌ OUT OF SCOPE | Full logistics module: shipment tracking with transport modes (road / rail / air / sea), vehicle/driver details, multi-step timeline visualization, contact cards, origin-to-destination mapping — entirely beyond "logistics entry" mentioned in the proposal |

### 1.8 HR

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 26 | `/hr-department` | `HrDepartmentPage` | ❌ OUT OF SCOPE | Complete HR Department management system: employee CRUD with status lifecycle (Pending → Active / Rejected), demographic fields (DOB, gender, blood group, address), pagination, search/filter, and separate role type management — not mentioned anywhere in the original proposal |

### 1.9 Complaints & Feedback

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 27 | `/complaints` | `ComplaintsPage` | ❌ OUT OF SCOPE | Customer-facing complaint submission form with categories (PAYMENT / ACCOUNT / TECHNICAL / DELIVERY / OTHER) and 4-level priority system (LOW / MEDIUM / HIGH / CRITICAL) |
| 28 | `/complaints-management` | `ComplaintsManagementPage` | ❌ OUT OF SCOPE | Admin-side complaints dashboard: paginated complaint list, status workflow (OPEN → IN_PROGRESS → RESOLVED → CLOSED), category/status filters, detail modal — a full customer support ticketing UI |
| 29 | `/feedback` | `FeedbackPage` | ❌ OUT OF SCOPE | Separate feedback form (partially overlaps with complaints) — standalone page without backend integration (uses `setTimeout` stub) |

### 1.10 Utility

| # | Route | Component | Scope | Notes |
|---|-------|-----------|-------|-------|
| 30 | `/not-found` | `NotFoundPage` | ✅ IN SCOPE | Standard 404 catch-all route |

---

## Section 2 — Out-of-Scope Items Detail

### 2.1 Out-of-Scope Pages / Screens (14 items)

| # | Page / Screen | What It Does |
|---|--------------|--------------|
| 1 | **Signup Page** (`/signup`) | Self-service account creation with 20 role types, country, gender, DOB fields. Bypasses the "Super Admin creates users" model from the proposal. |
| 2 | **Forgot Password** (`/forgot-password`) | 3-step self-service reset: enter username → set new password (with strength score 0–4, visual bar, and confirm field) → success screen. |
| 3 | **Master Inventory** (`/master-inventory`) | Advanced inventory with separate tabs for raw materials, finished products, scrap, and promotional items. Includes a full **Bill of Materials (BOM) builder** allowing products to be composed of raw material components with quantities and additional cost entries. |
| 4 | **Unit Master** (`/unit-master`) | Dedicated module for defining measurement units (KG/LITER/PIECE/METER), managing raw material base records, and finished product specifications. Entirely separate concern from the product catalog. |
| 5 | **Machine Inventory** (`/machine-inventory`) | Machine parts/spare parts/tools tracking with part codes, part numbers, vendor, condition ratings, purchase dates, and warranty expiry tracking — an industrial asset management feature. |
| 6 | **HR Department** (`/hr-department`) | Complete HRMS: create/edit/delete employees, status lifecycle, role type assignment, search & filter by status, pagination, and demographic data (blood group, DOB, gender, address). No mention of this in the original proposal. |
| 7 | **Sales Dashboard** (`/sales/sales-dashboard`) | Dark-themed analytics cockpit for individual sales reps with today/month/year period toggles, volume analytics (MTD/WTD/YTD), and a built-in payment-entry form (6 payment methods). |
| 8 | **My Payments** (`/sales/my-payments`) | Per-salesperson payment record viewer showing pending payments pulled by salesperson ID. |
| 9 | **Sales Distributor** (`/sales-distributor`) | Empty scaffold page with no content or API calls — dead route that should be removed. |
| 10 | **Logistics** (`/logistics`) | Full shipment tracking system with transport mode icons (road/rail/air/sea), step-by-step timeline per shipment, vehicle number, driver phone, total weight/packages, origin/destination — a logistics visibility platform, not just "logistics entry". |
| 11 | **Complaints Submission** (`/complaints`) | Customer-facing form to lodge complaints with subject, category, priority, full description, and contact details submitted to a dedicated `/api/complaints/create` endpoint. |
| 12 | **Complaints Management** (`/complaints-management`) | Admin ticketing dashboard: full paginated list with search, category and status filters, status-update modal, per-complaint detail drawer, and priority badges. |
| 13 | **Feedback Page** (`/feedback`) | Second feedback form (separate from complaints), currently not wired to a real API (uses a 1-second `setTimeout` stub). Duplicate of complaints intent. |
| 14 | **Hierarchy Map Component** (embedded) | Interactive visual org-chart component rendering the NSM→SSM→ZSM→RSM→ASM→SO→SE tree — richer than a text-based list. |

---

### 2.2 Out-of-Scope Services & Utilities (7 items)

| # | Service / Utility | What It Does |
|---|------------------|--------------|
| 1 | `complaints.service.ts` | Full CRUD + status-update API layer for a complaints/ticketing system (`/api/complaints`). |
| 2 | `haptic.service.ts` | Native haptic feedback wrapper (Capacitor Haptics API) — light/medium/heavy impact, success/warning/error notifications, vibrate — mobile UX enhancement not in scope. |
| 3 | `download.service.ts` | Cross-platform PDF download service: triggers browser download on web, writes to `Documents` folder via Capacitor Filesystem on Android. |
| 4 | `distributor-profile.service.ts` | Reactive global state (BehaviorSubject) holding the logged-in distributor's full profile across the app — a state management pattern not required by the original spec. |
| 5 | `dashboard.service.ts` (multi-role analytics) | Provides role-specific analytics endpoints: `getDistributorAnalytics(id)` and `getSalespersonAnalytics(id)` in addition to generic `getAnalytics()` — extra reporting surface. |
| 6 | `sales-analytics.service.ts` (inside sales-dashboard) | Separate analytics service specifically for sales reps: volume analytics by period, call metrics, additional KPIs not in the base reporting scope. |
| 7 | `acl.directive.ts` (ACL Directive) | Structural directive enabling template-level feature-gate rendering (`*aclCan="'FEATURE_NAME'"`) — advanced permission system beyond role-based routing. |

---

## Section 3 — Third-Party Integrations

### 3.1 IN SCOPE (justified by requirements)

| Library | Version | Purpose |
|---------|---------|---------|
| `@ionic/angular` | ^8.0.0 | UI component framework for mobile-first app |
| `@angular/core` et al. | ^20.0.0 | Core application framework |
| `rxjs` | ~7.8.0 | Reactive data streams |
| `ionicons` | ^7.0.0 | Icon set used throughout the app |

### 3.2 OUT OF SCOPE (added beyond basic requirements)

| Library | Version | What It Adds | Why Out of Scope |
|---------|---------|--------------|-----------------|
| **`ng-apexcharts` + `apexcharts`** | ^2.0.4 / ^5.3.6 | Interactive animated charts (area, bar, line with tooltips, zoom, animations) | Original spec says "Reporting & Dashboards" but basic bar/line charts could be native Ionic or CSS-only. A full ApexCharts integration is an upgraded delivery. |
| **`@capacitor/android`** | 7.4.4 | Packages the web app as a native Android APK | While a distributor mobile app was mentioned, the full Capacitor/native build pipeline goes beyond a web-responsive page. |
| **`@capacitor/filesystem`** | ^7.1.8 | Writes files to the native Android `Documents` folder | Required to support the out-of-scope PDF native download feature. |
| **`@capacitor/haptics`** | 7.0.2 | Vibration feedback on device | Enhances UX on mobile — not in any functional requirement. |
| **`@capacitor/keyboard`** + **`@capacitor/status-bar`** | 7.0.3 | Native keyboard/status bar management on Android/iOS | Native mobile polish, not listed in requirements. |
| **`tailwindcss`** (+ `postcss`, `autoprefixer`) | (latest) | Utility-first CSS for all custom layouts and styling | A deliberate design-system choice enhancing the frontend aesthetics beyond basic Ionic styling. |
| **`angular-cli-ghpages`** | ^3.0.2 | Automated GitHub Pages deployment tooling | CI/CD deployment utility — not required by the project spec. |

---

## Section 4 — API Endpoints Beyond Original Scope

The `environment.ts` reveals backend base URLs that correspond to features outside the original proposal:

| API Base | Used By | Scope Status |
|----------|---------|-------------|
| `https://api.imsnectarorigin.com/api` | All core features | ✅ IN SCOPE |
| `/api/hr` | HR Department module | ❌ OUT OF SCOPE |
| `/api/dealers` | Dealer management (separate entity from distributors) | ❌ OUT OF SCOPE |
| `/api/dealer-ledger` | Dealer-specific ledger tracking | ❌ OUT OF SCOPE |
| `/api/complaints` | Complaints ticketing system | ❌ OUT OF SCOPE |
| `/api/dashboard/analytics?salespersonId=` | Role-specific analytics per salesperson | ❌ OUT OF SCOPE (expanded from basic dashboard) |
| `/api/dashboard/analytics?distributorId=` | Role-specific analytics per distributor | ❌ OUT OF SCOPE (expanded) |
| `/api/role-feature-permissions` | Per-feature CRUD permission matrix | ❌ OUT OF SCOPE (expanded beyond basic role assignment) |

---

## Section 5 — Feature Flag / Permission-Gated Sections

The application implements a **two-layer access control system**:

1. **`AuthGuard`** — standard JWT-based route guard (all protected routes use this)  
2. **`AclGuard`** + **`Acl` service** + **`AclDirective`** — feature-name-based CRUD permission matrix stored per role in the backend (`/api/role-feature-permissions`). Each feature can independently grant/deny `canCreate`, `canRead`, `canUpdate`, `canDelete`.

Currently only the `/dispatch` route uses `AclGuard` with `data: { feature: 'DISPATCH' }`, but the full infrastructure exists to gate any route or template element by feature name.

> **Note:** The full granular ACL system (per-feature CRUD matrix) is an **out-of-scope expansion** of the basic role-based access described in the proposal.

---

## Section 6 — Summary Counts

### Pages / Screens

| Category | IN SCOPE | OUT OF SCOPE |
|----------|---------|-------------|
| Authentication | 1 (login) | 2 (signup, forgot-password) |
| Dashboard | 2 | 0 |
| Inventory | 0 | 3 (master-inventory, unit-master, machine-inventory) |
| Distributor & Cart | 2 | 1 (sales-distributor placeholder) |
| Sales Team | 3 | 3 (sales-dashboard, my-payments, hierarchy-map component) |
| Accounts | 4 | 0 |
| Operations & Dispatch | 3 | 1 (logistics) |
| HR | 0 | 1 (hr-department) |
| Complaints & Feedback | 0 | 3 (complaints, complaints-management, feedback) |
| Utility | 1 (not-found) | 0 |
| **TOTAL** | **16 routes + 2 embedded = 17** | **12 routes + 2 components = 14** |

### Services

| Category | IN SCOPE | OUT OF SCOPE |
|----------|---------|-------------|
| Core services (auth, sales, dispatch, distributor, accounts, invoice, gdn, user, inventory, unit, cart, proforma-invoice) | 12 | 0 |
| Extra services | 0 | 7 |

### Third-Party Libraries

| Category | IN SCOPE | OUT OF SCOPE |
|----------|---------|-------------|
| Framework & essentials | 4 | 0 |
| Extra integrations | 0 | 7 |

---

## Section 7 — Change-Request Value Items

The following represent billable additional work delivered beyond the agreed proposal scope:

1. **HR Department Module** — Full employee management HRMS (`/hr-department` + API integration)
2. **Complaints & Ticketing System** — Submission form + admin management dashboard + backend API (`/complaints`, `/complaints-management`)
3. **Logistics Tracking Module** — Multi-transport-mode shipment visibility system (`/logistics`)
4. **Machine / Spare Parts Inventory** — Asset management for tools, spare parts, and machinery (`/machine-inventory`)
5. **Master Inventory with BOM Builder** — Full inventory management with Bill of Materials (`/master-inventory`)
6. **Unit Master Module** — Raw material and finished product definitions (`/unit-master`)
7. **Sales Analytics Dashboard** — Dedicated salesperson cockpit with period-based KPIs (`/sales/sales-dashboard`)
8. **Self-Service Auth** — Signup and forgot-password flows (`/signup`, `/forgot-password`)
9. **Advanced ACL / Feature-Permission System** — Per-feature CRUD matrix beyond role-based access
10. **Capacitor Native Mobile Build** — Android APK packaging, haptics, filesystem, status bar
11. **ApexCharts Integration** — Advanced interactive charting library
12. **Feedback Page** — Standalone form (even though currently stubbed)
13. **My Payments Screen** — Individual salesperson payment tracker
14. **Hierarchy Map Visual Component** — Interactive org-chart visualization

---

*This document was generated by static codebase analysis. For the unified full-stack change-request document, merge with the backend scope audit report.*
