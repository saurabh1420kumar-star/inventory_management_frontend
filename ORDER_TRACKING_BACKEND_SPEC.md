# Order Tracking – Backend API Specification

> **Document Purpose**: This spec defines every backend API endpoint required to power the Order Tracking page (`/order-details`). The frontend is a fully built Angular/Ionic component that currently renders hardcoded sample data. All APIs listed here replace that sample data with live, real-time order milestone tracking.

---

## 1. Context: The Tracking Page

The **Order Details / Order Tracking** page (`src/app/order-details/order-details.page.ts`) renders a timeline of 11 milestones for every distributor order. It is a **read view** available to internal users (Admin, Sales, Accounts, Dispatch) to monitor the live status of all orders.

### What the Page Shows Per Order

| Field | Source |
|---|---|
| Order Number | `ORD-{id}` formatted ID |
| Distributor Name | From order data |
| Order Date | `createdAt` |
| Total Amount | `totalCartAmount` |
| Progress % | `(completedSteps / 11) * 100` |
| 11-step timeline | Status + date + remarks + assigned person per step |

### The 11-Step Order Lifecycle (Fixed Sequence)

Every order goes through the same 11 milestones in this exact order:

| Step # | Label | Triggered By |
|---|---|---|
| 1 | Order Placed | Distributor submits cart |
| 2 | Pending Approval from Sales | Auto after Step 1 |
| 3 | Approved from Sales | Sales team approves order |
| 4 | Proforma Invoice Generated | Auto by backend after sales approval |
| 5 | Awaiting Payment Confirmation from Accounts | Auto after Step 4 |
| 6 | Approved from Accounts | Accounts team approves PI payment |
| 7 | Awaiting Confirmation from Logistics | Auto after Step 6 |
| 8 | Approved from Logistics | Logistics confirms dispatch readiness |
| 9 | GDN Generated | Dispatch team generates GDN |
| 10 | Order is On the Way | Dispatch marks order as dispatched |
| 11 | Order Received | Distributor confirms delivery |

### Step Status Values (Frontend Enum)

```typescript
type StepStatus = 'completed' | 'in-progress' | 'pending' | 'cancelled';
```

| Status | Meaning |
|---|---|
| `completed` | This milestone has been achieved |
| `in-progress` | Currently awaiting action at this step |
| `pending` | Not yet reached |
| `cancelled` | Order was rejected/cancelled before or at this step |

---

## 2. Existing Backend Status Values (Already Live)

These statuses currently exist in the backend. The new APIs must be **consistent** with these exact string values:

| Backend Status | Meaning | Source Endpoint |
|---|---|---|
| `PLACED` | Order submitted by distributor | `POST /api/cart/placeOrder` |
| `APPROVED` | Approved by sales | `PUT /api/order/approve/{cartId}` |
| `PAYMENT_APPROVED` | Payment confirmed by accounts | `POST /api/accounts/approve-payment/{orderId}` |
| `DISMISSED` | Order rejected at any stage | `DELETE /api/cart/{cartId}/dismiss` |

### GDN / Dispatch fields on the order object (already available):

| Field | Type | Description |
|---|---|---|
| `gdnNumber` | `string \| null` | Set when GDN is generated via `POST /api/dispatch/gdn/generate/{orderId}` |
| `gdnDate` | `string \| null` | ISO date when GDN was created |
| `dispatchDate` | `string \| null` | ISO date when `PUT /api/dispatch/{orderId}/dispatch` was called |

---

## 3. Required New Backend APIs

### Base URL

```
https://api.imsnectarorigin.com/api
```

### Authentication

All endpoints require:
```
Authorization: Bearer {JWT_TOKEN}
```

---

### API 1: Get All Orders with Full Tracking Timeline

**This is the primary endpoint** the order-details page calls on load.

```
GET /api/order/tracking
```

#### Query Parameters

