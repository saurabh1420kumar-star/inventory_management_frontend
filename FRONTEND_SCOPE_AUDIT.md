# Frontend Scope Audit — Inventory Management System
**Project:** IMS Nectar Origin (Angular 20 + Ionic 8 + Capacitor 7)
**Audit Date:** 2026-05-22
**Audited By:** Kumar Kautuk
**API Base:** https://api.imsnectarorigin.com/api

---

## Original Proposed Scope (Reference Baseline)

| # | Feature Area | Description |
|---|---|---|
| 1 | User Management | Role-based access; Super Admin creates users |
| 2 | Admin Portal | Create distributors, assign sales employees |
| 3 | Distributor Mobile App | Product catalog, order placement, goods receipt, retailer/dealer creation |
| 4 | Sales Team Module | Hierarchical order approval |
| 5 | Accounts Module | Proforma Invoice, payment verification, approval, final invoice |
| 6 | Operations & Dispatch | Dispatch confirmation, GDN generation, logistics entry |
| 7 | Reporting & Dashboards | MTD/YTD sales, party-wise tracking, compliance reports |
| 8 | Notification System | SMS alerts at key stages |
| 9 | Credit Limit Handling | Payment terms per distributor |
| 10 | Core Data Views | Users, orders, invoices, payments, dispatch notes |

---

## Section 1 — Complete Route & Page Inventory

### 1.1 Route Table (28 defined routes)

| # | Route Path | Component | Scope | Notes |
|---|---|---|---|---|
| 1 | /login | LoginPage | IN SCOPE | User Management |
| 2 | /signup | SignupPage | IN SCOPE | User Management |
| 3 | /forgot-password | ForgotPasswordPage | IN SCOPE | User Management |
| 4 | /dashboard | DashboardPage | IN SCOPE | Reporting & Dashboards |
| 5 | /master-inventory | MasterInventoryPage | IN SCOPE | Product catalog; core data |
| 6 | /inward | InwardPage | OUT OF SCOPE | Internal warehouse inbound stock tracking |
| 7 | /unit-master | UnitMasterPage | OUT OF SCOPE | Unit-of-measure configuration (kg, liter, piece) |
| 8 | /accounts-master | AccountsMasterPage | IN SCOPE | Accounts Module — ledger master |
| 9 | /payment-request | PaymentRequestPage | IN SCOPE | Accounts Module — payment verification queue |
| 10 | /feedback | FeedbackPage | OUT OF SCOPE | Dead-code scaffold; setTimeout stub, no real API |
| 11 | /user-right | UserRightPage | IN SCOPE | User Management — role-based ACL editor |
| 12 | /machine-inventory | MachineInventoryPage | OUT OF SCOPE | Machines, tools, spare parts inventory |
| 13 | /outward-inventory | OutwardInventoryPage | OUT OF SCOPE | Non-order outward stock movements (giving/scrap) |
| 14 | /hr-department | HrDepartmentPage | OUT OF SCOPE | HR department master configuration |
| 15 | /hr-kra-kpi | HrKraKpiPage | OUT OF SCOPE | Employee KRA/KPI performance management |
| 16 | /distributor | DistributorPage | IN SCOPE | Admin Portal — distributor master CRUD |
| 17 | /order-details | OrderDetailsPage | IN SCOPE | Core Data Views — order tracking |
| 18 | /sales | SalesPage | IN SCOPE | Sales Team Module — approval pipeline |
| 19 | /sales-distributor | SalesDistributorPage | OUT OF SCOPE | Empty scaffold — dead code |
| 20 | /distributor-cart | DistributorCartPage | IN SCOPE | Distributor Mobile App — cart & order placement |
| 21 | /logistics | LogisticsPage | IN SCOPE | Operations & Dispatch — logistics entry |
| 22 | /dispatch | DispatchPage | IN SCOPE | Operations & Dispatch — GDN generation |
| 23 | /complaints | ComplaintsPage | OUT OF SCOPE | Complaint creation & tracking |
| 24 | /complaints-management | ComplaintsManagementPage | OUT OF SCOPE | Admin complaint resolution dashboard |
| 25 | /proforma-invoice | ProformaInvoicePage | IN SCOPE | Accounts Module — PI viewing & approval |
| 26 | /gdn | GdnPage | IN SCOPE | Operations & Dispatch — GDN document viewer |
| 27 | /pi-update | PiUpdatePage | IN SCOPE | Accounts Module — PI amendment workflow |
| 28 | ** (catch-all) | NotFoundPage | — | Infrastructure 404 |

### 1.2 Sub-Screens & Nested Pages

