# NAYLA — Inventory Management System
## Full Views & Pages Report

> **Framework:** Angular 17 + Ionic (Capacitor)  
> **Styling:** Tailwind CSS + SCSS  
> **Platform:** Web (desktop) + Mobile (Android via Capacitor)  
> **Generated:** May 7, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Navigation](#2-architecture--navigation)
3. [Authentication Pages](#3-authentication-pages)
   - [Login](#31-login-page)
   - [Signup](#32-signup-page)
   - [Forgot Password](#33-forgot-password-page)
4. [Core Layout Components](#4-core-layout-components)
   - [App Component](#41-app-component)
   - [Sidebar Navigation](#42-sidebar-navigation)
5. [Dashboard Pages](#5-dashboard-pages)
   - [Admin Dashboard](#51-admin-dashboard)
   - [Distributor Dashboard](#52-distributor-dashboard)
6. [Sales Module](#6-sales-module)
   - [Sales Management (Order Approval)](#61-sales-management--order-approval)
   - [Sales Dashboard](#62-sales-dashboard)
   - [Salesperson Onboarding / Reporting Manager](#63-salesperson-onboarding--reporting-manager)
   - [Hierarchy Orders](#64-hierarchy-orders)
   - [My Payments](#65-my-payments)
7. [Inventory Module](#7-inventory-module)
   - [Master Inventory](#71-master-inventory)
   - [Unit Master](#72-unit-master)
   - [Machine Inventory (Machine Parts)](#73-machine-inventory--machine-parts)
   - [Inward Inventory](#74-inward-inventory)
   - [Outward Inventory](#75-outward-inventory)
8. [Accounts Module](#8-accounts-module)
   - [Accounts Master (Ledger)](#81-accounts-master--ledger)
   - [Payment Request](#82-payment-request)
   - [PI Update (Proforma Invoice Update)](#83-pi-update)
9. [Order & Dispatch Module](#9-order--dispatch-module)
   - [Order Tracking](#91-order-tracking)
   - [Dispatch & GDN](#92-dispatch--gdn)
   - [Proforma Invoice](#93-proforma-invoice)
   - [GDN (Goods Delivery Note)](#94-gdn-goods-delivery-note)
10. [Distributor Module](#10-distributor-module)
    - [Distributor Management](#101-distributor-management)
    - [Distributor Cart (Mobile)](#102-distributor-cart--mobile-ordering)
    - [Sales Distributor](#103-sales-distributor)
11. [HR Department Module](#11-hr-department-module)
12. [Logistics Module](#12-logistics-module)
13. [Complaints & Feedback Module](#13-complaints--feedback-module)
    - [Complaints Submission](#131-complaints-submission)
    - [Complaints Management (Admin)](#132-complaints-management--admin)
    - [Feedback](#133-feedback)
14. [User Rights Module](#14-user-rights-module)
15. [Guards & ACL System](#15-guards--acl-system)
16. [Services Overview](#16-services-overview)
17. [Role Types & Access Matrix](#17-role-types--access-matrix)
18. [Summary Table of All Routes](#18-summary-table-of-all-routes)

---

## 1. Project Overview

**NAYLA** (Nectar Inventory Management System) is a full-stack business management application built for a manufacturing/distribution company. It manages the complete lifecycle from inventory inward, manufacturing, sales order creation, dispatch, delivery tracking, to payments and accounting.

**Key Capabilities:**
- Multi-role access control (20+ distinct role types)
- Admin web dashboard with business analytics
- Mobile-first app for Sales Officers and Distributors (Capacitor/Android)
- Real-time order approval and tracking pipeline
- Ledger-based accounts management
- Sales hierarchy management (Zone → RSM → ASM → SE)
- HR employee management and onboarding

---

## 2. Architecture & Navigation

```
App Root (/login)
│
├── /login               ← Public
├── /signup              ← Public
├── /forgot-password     ← Public
│
└── [AuthGuard] ─ Protected Routes:
    ├── /dashboard
    ├── /master-inventory
    ├── /unit-master
    ├── /inward
    ├── /outward-inventory
    ├── /machine-inventory
    ├── /accounts-master
    ├── /payment-request
    ├── /pi-update
    ├── /hr-department
    ├── /distributor
    ├── /distributor-cart
    ├── /order-details
    ├── /proforma-invoice
    ├── /gdn
    ├── /sales
    │   ├── (index)             ← Sales Management
    │   ├── /sales-dashboard    ← Sales Officer Dashboard
    │   ├── /salesperson-onboarding
    │   ├── /hierarchy-orders
    │   └── /my-payments
    ├── /sales-distributor
    ├── /logistics
    ├── /dispatch              ← AclGuard (DISPATCH feature)
    ├── /complaints
    ├── /complaints-management
    ├── /feedback
    ├── /user-right
    └── /not-found
```

**Routing Guards:**
- `AuthGuard` — Checks `localStorage` for a valid auth token. Redirects to `/login` if unauthenticated.
- `AclGuard` — Feature-level permission check. Used on `/dispatch` to ensure only users with the `DISPATCH` feature can access it.

---

## 3. Authentication Pages

### 3.1 Login Page
**Route:** `/login`  
**File:** `src/app/login/login.page.ts`

The entry point of the application. Branded with the NAYLA logo (Nectar Inventory Management System).

**Functionality:**
- **Reactive Form Validation** — Username (min 3 chars) and Password (min 6 chars) with inline error messages.
- **Password Toggle** — Eye icon to show/hide password text.
- **Role-Based Routing on Login:**
  - `DISTRIBUTOR` / `SALES_OFFICER` roles are **restricted to mobile app only** (blocked on desktop with a warning toast).
  - Sales roles (all sales hierarchy roles) → redirect to `/sales/sales-dashboard`.
  - `DISTRIBUTOR` on mobile → redirect to `/dashboard` (shows Distributor Dashboard).
  - All others → redirect to `/dashboard`.
- **Forgot Password Link** — Navigates to `/forgot-password`.
- **Haptic Feedback** — Medium haptic on submit, light on field interactions (mobile).
- **Auth Token Storage** — Stores `auth_token`, `auth_role_type`, `auth_username`, `auth_user_id`, `auth_salesperson_id`, `auth_features`, `auth_feature_names` in `localStorage`.

**UI Theme:** Light — white glassmorphism card on a blue-to-emerald gradient background.

---

### 3.2 Signup Page
**Route:** `/signup`  
**File:** `src/app/signup/signup.page.ts`

Self-registration form for new users.

**Functionality:**
- Collects: First Name, Last Name, Username, Employee Roll No., Email, Password, Contact Number, Gender, Blood Group, Date of Birth, Country, City, Zip, Address.
- **Role Assignment** — Dropdown of all 20 role types (Admin, Plant Manager, HR Manager, Sales Officers, etc.).
- **Country Dropdown** — USA, UK, Canada, Australia, India, Germany, France.
- **Blood Group & Gender Dropdowns** — Standard options.
- Form validation with Reactive Forms.
- Calls `Auth.register()` API and redirects to login on success.

---

### 3.3 Forgot Password Page
**Route:** `/forgot-password`  
**File:** `src/app/forgot-password/forgot-password.page.ts`

Multi-step password reset flow.

**Functionality:**
- **Step 1 — Enter Username:** User enters their username to initiate reset.
- **Step 2 — Set New Password:** Enter new password + confirm password with:
  - Real-time **password strength meter** (0–4 score, with label: Weak / Fair / Good / Strong and color indicator).
  - Validation: Minimum 8 chars, must contain uppercase, lowercase, digit, and special character.
  - Passwords-match validator.
  - Show/hide password toggles for both fields.
- **Step 3 — Success Screen:** Confirmation message with redirect to login.
- Uses `Auth` service to call the password reset API.

---

## 4. Core Layout Components

### 4.1 App Component
**File:** `src/app/app.component.ts`

The root shell component. Manages the overall layout between desktop and mobile views.

**Functionality:**
- Detects if the current route is an "auth page" (login, signup, forgot-password) and hides the sidebar for those routes.
- On desktop: renders sidebar + main content split layout.
- On mobile (Capacitor native): renders full-screen content without the desktop sidebar frame.
- Initializes Capacitor plugins (StatusBar, SplashScreen).

---

### 4.2 Sidebar Navigation
**Route:** Used as embedded component within App layout  
**File:** `src/app/sidebar/sidebar.page.ts`

The main navigation sidebar displayed on the left for authenticated users.

**Functionality:**
- Displays **logged-in user's name and role**.
- **Collapsible** — Can be toggled between full-width and icon-only mode via parent event binding.
- **Role-based menu rendering** — Menu items are conditionally shown using `*appAcl` directive based on user's feature permissions.
- **Menu Items:**
  - Dashboard
  - Accounts (Accounts Master, Payment Requests, PI Update)
  - Human Resources (HR Department)
  - Distributor Management
  - Sales (Sales Management, Reporting Manager, Hierarchy Orders)
  - Inventory (Master Inventory, Unit Master, Machine Parts, Inward, Outward)
  - Order Tracking
  - Proforma Invoice / GDN
  - Dispatch & GDN
  - Logistics
  - Complaints & Feedback
  - Manage Complaints (admin-only)
  - User Rights
  - Operations
- **Distributor Profile Modal** — For distributor-role users, displays a profile summary modal triggered from the sidebar.
- **Logout Button** — Calls `LogoutComponent` which invokes `auth.logoutApi()` then clears localStorage and redirects to login.
- **Dark theme support** — Sidebar switches to dark glass theme for Sales/Distributor roles.
- **Mobile responsive** — On mobile, sidebar behaves as a drawer overlay.

---

## 5. Dashboard Pages

### 5.1 Admin Dashboard
**Route:** `/dashboard` (when `isDistributor = false`)  
**File:** `src/app/dashboard/dashboard.page.ts`

The main business intelligence dashboard for admin/manager roles.

**Functionality:**
- **Period Selector** — Toggle between Week-to-Date (WTD), Month-to-Date (MTD), Year-to-Date (YTD). Updates all KPI stats dynamically.
- **KPI Stats Cards (4 cards):**
  1. Total Sales (₹ value with change badge)
  2. Total Transactions (count with change badge)
  3. Avg Order Value (₹ per order)
  4. Total Orders (count)
- **Revenue Trend Chart** — ApexCharts line/bar chart showing monthly revenue and order count. Toggle between Line and Bar via dropdown.
- **Sales by Region Donut Chart** — ApexCharts donut showing regional sales distribution.
- **Period Comparison Table** — Rows comparing WTD / MTD / YTD for key metrics.
- **User Stats Cards** — Employee-related stats.
- **Loading Skeleton** — Animated pulse placeholders while data loads.
- Calls `DashboardService.getAnalytics()` for all data.

**UI Theme:** Light — white cards on a slate/emerald gradient background. Hero banner with gradient header.

---

### 5.2 Distributor Dashboard
**Route:** `/dashboard` (when `isDistributor = true`, embedded component)  
**File:** `src/app/dashboard/distributor-dashboard.page.ts`

The mobile-first dashboard shown when a Distributor account logs in.

**Functionality:**
- **Metric Cards** — Volume MTD/YTD, Value MTD/YTD, Total Orders, Customer Calls stats.
- **Volume Analytics** — Data fetched by distributor's salesperson ID; shows category-wise and region-wise volume breakdown.
- **Order List** — Distributor's own orders with status indicators.
- **Transaction History** — Recent ledger transactions with Cleared/In Process/Pending/Failed statuses.
- **Quick Action Buttons** — Links to place orders (Distributor Cart), check ledger.
- **Balance Display** — Current ledger credit/debit balance summary.
- Integrates with `DistributorService`, `LedgerService`, and the sales analytics API.

**UI Theme:** Dark glass — `#0d1117` background, emerald/cyan/teal accents.

---

## 6. Sales Module

### 6.1 Sales Management / Order Approval
**Route:** `/sales` (index)  
**File:** `src/app/sales/sales.page.ts`

The primary sales operations page for Admin/Sales Manager roles. Manages the complete order approval pipeline.

**Functionality:**
- **Order Filter Tabs:** All | Pending | Approved | PI Ready | Rejected
- **Stat Cards:** Total Orders, Pending, Approved counts.
- **Pending Orders List** — Paginated list of orders awaiting approval, each showing:
  - Order number, distributor name, order date, total amount.
  - Expandable items breakdown.
  - Approve / Reject action buttons per order.
- **Approve Cart Orders** — Secondary list from `/api/order/approve-carts` endpoint.
- **Reject Modal** — Free-text rejection remarks input before confirming rejection.
- **Proforma Invoices Section** — Lists all PI-ready invoices grouped by order with download (PDF) button.
- **GDN Section** — Lists all Goods Delivery Notes grouped by order; PDF view/download support.
- **GDN PDF Viewer** — In-page iframe PDF preview with external download fallback.
- **Search** — Real-time order search by order number or distributor name.
- **Hierarchy Visibility** — Restricts visible orders based on the logged-in salesperson's hierarchy level; managers see their team's orders.
- Role Guard: Distributors and Dealers are redirected away from this page.

---

### 6.2 Sales Dashboard
**Route:** `/sales/sales-dashboard`  
**File:** `src/app/sales/sales-dashboard/sales-dashboard.page.ts`

The personal performance dashboard for Sales Officers / Sales Executives. Dark-themed mobile-first design.

**Tabs:**
1. **Dashboard Tab:**
   - Period Selector (Today / Month / Year).
   - Analytics Stats Cards: Volume MTD/YTD, Sales Value MTD/YTD, Customer Calls MTD/YTD.
   - Volume analytics loaded from API by salesperson ID.
   - Current Financial Year label auto-calculated.

2. **Operations Tab:**
   - **Payment & Collections Section:**
     - **My Payments Card** → navigates to `/sales/my-payments`.
     - **Add Dealer Modal** — Form to register a new dealer under a distributor. Fields: Full Name, Phone, Address, Distributor (dropdown).
     - **Add Payment Modal** — Full payment entry form:
       - Balance type: Credit or Debit.
       - Date, Amount, Reference, Description.
       - Payment Method: Cash, Cheque, RTGS, NEFT, IMPS, UPI.
       - Conditional fields for UTR, Bank Name, Cheque Number, Transaction Number.
       - Receipt image upload.
       - Distributor selector dropdown.
     - **My Dealers Modal** — View list of dealers registered under the logged-in salesperson.
     - **Distributor Balance Modal** — Select a distributor to view their current ledger balance.
   - **Pending Payments List** — Shows payment requests awaiting processing.

**UI Theme:** Dark — `#0d1117`, emerald `#10b981`, cyan `#06b6d4` accents.

---

### 6.3 Salesperson Onboarding / Reporting Manager
**Route:** `/sales/salesperson-onboarding`  
**File:** `src/app/sales/salesperson-onboarding/salesperson-onboarding.page.ts`

Manages the sales hierarchy — adding, editing, and organizing sales personnel.

**Functionality:**
- **Sales Persons List** — All sales personnel grouped by role (National Sales Manager → State → Zonal → Regional → Area → Sales Officer → Sales Executive).
- **Role Group Collapsing** — Each role group can be collapsed/expanded independently.
- **Add / Edit Form (toggle):**
  - Basic Info: Name, First Name, Last Name, Employee Code, Role.
  - Personal Details: Gender, Date of Birth, Blood Group, Status.
  - Login Credentials: Username, Password.
  - Organization: Zone, Region, Manager Designation (dropdown), Manager (dynamic dropdown filtered by selected designation).
  - Contact: Phone, Email, City, State, Address.
- **Dynamic Manager Dropdown** — When a manager designation is selected, loads matching managers from API.
- **Delete Modal** — Confirmation before deleting a sales person.
- **Search** — Filter list by name or employee code.
- **Hierarchy Map** — Embedded `HierarchyMapComponent` showing the tree structure visually.
- Roles filter: Shows only salesperson roles available in the hierarchy.
- Current user's own hierarchy position is detected and shown distinctly.

---

### 6.4 Hierarchy Orders
**Route:** `/sales/hierarchy-orders`  
**File:** `src/app/sales/hierarchy-orders/hierarchy-orders.page.ts`

Displays all orders organized by the sales hierarchy tree: **Zone → RSM → ASM → Sales Executive → Orders**.

**Functionality:**
- **Hierarchical Grouping:**
  - Groups orders by Zone, then by Regional Sales Manager (RSM), then Area Sales Manager (ASM), then Sales Executive (SE).
  - Each level shows: total orders count and total amount for that node.
  - Expand/collapse each hierarchy node independently.
- **Summary Stats:** Total Orders, Total Amount across all groups.
- **Filters:**
  - Zone filter (S BIHAR, N BIHAR).
  - Status filter (pending, approved, completed, rejected).
  - Search by order number or distributor name.
- **Order Approval** — In-line approve button on each order card.
- **Role-aware filtering** — Logged-in salesperson only sees orders within their own reporting tree. SUPER_ADMIN sees all.
- **Hierarchy Map modal** — Visual tree view of the full org structure.

---

### 6.5 My Payments
**Route:** `/sales/my-payments`  
**File:** `src/app/sales/my-payments/my-payments.page.ts`

A personal payment record viewer for Sales Officers.

**Functionality:**
- Lists all ledger-updated payments made by the logged-in salesperson (fetched using `salesperson_id`).
- Displays: Payment amount, date, reference, type, status per payment record.
- **Total Amount** — Calculated sum displayed at the top.
- **Pull-to-Refresh** — Swipe down to reload payment data.
- Back button to return to Sales Dashboard.

---

## 7. Inventory Module

### 7.1 Master Inventory
**Route:** `/master-inventory`  
**File:** `src/app/master-inventory/master-inventory.page.ts`

Central inventory item management — the main product catalog of the company.

**Functionality:**
- **Item Categories:**
  - Raw Material, Finished Product, Spare Parts, Promotional Items, Scrap Material, Unit Master, TOOL, SPARE_PART, MACHINE.
- **Stock Status Indicators:** In Stock / Low Stock / Out of Stock (computed from thresholds).
- **Search & Filter** — Real-time search by item name/SKU; filter by category and stock status.
- **Add Item Modal** — Create new inventory item with fields: name, SKU, category, unit, quantity, minimum threshold, weight, price, description.
- **Edit Item Modal** — Update existing item details.
- **BOM (Bill of Materials)** — Each finished product can have a BOM:
  - Add BOM components (raw materials + quantities).
  - Add additional costs (labor, overhead, etc.).
  - View BOM summary with total cost calculation.
- **Pagination** — Items per page with navigation.
- **Pull-to-Refresh.**
- FAB (Floating Action Button) to open Add modal.
- Integrates `InventoryService` and `UnitService`.

---

### 7.2 Unit Master
**Route:** `/unit-master`  
**File:** `src/app/unit-master/unit-master.page.ts`

Manages unit-of-measure definitions used across inventory.

**Functionality:**
- **Unit Types:** KG (20/25/50 kg), LITER (1/5/10 liter), PIECE (1/5/10 piece), METER (1/5/10 meter).
- **Categories:** Raw Material, Finished Product.
- **Unit Variants** — Predefined variant lists per unit type (e.g., KG → 20 kg, 25 kg, 50 kg).
- **Add Unit Form** — Name, type, variant, category, status (Active/Inactive).
- **Edit Unit Modal** — Update unit details.
- **Status Filter** — Filter by All / Active / Inactive.
- **Search** — Filter by unit name.
- **Pagination** — 8 items per page.
- FAB button to add new unit.

---

### 7.3 Machine Inventory / Machine Parts
**Route:** `/machine-inventory`  
**File:** `src/app/machine-inventory/machine-inventory.page.ts`

Tracks factory machinery, tools, and spare parts inventory.

**Functionality:**
- **Filter Tabs:** All | Tools | Spare Parts | Machines (maps to TOOL, SPARE_PART, MACHINE categories).
- **Search** — By part name or part number.
- **Add Machine Part Modal** — Fields: Name, Part Number, Type (Tool/Spare Part/Machine), Quantity, Unit, Description, Minimum Threshold.
- **Edit Modal** — Update part details.
- **Pagination** — 6 items per page.
- FAB button for quick add.
- Pull-to-Refresh.
- Error handling with descriptive messages from API validation responses.

---

### 7.4 Inward Inventory
**Route:** `/inward`  
**File:** `src/app/inward/inward.page.ts`

Records all inventory items received into the warehouse (goods received / inward gate entries).

**Functionality:**
- **Item Type Tabs:** Raw Material | Finished Product | Spare Parts | Promotional Items | Scrap Material — each with a distinct color/icon.
- **Inward Entry List** — All past inward records, filterable by type and searchable by item name/code/vendor.
- **Add Inward Entry Modal:**
  - Item Type selector (colored cards).
  - Common fields: Item Name, Item Code, Quantity, Min Threshold, Unit (KG/LITER/PIECES/DOZEN), Vendor Name, Vendor ID, Transport Name, Driver Name, Driver Mobile, Invoice Number, Date, Remarks.
  - **Spare Parts extras:** Part Number, Category, Purchase Date, Warranty Expiry Date, Condition.
- **Detail View Modal** — Click any entry to view full inward details.
- Pull-to-Refresh.
- Auth-token based API calls via `HttpClient`.

---

### 7.5 Outward Inventory
**Route:** `/outward-inventory`  
**File:** `src/app/outward-inventory/outward-inventory.page.ts`

Records all inventory items leaving the warehouse (issue slips, returns, scrap selling).

**Functionality:**
- **Item Type Selector:** Spare Parts | Promotional Items | Scrap Material.
- **Spare Parts sections:**
  - **Outward Giving** — Issue spare parts to employees/departments. Fields: Spare Part (dropdown from `/products/machine-parts`), Quantity, Unit, Person (employee dropdown), Remarks.
  - **Returned Part** — Record parts returned to warehouse. Fields: Part, Quantity, Condition (Good/Damaged/Needs Repair), Remarks.
- **Promotional Items sections:**
  - Issue promotional items to party type: Employee / Distributor / Salesperson.
  - Fields: Item (dropdown from `/products/promotional-items`), Quantity, Unit, Party Type selector, Party (dynamic dropdown based on party type), Purpose, Remarks.
- **Scrap Material sections:**
  - **Returned Part** — Return scrap back to warehouse.
  - **Selling Scrap** — Record scrap sold to external buyer. Fields: Scrap Item, Quantity, Unit, Buyer Name, Buyer Contact, Sale Rate, Total Amount, Remarks.
- **Outward Records List** — All past outward records with search and filter.
- Pull-to-Refresh.

---

## 8. Accounts Module

### 8.1 Accounts Master / Ledger
**Route:** `/accounts-master`  
**File:** `src/app/accounts/accounts-master/accounts-master.page.ts`

The primary accounting ledger — manages financial transactions per distributor account.

**Functionality:**
- **Distributor List Panel** — Left panel lists all distributors. Search by name.
- **Ledger Detail Panel** — Right panel shows selected distributor's full ledger:
  - **Account Summary Cards:** Total Debits, Total Credits, Net Balance, Transaction Count, Opening Balance, Closing Balance.
  - **Credit Limit Info** — Distributor's credit limit, BG (Bank Guarantee) number, BG expiry date, available credit balance.
  - **Transaction Timeline** — Chronological list of all transactions:
    - Transaction type: Credit / Debit / Journal Voucher (JV).
    - Payment method icons: RTGS, NEFT, Cheque, IMPS, UPI.
    - Columns: Date, Description, Reference, Debit, Credit, Running Balance.
    - Expandable row for UTR number, Bank Name, Cheque Number, Receipt URL.
  - **Date Range Filter** — Filter transactions by From and To date.
  - **Transaction Type Filter** — All / Credit / Debit / JV.
  - **Add Transaction Button** — Opens form to add a new ledger entry (credit/debit).
- **Proforma Invoice Section** — Shows PI invoices linked to the selected distributor.
- **Party Info** — Displays distributor's full address, contact, GSTIN, city, state, pincode.
- Pagination for both the distributor list and transaction list.
- Integrates `LedgerService` and `ProformaInvoiceService`.

---

### 8.2 Payment Request
**Route:** `/payment-request`  
**File:** `src/app/accounts/payment-request/payment-request.page.ts`

Manages incoming payment requests from distributors — approve or reject payments.

**Functionality:**
- **Payment Request List** — All payment requests with fields: Payment Request No., Distributor Name, Distributor Code, Order No., Amount, Payment Method, UTR/Cheque No., Status (PENDING/APPROVED/REJECTED), Created Date.
- **Status Filter Tabs** — All | Pending | Approved | Rejected.
- **Search** — Filter by distributor name, order number, or UTR.
- **Sort** — By date or amount.
- **Detail Modal** — Full payment details view:
  - All payment fields.
  - Receipt image (if uploaded).
  - Approve / Reject buttons.
- **Approve Modal** — Optional approval note before confirming.
- **Reject Modal:**
  - Quick-select rejection reason chips: "Duplicate payment", "Incorrect amount", "UTR / reference not found", "Payment not received in bank".
  - Free-text rejection reason field.
- **Stats Cards:** Total Pending, Total Approved, Total Amount Approved.
- Calls `AccountsService` for approval/rejection API calls.

---

### 8.3 PI Update
**Route:** `/pi-update`  
**File:** `src/app/pi-update/pi-update.page.ts`

Updates Proforma Invoice (PI) status — approves or rejects dispatching based on ledger balance check.

**Functionality:**
- **Order Tiles** — Cards for all PI-ready orders showing: Distributor Name, Order Number, Amount, dispatched status badge.
- **Search** — Filter orders by distributor name or order number.
- **Approve Dispatch Modal:**
  - Fetches the distributor's current ledger balance.
  - Shows balance sufficiency indicator (sufficient / insufficient).
  - If sufficient: allows dispatch approval.
  - If insufficient: blocks approval with warning.
- **Approve by Credit Modal** — Alternative approval flow using distributor's credit limit.
- **Reject Modal** — Enter rejection reason before rejecting dispatch.
- Auto-refreshes on `ionViewWillEnter`.

---

## 9. Order & Dispatch Module

### 9.1 Order Tracking
**Route:** `/order-details`  
**File:** `src/app/order-details/order-details.page.ts`

Tracks the end-to-end lifecycle of each order through a step-based pipeline.

**Functionality:**
- **Order List** — All orders (admin sees all; distributors see their own).
- **Stats Bar:** Total Orders, Pending, Completed counts.
- **Filter:** by status (all/pending/approved/completed/cancelled/dispatched/delivered).
- **Search** — by order number or distributor name.
- **Order Card (Expandable)** — Each order shows:
  - Order Number, Distributor Name, Order Date, Total Amount, Delivery By date.
  - **Step Tracker** — Visual timeline of order steps:
    1. Order Placed
    2. Order Approved
    3. Proforma Invoice Generated
    4. Payment Approved
    5. GDN Generated
    6. Dispatched
    7. Delivered / Received
  - Each step has: status badge (completed/in-progress/pending/cancelled), date, remarks, assigned person info.
  - Downloadable documents per step (PI PDF, GDN PDF).
  - Action buttons on applicable steps (e.g., Confirm Receipt).
- **Confirm Order Received Modal:**
  - Per-item quantity confirmation (dispatched qty vs received qty).
  - Condition selector per item (Good/Damaged/Partial).
  - Item-level remarks.
  - Overall feedback and status.
- **Dark Mode** — Automatically switches to dark theme for Distributor role users.
- Integrates `SalesService`, `GdnService`, `DistributorService`, `InvoiceService`.

---

### 9.2 Dispatch & GDN
**Route:** `/dispatch`  (AclGuard — requires DISPATCH feature)  
**File:** `src/app/dispatch/dispatch.page.ts`

Handles physical dispatch of payment-approved orders and generates GDNs.

**Functionality:**
- **Two Tabs:**
  1. **Payment Approved Orders** — Lists all orders in `payment_approved` state ready for dispatch:
     - Order details: Number, Distributor, Contact, Salesperson, Date, Amount, Items list.
     - **Generate GDN Button** — Opens GDN generation form.
     - **GDN Generation Form:**
       - Vehicle Number, Transporter Name, Shipping Address, Delivery-By Date.
       - Items with quantity and batch number.
       - Generates GDN via `GdnService`.
  2. **Download GDN** — Lists all GDNs that have been generated:
     - GDN Number, dispatch date, vehicle, status.
     - Download PDF button.
     - View PDF inline (iframe).
- **Proforma Invoice Section** — Shows PI status per order with download.
- **Stats:** Pending, Approved, GDN Generated, Dispatched counts.
- **Reject Modal** — Reject an approved order with remarks.
- **Search** — Filter by order number or distributor name.
- Integrates `DispatchService`, `ProformaInvoiceService`, `GdnService`, `DownloadService`.

---

### 9.3 Proforma Invoice
**Route:** `/proforma-invoice`  
**File:** `src/app/proforma-invoice/proforma-invoice.page.ts`

Dedicated view for all Proforma Invoices.

**Functionality:**
- **Filter Tabs:** All | Paid | Pending.
- **Search** — by PI number, distributor name, order number.
- **Invoice Cards** — Each card shows: PI Number, Order Number, Distributor, Amount, Status, Date.
- **Expand Detail** — Click card to see full PI line items (products, quantities, prices).
- **Download PDF** — Download PI as PDF. Toggle download identifier between id / cartId / piNumber.
- **View PDF Inline** — Opens PDF in an iframe modal for in-app preview.
- **Dispatch Modal** — Trigger dispatch from PI view.
- Pull-to-Refresh.

---

### 9.4 GDN (Goods Delivery Note)
**Route:** `/gdn`  
**File:** `src/app/gdn/gdn.page.ts`

Standalone view for all Goods Delivery Notes.

**Functionality:**
- **GDN List** — All GDNs with: GDN Number, Order Number, Distributor, Dispatch Date, Vehicle, Status.
- **Search** — Filter by GDN number, order number, distributor.
- **Expand Card** — View full GDN item details (product, quantity, batch).
- **Download PDF** — Download GDN document as PDF via `DownloadService`.
- **View PDF Inline** — PDF iframe preview modal.
- **Total Count** badge at the top.
- Pull-to-Refresh.

---

## 10. Distributor Module

### 10.1 Distributor Management
**Route:** `/distributor`  
**File:** `src/app/distributor/distributor.page.ts`

Admin-side management of all distributor accounts.

**Functionality:**
- **Distributor List** — All distributors with: Name, Code, Contact, Email, City, State, Credit Limit status.
- **Search** — Filter by name, city, or state.
- **State/District/Pincode Selector** — Full India location data embedded (all states, districts, pincodes) for address selection during add/edit.
- **Add Distributor Modal** — Complete registration form:
  - Business Name, Distributor Code, Contact Person, Phone, Alternate Phone, Email.
  - Address: State (dropdown), District (dynamic based on state), Pincode (auto-filled).
  - GSTIN Number.
  - Credit Limit toggle + Credit Amount + BG Number + BG Expiry Date.
  - Assigned Salesperson (dropdown from sales hierarchy).
  - Login credentials: Username, Password.
- **Edit Modal** — Update distributor details.
- **Delete Modal** — Confirm before deleting with optional remarks.
- **View Stock Modal** — View current product-wise stock for a distributor.
- **Password Reset** — Reset distributor's login password.
- Integrates `DistributorService`, `SalesHierarchyService`.

---

### 10.2 Distributor Cart / Mobile Ordering
**Route:** `/distributor-cart`  
**File:** `src/app/distributor-cart/distributor-cart.page.ts`

Mobile-first order placement interface for Distributor users.

**Functionality:**
- **Product Catalog** — Grid view of all available products with name, SKU, price, available quantity.
- **Search** — Real-time product search.
- **Product Detail Modal** — Full product info with quantity selector (integer spinner) and Add to Cart button.
- **Cart Management:**
  - Add/remove/update items.
  - Cart badge showing item count.
  - Cart total (₹) and total weight (kg) calculation.
  - Cart Modal — Full cart review with item list, quantities, prices, subtotals.
- **Checkout Modal:**
  - Delivery Method selector: Company Delivery or Distributor Self-Pickup.
  - Delivery address pre-filled from distributor profile.
  - Order summary with all items and total.
  - Place Order button — calls `CartService.placeOrder()`.
- **Order Eligibility Check:**
  - Automatically checks if the distributor has sufficient credit/balance to place an order.
  - Shows eligibility message if ineligible (blocks checkout).
  - Auto-refreshes eligibility on a periodic interval.
- **Distributor Profile Modal** — View distributor's own profile: address, credit limit, BG info, assigned salesperson.
- Integrates `CartService`, `DistributorProfileService`, `DistributorService`.

---

### 10.3 Sales Distributor
**Route:** `/sales-distributor`  
**File:** `src/app/sales-distributor/sales-distributor.page.ts`

A placeholder/stub page for Sales-Distributor hybrid operations. Currently minimal implementation — scaffolded for future use.

---

## 11. HR Department Module

**Route:** `/hr-department`  
**File:** `src/app/hr-department/hr-department.page.ts`

Full employee lifecycle management for the HR department.

**Functionality:**
- **Employee List** — All employees/users with: Name, Position, Department, Email, Phone, Status badge.
- **Search** — Filter by name, username, email, role, employee roll number.
- **Status Filter** — All | Active | Pending | Rejected.
- **Pagination** — 6 employees per page with navigation.
- **Period Selector** — Week / Month / Year (for HR stats/reporting context).
- **Add Employee Modal** — Comprehensive form:
  - First Name, Last Name, Username, Employee Roll No.
  - Email, Contact (10-digit), Alternate Contact.
  - City, ZIP (6-digit), Country, Complete Address.
  - Gender, Blood Group, Date of Birth.
  - Role Type (20 available roles from Admin to Plant Executive).
  - Password.
- **Edit Employee Modal** — Full update form with additional Status field (Active/Pending/Rejected/Inactive) and optional password change.
- **View Employee Modal** — Read-only profile card showing all employee details.
- **Delete Modal** — Confirm employee deletion.
- **Reject Modal** — Reject a Pending employee with remarks.
- All 20 role types supported.
- Calls `UserService` for CRUD and `Auth.createUser()` for new registrations.

---

## 12. Logistics Module

**Route:** `/logistics`  
**File:** `src/app/logistics/logistics.page.ts`

Tracks shipments and logistics for dispatched orders.

**Functionality:**
- **Shipment List** — All shipments with: Shipment Number, Order Number, Distributor, Origin → Destination, Expected/Actual Delivery, Status.
- **Status Filter:** In-Transit | Delivered | Pending | Delayed | Returned.
- **Transport Mode Filter:** Road | Rail | Air | Sea (with corresponding icons: car, train, airplane, boat).
- **Search** — By shipment number, order number, or distributor.
- **Shipment Card (Expandable):**
  - Total Weight, Total Packages, GDN Number.
  - Vehicle Number, Driver Name, Driver Phone.
  - **Tracking Timeline** — Step-by-step shipment progress (Picked Up → In Transit → Out for Delivery → Delivered), each with date, location, remarks.
  - **Logistics Contact** card: Name, Role, Phone, Email.
- **Stats Summary:** Total, In-Transit, Delivered, Delayed counts.
- Currently uses local/mock data with structure ready for API integration.

---

## 13. Complaints & Feedback Module

### 13.1 Complaints Submission
**Route:** `/complaints`  
**File:** `src/app/complaints/complaints.page.ts`

End-user complaint submission form.

**Functionality:**
- **Reactive Form** with fields:
  - Full Name, Email Address, Phone Number (10 digits).
  - Category: PAYMENT | ACCOUNT | TECHNICAL | DELIVERY | OTHER.
  - Subject (min 5 chars).
  - Priority Level: LOW | MEDIUM | HIGH | CRITICAL.
  - Description (min 20 chars).
- Form validation with inline error messages.
- **Submit** — Calls `ComplaintsService.createComplaint()` API.
- **Success Toast + Reset** — Shows success message for 5 seconds and resets form.
- **Detailed Error Handling** — Different messages for network error (status 0), 401/403 (auth), 400 (validation), 500+ (server error).

---

### 13.2 Complaints Management (Admin)
**Route:** `/complaints-management`  
**File:** `src/app/complaints-management/complaints-management.page.ts`

Admin-side complaints dashboard for reviewing and resolving submitted complaints.

**Functionality:**
- **Complaints List** — Paginated (10 per page), server-side paging.
- **Search** — By subject or full name.
- **Filter by Status** — OPEN | IN_PROGRESS | RESOLVED | CLOSED.
- **Filter by Category** — PAYMENT | ACCOUNT | TECHNICAL | DELIVERY | OTHER.
- **Status Badges** with color coding:
  - OPEN: Red | IN_PROGRESS: Amber | RESOLVED: Green | CLOSED: Indigo.
- **Priority Badges:**
  - LOW: Blue | MEDIUM: Amber | HIGH: Red | CRITICAL: Purple.
- **Detail Modal** — Full complaint details: contact info, description, category, priority, submission date.
- **Update Status Modal** — Change complaint status with dropdown selector.
- **Pagination** — First/Previous/Next/Last page navigation.
- Pull-to-Refresh.

---

### 13.3 Feedback
**Route:** `/feedback`  
**File:** `src/app/feedback/feedback.page.ts`

General feedback submission form (separate from formal complaints).

**Functionality:**
- Form fields: Type (complaint/suggestion/general), Name, Email, Phone, Category, Subject, Priority, Description.
- Simulated submission (1-second timeout mock) with success toast.
- Back navigation button.
- Note: This page is a lighter version of the complaints form — may be used for non-critical feedback.

---

## 14. User Rights Module

**Route:** `/user-right`  
**File:** `src/app/user-right/user-right.page.ts`

Access Control List (ACL) management — assign feature-level permissions to individual users.

**Functionality:**
- **Two-Panel Layout:**
  - **Left Panel — User List:**
    - All users with name, role, status.
    - Search by name or username.
    - Filter by Role (all 20 role types).
    - Filter by Status (All/Active/Inactive/Pending).
    - Select a user to load their permissions.
  - **Right Panel — Permission Editor:**
    - Loads current permissions for selected user.
    - Permissions grouped into **Categories** (e.g., Inventory, Sales, Accounts, HR, Dispatch, etc.).
    - Each permission shows: Feature Display Name, Icon, current Access Level.
    - **Access Level Toggle per feature:** NONE | READ | EDIT.
    - **Unsaved Changes Indicator** — Tracks dirty state by comparing current vs original permissions.
    - **Save Button** — Persists changes via `UserRightsService.savePermissions()`.
- **Feature ID Mapping** — Fetches `/features` endpoint to get feature ID ↔ key mapping for API calls.
- **Alert on Unsaved Changes** — Warns user before navigating away if there are unsaved changes.
- **Toggle User Panel** — Collapse/expand user list panel for more room on mobile.
- Uses `forkJoin` to load users and features in parallel on init.

---

## 15. Guards & ACL System

### AuthGuard
**File:** `src/app/guards/auth.guard.ts`

- Implements `CanActivate`.
- Checks `auth.isLoggedIn()` (verifies `auth_token` presence in `localStorage`).
- Redirects to `/login` if unauthenticated.
- Applied to all protected routes.

### AclGuard
**File:** `src/app/guards/acl.guard.ts`

- Feature-level route guard.
- Checks if the logged-in user has the required `feature` permission (from route `data.feature`).
- Used on `/dispatch` — requires `DISPATCH` feature.
- Redirects to `/dashboard` (or shows unauthorized) if permission denied.

### ACL Directive (`*appAcl`)
**File:** `src/app/acl/acl.directive.ts`

- Structural directive used in sidebar/templates to conditionally show/hide menu items.
- Config options:
  - `appAcl="FEATURE_KEY"` — show if user has that feature.
  - `[appAcl]="{ anyFeature: true }"` — show if user has any feature.
  - `[appAcl]="{ features: ['A','B'] }"` — show if user has all listed features.
  - `[appAcl]="{ roles: ['ADMIN','HR_MGR'] }"` — show if user has any of those roles.

---

## 16. Services Overview

| Service | Purpose |
|---|---|
| `Auth` | Login, logout, signup, password reset, token/role/user storage in localStorage |
| `DashboardService` | Fetches admin dashboard KPIs, revenue trends, region data |
| `InventoryService` | CRUD for master inventory items, BOM management |
| `UnitService` | CRUD for unit-of-measure definitions |
| `OutwardInventoryService` | Records outward inventory (spare parts, promotional, scrap) |
| `SalesService` | Pending orders, approve/reject orders, order tracking |
| `SalesHierarchyService` | Sales personnel tree, hierarchy roles, manager lookups |
| `ProformaInvoiceService` | PI list, download, status updates |
| `GdnService` | GDN list, generation, download |
| `DispatchService` | Dispatch orders, GDN generation payload |
| `DistributorService` | Distributor CRUD, stock lookup, order carts |
| `CartService` | Distributor cart — products, add/remove items, place order |
| `DistributorProfileService` | Global distributor profile state (BehaviorSubject) |
| `LedgerService` / `AccountsLedger` | Ledger accounts, transactions, balance |
| `AccountsService` | Payment request approve/reject |
| `UserService` | User CRUD, profile updates |
| `UserRightsService` | Feature permissions load & save per user |
| `ComplaintsService` | Create complaint, list complaints (paginated), update status |
| `DownloadService` | File/PDF download helper (blob handling) |
| `Toast` | Wrapper for Ionic ToastController with color presets |
| `HapticService` | Capacitor Haptics — light/medium/heavy feedback for mobile |
| `Acl` | In-memory ACL check service — parses features from localStorage |

---

## 17. Role Types & Access Matrix

| Role | Web Access | Mobile Access | Key Screens |
|---|---|---|---|
| `SUPER_ADMIN` | Full | Full | Everything |
| `ADMIN` | Full | — | Dashboard, all modules |
| `BUSINESS_DEV_MGR` | Full | — | Sales, Distributor, Accounts |
| `PLANT_MGR` | Full | — | Inventory, Dispatch |
| `HR_MGR` | Full | — | HR Department |
| `LOGISTICS_MGR` | Full | — | Logistics, Dispatch, GDN |
| `ACCOUNT_MGR` | Full | — | Accounts Master, Payment Requests |
| `ACCOUNT_OFFICER` | Partial | — | Accounts Master, Payment Requests |
| `ACCOUNT_EXECUTIVE` | Partial | — | Accounts Master |
| `NATIONAL_SALES_MGR` | Full | — | Sales, Hierarchy Orders, Dashboard |
| `STATE_SALES_MGR` | Full | — | Sales, Hierarchy Orders |
| `ZONAL_SALES_MGR` | Partial | — | Sales, Hierarchy Orders (zone-filtered) |
| `REGIONAL_SALES_MGR` | Partial | — | Sales, Hierarchy Orders (region-filtered) |
| `AREA_SALES_MGR` | Partial | — | Sales, Hierarchy Orders (area-filtered) |
| `SALES_OFFICER` | — | Full | Sales Dashboard, My Payments, Distributor Cart (via distributor) |
| `SALES_EXECUTIVE` | — | Full | Sales Dashboard, My Payments |
| `DISTRIBUTOR` | — (mobile only) | Full | Distributor Cart, Order Tracking, Distributor Dashboard |
| `LOGISTICS_OFFICER` | Partial | — | Logistics, Dispatch |
| `HR_EXECUTIVE` | Partial | — | HR Department |
| `PLANT_OFFICER` / `PLANT_EXECUTIVE` | Partial | — | Machine Inventory, Inward/Outward |

---

## 18. Summary Table of All Routes

| Route | Page Name | Guard | Role |
|---|---|---|---|
| `/login` | Login Page | None (Public) | All |
| `/signup` | Signup Page | None (Public) | All |
| `/forgot-password` | Forgot Password | None (Public) | All |
| `/dashboard` | Admin / Distributor Dashboard | AuthGuard | All authenticated |
| `/master-inventory` | Master Inventory | AuthGuard | Inventory roles |
| `/unit-master` | Unit Master | AuthGuard | Inventory roles |
| `/inward` | Inward Inventory | AuthGuard | Plant/Inventory roles |
| `/outward-inventory` | Outward Inventory | AuthGuard | Plant/Inventory roles |
| `/machine-inventory` | Machine Parts | AuthGuard | Plant roles |
| `/accounts-master` | Accounts Ledger | AuthGuard | Accounts roles |
| `/payment-request` | Payment Requests | AuthGuard | Accounts roles |
| `/pi-update` | PI Update | AuthGuard | Accounts/Sales roles |
| `/hr-department` | HR Department | AuthGuard | HR roles |
| `/distributor` | Distributor Management | AuthGuard | Admin/BDM roles |
| `/distributor-cart` | Distributor Cart (Mobile) | AuthGuard | DISTRIBUTOR role |
| `/sales-distributor` | Sales Distributor | AuthGuard | Sales roles |
| `/order-details` | Order Tracking | AuthGuard | All authenticated |
| `/proforma-invoice` | Proforma Invoice | AuthGuard | Sales/Accounts roles |
| `/gdn` | GDN Viewer | AuthGuard | Sales/Logistics roles |
| `/sales` | Sales Management | AuthGuard | Sales hierarchy |
| `/sales/sales-dashboard` | Sales Dashboard | AuthGuard | Sales Officers |
| `/sales/salesperson-onboarding` | Reporting Manager | AuthGuard | Sales Managers |
| `/sales/hierarchy-orders` | Hierarchy Orders | AuthGuard | Sales Managers |
| `/sales/my-payments` | My Payments | AuthGuard | Sales Officers |
| `/logistics` | Logistics Tracking | AuthGuard | Logistics roles |
| `/dispatch` | Dispatch & GDN | **AclGuard (DISPATCH)** | Logistics/Dispatch roles |
| `/complaints` | Submit Complaint | AuthGuard | All authenticated |
| `/complaints-management` | Manage Complaints | AuthGuard | Admin/HR roles |
| `/feedback` | Feedback Form | AuthGuard | All authenticated |
| `/user-right` | User Rights / ACL | AuthGuard | Admin only |
| `/not-found` | 404 Not Found | None | All |

---

*Report generated for NAYLA — Nectar Inventory Management System (Angular 17 + Ionic + Capacitor).*