| Param | Type | Required | Description |
|---|---|---|---|
| `distributorId` | `number` | No | If provided, returns only orders for this distributor. Used for distributor-role users to see only their own orders. |

#### Response Body

```json
[
  {
    "id": 101,
    "orderNumber": "ORD-101",
    "distributorId": 45,
    "distributorName": "Sharma Medicals",
    "salespersonId": 12,
    "salespersonName": "Rahul Sharma",
    "salespersonContact": "+91 98765 43210",
    "salespersonEmail": "rahul.sharma@nectar.com",
    "orderDate": "2026-02-15",
    "totalAmount": 45000.00,
    "currentStatus": "PAYMENT_APPROVED",
    "progressPercentage": 55,
    "completedSteps": 6,
    "totalSteps": 11,
    "piNumber": "PI-2026-101",
    "piId": 7,
    "gdnNumber": null,
    "gdnId": null,
    "gdnDate": null,
    "dispatchDate": null,
    "deliveryConfirmedDate": null,
    "deliveryConfirmedBy": null,
    "steps": [
      {
        "stepIndex": 1,
        "label": "Order Placed",
        "status": "completed",
        "date": "2026-02-15",
        "remarks": "Order submitted by distributor",
        "assignedPerson": null,
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 2,
        "label": "Pending Approval from Sales",
        "status": "completed",
        "date": "2026-02-15",
        "remarks": "Sent to sales team for review",
        "assignedPerson": {
          "name": "Rahul Sharma",
          "role": "Zonal Sales Manager",
          "contact": "+91 98765 43210",
          "email": "rahul.sharma@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 3,
        "label": "Approved from Sales",
        "status": "completed",
        "date": "2026-02-17",
        "remarks": "Approved by Zonal Sales Manager",
        "assignedPerson": {
          "name": "Rahul Sharma",
          "role": "Zonal Sales Manager",
          "contact": "+91 98765 43210",
          "email": "rahul.sharma@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 4,
        "label": "Proforma Invoice Generated",
        "status": "completed",
        "date": "2026-02-17",
        "remarks": "PI #PI-2026-101 generated",
        "assignedPerson": {
          "name": "Priya Patel",
          "role": "Accounts Executive",
          "contact": "+91 87654 32109",
          "email": "priya.patel@nectar.com"
        },
        "hasDownload": true,
        "downloadType": "PI"
      },
      {
        "stepIndex": 5,
        "label": "Awaiting Payment Confirmation from Accounts",
        "status": "completed",
        "date": "2026-02-18",
        "remarks": "Distributor balance verified",
        "assignedPerson": {
          "name": "Amit Verma",
          "role": "Accounts Manager",
          "contact": "+91 76543 21098",
          "email": "amit.verma@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 6,
        "label": "Approved from Accounts",
        "status": "completed",
        "date": "2026-02-18",
        "remarks": "Payment confirmed and approved",
        "assignedPerson": {
          "name": "Amit Verma",
          "role": "Accounts Manager",
          "contact": "+91 76543 21098",
          "email": "amit.verma@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 7,
        "label": "Awaiting Confirmation from Logistics",
        "status": "in-progress",
        "date": null,
        "remarks": null,
        "assignedPerson": {
          "name": "Suresh Kumar",
          "role": "Logistics Head",
          "contact": "+91 65432 10987",
          "email": "suresh.kumar@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 8,
        "label": "Approved from Logistics",
        "status": "pending",
        "date": null,
        "remarks": null,
        "assignedPerson": {
          "name": "Suresh Kumar",
          "role": "Logistics Head",
          "contact": "+91 65432 10987",
          "email": "suresh.kumar@nectar.com"
        },
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 9,
        "label": "GDN Generated",
        "status": "pending",
        "date": null,
        "remarks": null,
        "assignedPerson": {
          "name": "Rajesh Gupta",
          "role": "Warehouse Manager",
          "contact": "+91 54321 09876",
          "email": "rajesh.gupta@nectar.com"
        },
        "hasDownload": true,
        "downloadType": "GDN"
      },
      {
        "stepIndex": 10,
        "label": "Order is On the Way",
        "status": "pending",
        "date": null,
        "remarks": null,
        "assignedPerson": null,
        "hasDownload": false,
        "downloadType": null
      },
      {
        "stepIndex": 11,
        "label": "Order Received",
        "status": "pending",
        "date": null,
        "remarks": null,
        "assignedPerson": null,
        "hasDownload": false,
        "downloadType": null
      }
    ]
  }
]
```