| # | Screen | Parent Route | Scope | Notes |
|---|---|---|---|---|
| 29 | Distributor Dashboard | /dashboard | IN SCOPE | Reporting — distributor MTD/YTD metrics |
| 30 | Sales Dashboard | /dashboard (sales role) | IN SCOPE | Reporting — salesperson analytics |
| 31 | Salesperson Onboarding | /sales/salesperson-onboarding | IN SCOPE | Admin Portal — create/assign sales employees |
| 32 | Hierarchy Orders | /sales/hierarchy-orders | IN SCOPE | Sales Team Module — zone/role filtered orders |
| 33 | My Payments | /sales/my-payments | OUT OF SCOPE | Salesperson personal payment history ledger |
| 34 | Hierarchy Map Org-Chart | Component inside Hierarchy Orders | OUT OF SCOPE | Interactive visual org-chart of sales tree |
| 35 | Home Page | /home | — | Redirect placeholder (no content) |

---

## Section 2 — Out-of-Scope Features: Detailed Descriptions

1. INWARD INVENTORY (/inward)
   Full internal warehouse inbound stock receipt workflow. Records item, quantity, source, and date for stock arriving into the company warehouse. Completely separate from distributor goods receipt. Has its own API endpoints at /api/products/inward-inventory.
   Complexity: Medium

2. UNIT MASTER (/unit-master)
   CRUD management for units of measurement (KG, LITER, PIECE, METER, DOZEN, etc.) with toggle-status and pagination. Feeds every inventory form across the app as a shared dropdown dependency.
   Complexity: Low-Medium

3. MACHINE INVENTORY (/machine-inventory)
   Dedicated inventory module for machines, tools, spare parts, and promotional items — entirely separate from the sales product catalog. Includes image upload, category filtering (TOOL, SPARE_PART, MACHINE), and outward movement tracking of these assets.
   Complexity: Medium-High

4. OUTWARD INVENTORY (/outward-inventory)
   Non-sales stock movement tracking: items given as samples/promotional, returned parts, and scrap disposals. Two transaction types (OUTWARD_GIVING, RETURNED_PART) with separate endpoints for spare parts, promotional, and scrap sub-types.
   Complexity: Medium

5. HR DEPARTMENT (/hr-department)
   HR master for creating and managing internal company departments with full CRUD and toggle-status. Entirely unrelated to sales, inventory, or distribution.
   Complexity: Low

6. HR KRA/KPI (/hr-kra-kpi)
   Employee performance management: set KRAs and KPIs, track scores, and export reports to both PDF (via jsPDF) and Excel (via xlsx). Includes date-range filtering and employee-wise breakdowns. This module drove two additional third-party library integrations.
   Complexity: High

7. FEEDBACK PAGE (/feedback)
   User feedback form wired to a setTimeout stub — does not call any real API endpoint. Confirmed dead code in project documentation.
   Complexity: Negligible (stub only)

8. SALES DISTRIBUTOR (/sales-distributor)
   Route and module defined but the page is an empty scaffold with zero implementation.
   Complexity: Negligible (stub only)

9. COMPLAINTS (/complaints)
   Full complaint management: create with category (PAYMENT, ACCOUNT, TECHNICAL, DELIVERY, OTHER), priority (LOW, MEDIUM, HIGH, CRITICAL), paginated list with filters, and status lifecycle (OPEN > IN_PROGRESS > RESOLVED > CLOSED).
   Complexity: Medium

10. COMPLAINTS MANAGEMENT (/complaints-management)
    Admin/manager view for resolving complaints — view all tickets, update statuses, and close issues. Separate from the user-facing complaints page.
    Complexity: Medium

11. MY PAYMENTS (/sales/my-payments)
    Personal payment history screen for sales representatives. Shows their order-linked payment transactions. Not the Accounts approval workflow but a personal ledger view for sales staff.
    Complexity: Low-Medium

12. HIERARCHY MAP ORG-CHART (component)
    Interactive visual org-chart rendering the entire sales hierarchy tree (NSM > SSM > ZSM > RSM > ASM > SO > SE) as a node graph. Custom component with dedicated node renderer — far beyond a standard tabular list.
    Complexity: Medium-High

13. HAPTIC FEEDBACK SYSTEM (HapticService)
    Dedicated service wiring Capacitor Haptics into toasts, button interactions, and UI events across the whole app. Provides 6 vibration patterns (light, medium, heavy, success, warning, error) on Android devices.
    Complexity: Low