#### HTTP Status Codes

| Code | Scenario |
|---|---|
| `200 OK` | Success |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Role not permitted to view tracking |
| `500 Internal Server Error` | Backend error |

---

### API 2: Get Single Order Tracking by Order ID

```
GET /api/order/{orderId}/tracking
```

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `orderId` | `number` | The order/cart ID |

#### Response Body

Same structure as a **single object** from the array in API 1 (the full order object with `steps[]` array).

#### HTTP Status Codes

| Code | Scenario |
|---|---|
| `200 OK` | Success |
| `404 Not Found` | No order with this ID |
| `401 Unauthorized` | Missing or invalid JWT |

---

### API 3: Confirm Order Delivery (Distributor Action – Step 11)

This is the **only write endpoint** needed from the order tracking perspective. The distributor clicks "YES, I received this order" on Step 11.

```
POST /api/order/{orderId}/confirm-delivery
```

#### Path Parameters

| Param | Type | Description |
|---|---|---|
| `orderId` | `number` | The order/cart ID |

#### Request Body

```json
{
  "confirmed": true,
  "remarks": "All items received in good condition"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `confirmed` | `boolean` | Yes | `true` = received, `false` = not received / issue |
| `remarks` | `string` | No | Optional notes from distributor |

#### Response Body (Success `confirmed: true`)

```json
{
  "success": true,
  "message": "Order marked as received successfully",
  "orderId": 101,
  "deliveryConfirmedDate": "2026-03-16",
  "stepStatus": "completed"
}
```

#### Response Body (Issue reported `confirmed: false`)

```json
{
  "success": true,
  "message": "Delivery issue reported. Logistics team will be notified.",
  "orderId": 101,
  "deliveryConfirmedDate": "2026-03-16",
  "stepStatus": "cancelled"
}
```

#### HTTP Status Codes

| Code | Scenario |
|---|---|
| `200 OK` | Delivery confirmation recorded |
| `400 Bad Request` | Order not in dispatched state yet |
| `404 Not Found` | Order not found |
| `401 Unauthorized` | Invalid JWT |

---

## 4. Backend Rule: How to Derive Step Statuses

The backend must compute the `status` for each of the 11 steps based on the order's current state. Here is the **complete mapping logic**:

### Mapping Table: Current Order State → Steps Statuses

| Current Order State | Step 1 | Step 2 | Step 3 | Step 4 | Step 5 | Step 6 | Step 7 | Step 8 | Step 9 | Step 10 | Step 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `PLACED` | ✅ completed | 🔵 in-progress | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending | ⬜ pending |
| `APPROVED` (no PI yet) | ✅ | ✅ | ✅ | 🔵 in-progress | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `APPROVED` + PI record exists | ✅ | ✅ | ✅ | ✅ | 🔵 in-progress | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| `PAYMENT_APPROVED` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔵 in-progress | ⬜ | ⬜ | ⬜ | ⬜ |
| `PAYMENT_APPROVED` + `gdnNumber` set | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔵 in-progress | ⬜ |
| `PAYMENT_APPROVED` + `dispatchDate` set | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔵 in-progress |
| `DELIVERED` / delivery confirmed | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ completed |
| `DISMISSED` at any step | ✅ through dismissal step, then ❌ cancelled for all remaining |

> **Note on Logistics Steps 7 & 8**: There is currently no separate logistics approval API in the system. These steps should be **auto-completed simultaneously with GDN generation** since generating a GDN implies logistics has confirmed the dispatch. If a dedicated logistics approval endpoint is added in the future, these steps can be split.

### Dismissal Logic

When `status = DISMISSED`, the backend must track **at which step the dismissal happened** so the cancelled cascade starts from the right step:

- If dismissed after `PLACED` → Steps 1–2 completed, Step 3 = cancelled, Steps 4–11 = cancelled
- If dismissed after `APPROVED` → Steps 1–3 completed, Step 4 = cancelled, Steps 5–11 = cancelled

The field `dismissedAtStep` (integer 3–11) should be persisted in the database.

---

## 5. Backend Rule: Assigned Person Data

Each step must return the person responsible for that action. Here is which person type is assigned to each step:

| Step # | Label | Person Type | Data Source |
|---|---|---|---|
| 1 | Order Placed | No person needed | — |
| 2 | Pending Approval from Sales | Salesperson assigned to distributor | `order.salespersonId` → fetch from `users` or `sales-mapping` table |
| 3 | Approved from Sales | Same salesperson | `order.salespersonId` |
| 4 | Proforma Invoice Generated | Accounts Executive who generated PI | `proforma_invoices.createdBy` |
| 5 | Awaiting Payment | Accounts Manager | From `accounts` role users or fixed company config |
| 6 | Approved from Accounts | Accounts Manager who approved | `accounts.approve-PI` action actor |
| 7 | Awaiting Confirmation from Logistics | Logistics Head | From `logistics` role users or fixed config |
| 8 | Approved from Logistics | Logistics Head | Same as 7 |
| 9 | GDN Generated | Warehouse Manager who issued GDN | `gdn.createdBy` |
| 10 | Order is On the Way | No specific person | — |
| 11 | Order Received | No specific person (distributor action) | — |

### AssignedPerson Object Schema

```json
{
  "name": "Rahul Sharma",
  "role": "Zonal Sales Manager",
  "contact": "+91 98765 43210",
  "email": "rahul.sharma@nectar.com"
}
```

> If a person is not determinable (e.g., step not yet reached), return `null` for `assignedPerson`.

---

## 6. Download Documents: PI and GDN

Steps 4 (PI) and 9 (GDN) show a **Download button** in the UI. The frontend already has these download endpoints. The tracking response just needs to include `hasDownload: true` and `downloadType: "PI"` or `"GDN"` so the frontend knows to show the button. The actual download is handled by:

| Document | Download Endpoint | Service |
|---|---|---|
| Proforma Invoice | `GET /api/order/proforma-invoice/{piId}/download` | `ProformaInvoiceService` |
| GDN | `GET /api/dispatch/gdn/{gdnId}/download` | `GdnService` |

The tracking response should include `piId` and `gdnId` at the **order level** (not step level) so the frontend can pass the right ID to the download endpoint.

---

## 7. Complete Final Response Schema (TypeScript Interface for Reference)

```typescript
// This is what GET /api/order/tracking returns (array of these)
interface OrderTrackingResponse {
  id: number;
  orderNumber: string;            // e.g. "ORD-101"
  distributorId: number;
  distributorName: string;
  salespersonId: number | null;
  salespersonName: string | null;
  salespersonContact: string | null;
  salespersonEmail: string | null;
  orderDate: string;              // ISO date string "YYYY-MM-DD"
  totalAmount: number;
  currentStatus: 'PLACED' | 'APPROVED' | 'PAYMENT_APPROVED' | 'DISMISSED' | 'DELIVERED';
  progressPercentage: number;     // 0–100
  completedSteps: number;         // count of steps with status = 'completed'
  totalSteps: number;             // always 11
  piNumber: string | null;        // e.g. "PI-2026-101"
  piId: number | null;            // for download endpoint
  gdnNumber: string | null;       // e.g. "GDN-2026-101"
  gdnId: number | null;           // for download endpoint
  gdnDate: string | null;         // ISO date
  dispatchDate: string | null;    // ISO date
  deliveryConfirmedDate: string | null;
  deliveryConfirmedBy: string | null;  // distributorName or distributorId
  steps: OrderTrackingStep[];
}