14. BILL OF MATERIALS (within Master Inventory)
    Full BOM management embedded in the Master Inventory page: create, update, delete, and paginate BOM records linking raw materials to finished products with quantities, plus a BOM summary statistics panel.
    Complexity: Medium-High

15. GOODS RECEIPT WITH SATISFACTION RATING (within Distributor flow)
    The distributor order confirmation includes a satisfaction rating score in addition to basic receipt acknowledgement. The proposal requires receipt only — rating is an extra UX feature.
    Complexity: Low

16. JOURNAL VOUCHER (within Accounts Master)
    Create and list Journal Vouchers per distributor (POST /api/accounts/journal-voucher, GET /api/accounts/jv-by-distributor/{id}). A double-entry accounting JV system beyond basic payment approval.
    Complexity: Medium

17. CREDIT-PATH PI APPROVAL (within Accounts flow)
    Separate PI approval pathway using available credit (POST /api/accounts/approve-PI-using-credit/{cartId}). While credit limit handling is in scope, this distinct approval flow is an added financial workflow.
    Complexity: Low-Medium

18. DEALER LEDGER PDF DOWNLOAD (within Accounts)
    Integration of POST /api/dealer-ledger/download-pdf?dealerId=X for dealer-specific ledger PDFs — a sub-feature not in the original proposal.
    Complexity: Low

19. DARK MODE / ROLE-AWARE THEME SYSTEM
    Role-aware theming: SALES and DISTRIBUTOR roles automatically get a dark theme applied at the document root. Admin/desktop roles get light theme. Fully implemented with Ionic CSS variable bridging.
    Complexity: Low-Medium

20. GRANULAR 4-PERMISSION ACL MATRIX (User Rights page)
    Beyond basic RBAC, a full UI for setting canCreate, canRead, canUpdate, canDelete per feature per role — a complete permission matrix editor. The proposal specifies role-based access, not a dynamic 4-dimension permission matrix.
    Complexity: Medium-High

---

## Section 3 — Third-Party Integrations Audit

### NPM Library Verdict

| Library | Version | Purpose | Verdict |
|---|---|---|---|
| apexcharts + ng-apexcharts | ^5.3.6 / ^2.0.4 | Dashboard charts (bar, line, donut, area) | IN SCOPE — dashboards are required |
| jspdf + jspdf-autotable | ^4.2.1 / ^5.0.7 | Client-side PDF for GDN, PI, invoices | IN SCOPE — PDF export is required |
| xlsx | ^0.18.5 | Excel export for KRA/KPI reports | OUT OF SCOPE — added for out-of-scope HR KPI module |
| @capacitor/haptics | 7.x | Android vibration/haptic feedback | OUT OF SCOPE — UX enhancement only |
| @capacitor/filesystem | 7.x | Save PDFs to Android Downloads folder | IN SCOPE — required for Android PDF downloads |
| angular-cli-ghpages | ^3.0.2 | GitHub Pages deployment | Dev/deployment tool only |

### API Domain Breakdown

| Domain | Base Path | Verdict |
|---|---|---|
| Auth & Users | /api/auth, /api/createUsers | IN SCOPE |
| Products (finished, raw materials) | /api/products/finished-products, /api/products/raw-materials | IN SCOPE |
| Machine Parts, Scrap, Outward Items | /api/products/machine-parts, /api/products/outward-items | OUT OF SCOPE |
| Bill of Materials | /api/bill-of-materials/* | OUT OF SCOPE |
| Orders & Cart | /api/cart/*, /api/order/* | IN SCOPE |
| Distributors | /api/distributors/* | IN SCOPE |
| Sales Hierarchy | /api/sales-hierarchy/* | IN SCOPE |
| Accounts & Payments (core) | /api/accounts/* (approvals, payments) | IN SCOPE |
| Journal Voucher, Add-Credit | /api/accounts/journal-voucher, /api/accounts/add-credit | OUT OF SCOPE |
| Dispatch & GDN | /api/dispatch/* | IN SCOPE |
| Ledger | /api/ledger/* | IN SCOPE |
| Dashboard Analytics | /api/dashboard/* | IN SCOPE |
| HR Master & KRA | /api/hr/*, /api/hrmaster/* | OUT OF SCOPE |
| Units | /api/units/* | OUT OF SCOPE |
| Role-Feature Permission Matrix | /api/role-feature-permissions/* | OUT OF SCOPE |
| Complaints | /api/complaints/* | OUT OF SCOPE |
| Dealer Ledger | /api/dealer-ledger/* | OUT OF SCOPE |
| Dealers | /api/dealers/* | OUT OF SCOPE |

---

## Section 4 — In-Scope Gaps (Proposed but Not Delivered)

1. COMPLIANCE REPORTS
   No dedicated compliance report screen found. The dashboard covers MTD/YTD sales analytics but a distinct compliance reporting view is absent.

2. RETAILER / DEALER CREATION UI
   The dealersUrl environment variable and /api/dealers path exist, but no dedicated dealer or retailer creation page appears in the route table or component tree. The Distributor Mobile App scope explicitly listed retailer/dealer creation.

3. NOTIFICATION / SMS ALERT FRONTEND
   No SMS alert management, notification history, or alert configuration screen is present. If the notification system was meant to have any frontend component, it was not built.

---

## Section 5 — Scope Matrix (All Proposed Features vs Delivered)

| Proposed Feature | Built? | Verdict |
|---|---|---|
| Login / Signup / Forgot Password | Yes | IN SCOPE |
| Role-based access control (guards + directives) | Yes | IN SCOPE |
| Dynamic 4-permission matrix editor | Yes | OUT OF SCOPE |
| Super Admin creates users | Yes | IN SCOPE |
| Admin creates distributors | Yes | IN SCOPE |
| Admin assigns sales employees | Yes | IN SCOPE |
| Distributor product catalog | Yes | IN SCOPE |
| Distributor order placement (cart) | Yes | IN SCOPE |
| Distributor goods receipt confirmation | Yes | IN SCOPE |
| Goods receipt with satisfaction rating | Yes | OUT OF SCOPE — rating is extra |
| Retailer/Dealer creation UI | No | GAP — not built |
| Sales hierarchical order approval | Yes | IN SCOPE |
| Sales org-chart visualization | Yes | OUT OF SCOPE |
| Salesperson My Payments history | Yes | OUT OF SCOPE |
| Proforma Invoice viewing | Yes | IN SCOPE |
| PI amendment workflow | Yes | IN SCOPE |
| Payment verification & approval queue | Yes | IN SCOPE |
| Final invoice download | Yes | IN SCOPE |
| Journal Voucher creation | Yes | OUT OF SCOPE |
| Credit-path PI approval | Yes | OUT OF SCOPE |
| Dispatch confirmation | Yes | IN SCOPE |
| GDN generation | Yes | IN SCOPE |
| GDN document viewer | Yes | IN SCOPE |
| Logistics entry | Yes | IN SCOPE |
| MTD/YTD dashboards (all roles) | Yes | IN SCOPE |
| Party-wise order tracking | Yes | IN SCOPE |
| Compliance reports | No | GAP — not built |
| SMS notification UI | No | GAP (possibly backend-only) |
| Credit limit per distributor | Yes | IN SCOPE |
| Bill of Materials (BOM) | Yes | OUT OF SCOPE |
| Internal Inward Inventory | Yes | OUT OF SCOPE |
| Machine / Tools / Spare Parts Inventory | Yes | OUT OF SCOPE |
| Outward / Scrap Movements | Yes | OUT OF SCOPE |
| Unit Master configuration | Yes | OUT OF SCOPE |
| HR Department master | Yes | OUT OF SCOPE |
| HR KRA/KPI with PDF & Excel export | Yes | OUT OF SCOPE |
| Complaint creation & tracking | Yes | OUT OF SCOPE |
| Admin complaint management | Yes | OUT OF SCOPE |
| Dealer Ledger PDF | Yes | OUT OF SCOPE |
| Dark Mode theme system | Yes | OUT OF SCOPE |
| Haptic feedback (Android) | Yes | OUT OF SCOPE |
| Excel export (xlsx) | Yes | OUT OF SCOPE |

---

## Section 6 — Final Count Summary

| Metric | Value |
|---|---|
| Total routes defined in router | 28 |
| Total page files (.page.ts) | 35 |
| Total screens audited (routes + sub-screens) | 35 |
| IN SCOPE screens | 20 (57%) |
| OUT OF SCOPE screens | 15 (43%) |
| Dead-code / stub screens | 2 (Feedback, Sales Distributor) |
| In-scope gaps (not delivered) | 3 |
| Third-party libraries beyond requirements | 2 (xlsx, @capacitor/haptics) |
| Out-of-scope API domains integrated | 7 |
| Total distinct API endpoints called | 100+ |
| Estimated endpoints for out-of-scope features | ~40 |

---

*Generated by automated source analysis of the Angular/Ionic frontend repository.
All routes, components, API endpoints, and third-party dependencies were verified
directly from source files: app-routing.module.ts, package.json, src/app/services/*,
src/environments/environment.ts, and all .page.ts / .component.ts files.*