interface OrderTrackingStep {
  stepIndex: number;              // 1–11
  label: string;                  // exact string from the 11 labels above
  status: 'completed' | 'in-progress' | 'pending' | 'cancelled';
  date: string | null;            // ISO date when this step was reached, null if not yet
  remarks: string | null;         // Human-readable note about this step
  assignedPerson: AssignedPerson | null;
  hasDownload: boolean;           // true for steps 4 (PI) and 9 (GDN) when document exists
  downloadType: 'PI' | 'GDN' | null;
}

interface AssignedPerson {
  name: string;
  role: string;
  contact: string;    // phone number
  email: string;
}

// Request body for API 3
interface DeliveryConfirmationRequest {
  confirmed: boolean;
  remarks?: string;
}

// Response for API 3
interface DeliveryConfirmationResponse {
  success: boolean;
  message: string;
  orderId: number;
  deliveryConfirmedDate: string;
  stepStatus: 'completed' | 'cancelled';
}
```

---

## 8. Existing APIs That Must Automatically Update Tracking State

These endpoints are **already built** and used by other pages. When they are called, the backend must persist the timestamp and actor so the tracking API (`GET /api/order/tracking`) can reflect the updated step status.

| Existing Endpoint | Step It Completes | What Backend Must Persist |
|---|---|---|
| `POST /api/cart/placeOrder` | Step 1 (Order Placed) | `placedAt` timestamp, `distributorId` |
| `PUT /api/order/approve/{cartId}` | Step 3 (Approved from Sales) | `salesApprovedAt` timestamp, `approvedBy` (salespersonId) |
| Auto after sales approval | Step 4 (PI Generated) | `piGeneratedAt` timestamp when PI is auto-created |
| `POST /api/accounts/approve-PI/{accountId}` | Step 5 + 6 | `paymentApprovedAt` timestamp, `approvedBy` (accountsUserId) |
| `POST /api/accounts/approve-payment/{orderId}` | Step 6 | `paymentApprovedAt` |
| `POST /api/dispatch/gdn/generate/{orderId}` | Steps 7, 8, 9 | `gdnGeneratedAt`, `gdnNumber`, `issuedBy` (warehouseUserId) |
| `PUT /api/dispatch/{orderId}/dispatch` | Step 10 | `dispatchedAt` timestamp |
| `POST /api/order/{orderId}/confirm-delivery` *(new)* | Step 11 | `deliveryConfirmedAt`, `confirmedBy` (distributorId) |
| `DELETE /api/cart/{cartId}/dismiss` | Cancels from step 3 onward | `dismissedAt`, `dismissedAtStep` |

---

## 9. Database: Suggested New Columns (or Tracking Events Table)

### Option A: Add timestamp columns to the existing `orders` / `cart` table

```sql
ALTER TABLE orders ADD COLUMN placed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN sales_approved_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN sales_approved_by INT;          -- FK to users.id
ALTER TABLE orders ADD COLUMN pi_generated_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN pi_id INT;                      -- FK to proforma_invoices.id
ALTER TABLE orders ADD COLUMN payment_awaited_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN payment_approved_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN payment_approved_by INT;        -- FK to users.id
ALTER TABLE orders ADD COLUMN logistics_approved_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN gdn_generated_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN gdn_id INT;                     -- FK to gdns.id
ALTER TABLE orders ADD COLUMN dispatched_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN delivery_confirmed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN delivery_confirmed_by INT;      -- FK to distributors.id
ALTER TABLE orders ADD COLUMN dismissed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN dismissed_at_step INT;          -- 3–11, which step it was cancelled at
ALTER TABLE orders ADD COLUMN dismissed_reason VARCHAR(500);
```

### Option B: Create a separate `order_tracking_events` table (recommended for audit trail)

```sql
CREATE TABLE order_tracking_events (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id      BIGINT NOT NULL,             -- FK to orders.id
  step_index    INT NOT NULL,                -- 1–11
  step_label    VARCHAR(100) NOT NULL,
  status        ENUM('completed', 'in-progress', 'pending', 'cancelled') NOT NULL,
  event_date    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remarks       TEXT,
  actor_id      INT,                         -- FK to users.id (who made this happen)
  actor_name    VARCHAR(100),
  actor_role    VARCHAR(100),
  actor_contact VARCHAR(20),
  actor_email   VARCHAR(100),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX idx_order_tracking_order_id ON order_tracking_events(order_id);
```

> **Recommendation**: Option B (events table) is preferred because it gives a full audit history, supports future features like admin step override, and makes the tracking API a simple query: `SELECT * FROM order_tracking_events WHERE order_id = ? ORDER BY step_index`.

---

## 10. Summary: New Endpoints Checklist

| # | Endpoint | Method | Priority | Needed For |
|---|---|---|---|---|
| 1 | `/api/order/tracking` | GET | 🔴 Critical | Order-details page initial load |
| 2 | `/api/order/{orderId}/tracking` | GET | 🔴 Critical | Refresh single order tracking |
| 3 | `/api/order/{orderId}/confirm-delivery` | POST | 🟡 High | Distributor confirms receipt (Step 11) |

### Existing Endpoints That Need Tracking Hooks Added (No New Endpoint — Just Persist Timestamps)

| Endpoint | Tracking Action to Add |
|---|---|
| `POST /api/cart/placeOrder` | Record Step 1 completion |
| `PUT /api/order/approve/{cartId}` | Record Step 3 completion + actor |
| `POST /api/accounts/approve-PI/{accountId}` | Record Steps 5 & 6 completion + actor |
| `POST /api/accounts/approve-payment/{orderId}` | Record Step 6 completion + actor |
| `POST /api/dispatch/gdn/generate/{orderId}` | Record Steps 7, 8, 9 completion |
| `PUT /api/dispatch/{orderId}/dispatch` | Record Step 10 completion |
| `DELETE /api/cart/{cartId}/dismiss` | Record cancel cascade from current step |

---

## 11. Role-Based Access Rules

| Role | Can Call | Notes |
|---|---|---|
| `ADMIN` | All 3 endpoints | Full access |
| `SALES` | GET tracking endpoints | Read-only view |
| `ACCOUNTS` | GET tracking endpoints | Read-only view |
| `DISPATCH` | GET tracking endpoints | Read-only view |
| `DISTRIBUTOR` | GET `/api/order/tracking?distributorId={their id}` + POST `/confirm-delivery` | Can only see own orders; can confirm delivery |
| `LOGISTICS` | GET tracking endpoints | Read-only view |

---

## 12. Example: Full Order Timeline Scenarios

### Scenario A — Active order at payment approval stage

```
Status: PAYMENT_APPROVED, no GDN yet
Steps 1–6: completed
Step 7: in-progress
Steps 8–11: pending
progressPercentage: 55
completedSteps: 6
```

### Scenario B — Dismissed after sales approval

```
Status: DISMISSED, dismissedAtStep: 3
Steps 1–2: completed
Step 3: cancelled (rejected)
Steps 4–11: cancelled
progressPercentage: 18
completedSteps: 2
```

### Scenario C — Fully delivered order

```
Status: DELIVERED
All 11 steps: completed
progressPercentage: 100
completedSteps: 11
```

### Scenario D — Newly placed order

```
Status: PLACED
Step 1: completed
Step 2: in-progress
Steps 3–11: pending
progressPercentage: 9
completedSteps: 1
```

---

*Document generated: 2026-03-16 | Frontend repo: `inventory_management_fronted-`*
