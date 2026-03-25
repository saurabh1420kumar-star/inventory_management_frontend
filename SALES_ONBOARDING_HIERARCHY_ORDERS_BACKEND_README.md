# Sales Onboarding & Hierarchy Orders Backend API

## Overview
This document specifies the backend API requirements for the **Sales Onboarding** and **Hierarchy Orders** pages. These features are part of an Ionic Angular inventory management frontend application built with Tailwind CSS and standalone components.

---

## 1. Business Context

### Sales Hierarchy Structure
The organization has a multi-level sales hierarchy in India, specifically for the Bihar region:

- **SSM (State Sales Manager)** - Regional head (1 person)
  - **RSM (Regional Sales Manager)** - Zone managers (multiple per SSM)
    - **ASM (Area Sales Manager)** - Area managers (multiple per RSM)
      - **SALES_EXECUTIVE** - Field sales representatives (multiple per ASM)

### Features
1. **Sales Onboarding Page**: Manage the team roster—view, search, add, edit, and delete salespersons
2. **Hierarchy Orders Page**: View sales orders grouped by hierarchy levels (Zone → RSM → ASM → Sales Executive) with filtering and summary stats

---

## 2. Data Models

### SalesPerson
```typescript
{
  id: number;                          // Unique identifier
  name: string;                        // Full name (min 2 chars)
  employeeCode: string;                // Unique code (e.g., 'SE-001', 'RSM-001')
  role: 'SSM' | 'RSM' | 'ASM' | 'SALES_EXECUTIVE';  // Hierarchical role
  zone?: string;                       // Zone assignment (e.g., 'S BIHAR', 'N BIHAR')
  region?: string;                     // Region (e.g., 'BIHAR')
  phone?: string;                      // Mobile number (format: 6-9 followed by 9 digits)
  email?: string;                      // Email address
  managerId?: number | null;           // ID of the direct manager (hierarchical link)
  createdAt?: string;                  // ISO timestamp
}
```

### OrderWithSalesPerson
```typescript
{
  orderId: number;                     // Unique order ID
  distributorName: string;             // Distributor name
  distributorId: number;               // Distributor ID (foreign key)
  amount: number;                      // Order amount in rupees
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  createdAt: string;                   // ISO date (e.g., '2024-03-15')
  salespersonId?: number;              // FK to SalesPerson
  salespersonName?: string;            // Denormalized name
  salespersonRole?: string;            // Denormalized role
  zone?: string;                       // Denormalized zone
}
```

### HierarchyRole (Config)
```typescript
{
  value: string;                       // Role code ('SSM', 'RSM', 'ASM', 'SALES_EXECUTIVE')
  label: string;                       // Full name (e.g., 'State Sales Manager')
  shortLabel: string;                  // Short code
  icon: string;                        // Ionic icon name
}

// Predefined roles
export const HIERARCHY_ROLES = [
  { value: 'SSM', label: 'State Sales Manager', shortLabel: 'SSM', icon: 'ribbon-outline' },
  { value: 'RSM', label: 'Regional Sales Manager', shortLabel: 'RSM', icon: 'map-outline' },
  { value: 'ASM', label: 'Area Sales Manager', shortLabel: 'ASM', icon: 'business-outline' },
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive', shortLabel: 'SE', icon: 'person-outline' }
];
```

---

## 3. Required APIs

### 3.1 Sales Persons Management

#### GET /api/sales-hierarchy
**Description**: Retrieve all salespersons in the hierarchy  
**Method**: GET  
**Auth**: Bearer token required  
**Response**:
```json
[
  {
    "id": 1,
    "name": "State Sale Manager",
    "employeeCode": "SSM-001",
    "role": "SSM",
    "region": "BIHAR",
    "zone": null,
    "managerId": null,
    "createdAt": "2024-03-01T10:00:00Z"
  },
  {
    "id": 2,
    "name": "RAM",
    "employeeCode": "RSM-001",
    "role": "RSM",
    "region": "BIHAR",
    "zone": "S BIHAR",
    "phone": "9876543210",
    "email": "ram@company.com",
    "managerId": 1,
    "createdAt": "2024-03-02T10:00:00Z"
  }
]
```
**Status Codes**: 
- 200: Success
- 401: Unauthorized
- 500: Server error

---

#### POST /api/sales-hierarchy
**Description**: Create a new salesperson  
**Method**: POST  
**Auth**: Bearer token required  
**Request Body**:
```json
{
  "name": "Amit Kumar",
  "employeeCode": "SE-001",
  "role": "SALES_EXECUTIVE",
  "region": "BIHAR",
  "zone": "S BIHAR",
  "phone": "9123456789",
  "email": "amit@company.com",
  "managerId": 4
}
```
**Validation Rules**:
- `name`: Required, min 2 characters
- `employeeCode`: Required, must be unique
- `role`: Required, must be one of: SSM, RSM, ASM, SALES_EXECUTIVE
- `phone`: Optional, must match pattern `^[6-9]\d{9}$` (10-digit Indian mobile)
- `email`: Optional, must be valid email format
- `managerId`: Optional, must reference an existing salesperson with valid role hierarchy
  - RSM must report to SSM
  - ASM must report to RSM
  - SALES_EXECUTIVE must report to ASM
  - SSM must have `managerId: null`

**Response**:
```json
{
  "id": 35,
  "name": "Amit Kumar",
  "employeeCode": "SE-001",
  "role": "SALES_EXECUTIVE",
  "region": "BIHAR",
  "zone": "S BIHAR",
  "phone": "9123456789",
  "email": "amit@company.com",
  "managerId": 4,
  "createdAt": "2024-03-21T10:00:00Z"
}
```
**Status Codes**:
- 201: Created
- 400: Validation error (include error message)
- 401: Unauthorized
- 409: Conflict (duplicate employee code)
- 500: Server error

---

#### PUT /api/sales-hierarchy/:id
**Description**: Update an existing salesperson  
**Method**: PUT  
**Auth**: Bearer token required  
**URL Params**: `id` (integer)  
**Request Body** (partial update):
```json
{
  "name": "Amit Kumar Updated",
  "phone": "9123456789",
  "email": "amit.new@company.com",
  "zone": "N BIHAR",
  "managerId": 5
}
```
**Validation**: Same as POST, plus check that role hierarchy is maintained when updating manager  
**Response**: Updated SalesPerson object (same structure as POST response)  
**Status Codes**:
- 200: Success
- 400: Validation error
- 401: Unauthorized
- 404: Not found
- 409: Conflict (hierarchy violation or duplicate code)
- 500: Server error

---

#### DELETE /api/sales-hierarchy/:id
**Description**: Delete a salesperson  
**Method**: DELETE  
**Auth**: Bearer token required  
**URL Params**: `id` (integer)  
**Business Rules**:
- Cannot delete if salesperson has direct reports (subordinates)
- SSM cannot be deleted if other salespersons exist
- Archive or soft-delete preferred over hard delete

**Response**:
- 204: No Content (success, no response body)
- 400: Cannot delete (has subordinates)
- 401: Unauthorized
- 404: Not found
- 500: Server error

---

### 3.2 Orders Management

#### GET /api/order
**Description**: Retrieve all orders with salesperson and distributor details  
**Method**: GET  
**Auth**: Bearer token required  
**Query Parameters** (optional):
- `status`: Filter by order status (pending|approved|completed|rejected)
- `zone`: Filter by zone (e.g., 'S BIHAR', 'N BIHAR')
- `salespersonId`: Filter by salesperson
- `dateFrom`: Start date (ISO format)
- `dateTo`: End date (ISO format)

**Response**:
```json
[
  {
    "orderId": 1001,
    "distributorId": 101,
    "distributorName": "Sharma & Co",
    "amount": 45000,
    "status": "completed",
    "createdAt": "2024-03-15",
    "salespersonId": 12,
    "salespersonName": "Amit",
    "salespersonRole": "SALES_EXECUTIVE",
    "zone": "S BIHAR"
  },
  {
    "orderId": 1002,
    "distributorId": 102,
    "distributorName": "Kumar Enterprises",
    "amount": 38500,
    "status": "approved",
    "createdAt": "2024-03-16",
    "salespersonId": 14,
    "salespersonName": "Rahul",
    "salespersonRole": "SALES_EXECUTIVE",
    "zone": "S BIHAR"
  }
]
```
**Status Codes**:
- 200: Success
- 401: Unauthorized
- 500: Server error

---

#### GET /api/order/summary
**Description**: Get order summary statistics (total count, total amount by zone/role)  
**Method**: GET  
**Auth**: Bearer token required  
**Query Parameters** (optional):
- `zone`: Filter by zone
- `roles`: Comma-separated roles (RSM,ASM,SALES_EXECUTIVE)
- `status`: Filter by status

**Response**:
```json
{
  "totalOrders": 16,
  "totalAmount": 786000,
  "byZone": {
    "S BIHAR": { "count": 8, "amount": 409700 },
    "N BIHAR": { "count": 8, "amount": 376300 }
  },
  "byStatus": {
    "pending": { "count": 4, "amount": 209300 },
    "approved": { "count": 4, "amount": 215200 },
    "completed": { "count": 8, "amount": 361500 }
  },
  "byRole": {
    "SALES_EXECUTIVE": { "count": 16, "amount": 786000 }
  }
}
```
**Status Codes**: 200, 401, 500

---

## 4. Business Logic Requirements

### Role Hierarchy Validation
1. **Valid Manager Assignment**:
   - SSM → no manager (managerId = null)
   - RSM → manager must be SSM
   - ASM → manager must be RSM
   - SALES_EXECUTIVE → manager must be ASM

2. **Cascading Deletion** (optional but recommended):
   - When an ASM is deleted, their SALES_EXECUTIVE reports should be reassigned or flagged
   - Implement at API or trigger level

### Data Consistency
1. **Denormalized Fields**: When a salesperson is updated, propagate changes to related orders:
   - `salespersonName`, `salespersonRole`, `zone` in OrderWithSalesPerson
2. **Employee Code Uniqueness**: Must be enforced at DB level
3. **Phone/Email Uniqueness** (optional): Consider if business rules require

### Performance Considerations
1. **Endpoint Optimization**:
   - Join SalesPerson with Orders to avoid N+1 queries
   - Index on `zone`, `role`, `status`, `salespersonId`
2. **Pagination** (future):
   - Consider adding limit/offset for large datasets
   - E.g., `GET /api/sales-hierarchy?limit=50&offset=0`

---

## 5. Frontend Integration Points

### Salesperson Onboarding Page
- **On Load**: Calls `GET /api/sales-hierarchy` → loads all salespersons
- **Search**: Filters client-side on name, role, zone, employeeCode
- **Add**: Calls `POST /api/sales-hierarchy` with form data
- **Edit**: Calls `PUT /api/sales-hierarchy/:id` with updated fields
- **Delete**: Calls `DELETE /api/sales-hierarchy/:id` after confirmation
- **Role Change**: Updates manager options based on selected role hierarchy

### Hierarchy Orders Page
- **On Load**: 
  - Calls `GET /api/sales-hierarchy` → loads team structure
  - Calls `GET /api/order` → loads all orders
- **Grouping Logic** (client-side):
  - Groups orders by Zone → RSM → ASM → Sales Executive
  - Calculates totals (count, sum) per group
- **Filtering**: Client-side filters by zone, status, search term
- **Refresh**: Re-fetches both salespersons and orders when page re-enters

---

## 6. Authentication & Authorization

All endpoints require:
- **Header**: `Authorization: Bearer <JWT_TOKEN>`
- **Token Source**: From login/signup flow (via Auth service)
- **400 Level Errors**: Returned if token is missing or invalid
- **Scope** (optional): Consider role-based access:
  - Admin/Manager: Can view and modify all
  - Salesperson: Can only view own data (future enhancement)

---

## 7. Error Handling

### Standard Error Response Format
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": { "field": "error_detail" }
}
```

### Common Error Scenarios

| Status | Error | Message |
|--------|-------|---------|
| 400 | VALIDATION_ERROR | Invalid input: `{field: "error"}` |
| 400 | HIERARCHY_VIOLATION | Cannot assign manager: RSM must report to SSM |
| 400 | HAS_SUBORDINATES | Cannot delete person with active reports |
| 401 | UNAUTHORIZED | Missing or invalid authentication token |
| 404 | NOT_FOUND | Salesperson with id {id} not found |
| 409 | DUPLICATE | Employee code already exists |
| 500 | INTERNAL_ERROR | Server error: {detail} |

---

## 8. Sample Seed Data

Initial data contains Bihar region sales hierarchy:
- 1 SSM (State Sales Manager)
- 2 RSMs (RSM-001: S BIHAR, RSM-002: N BIHAR)
- 4 ASMs per zone (8 total)
- 20+ Sales Executives distributed across ASMs
- 16 Sample orders across zones and statuses

All with denormalized zone/salesperson info in orders.

---

## 9. Testing Checklist

### API Functional Tests
- [ ] GET /api/sales-hierarchy returns all salespersons
- [ ] POST /api/sales-hierarchy creates with valid role hierarchy
- [ ] POST rejects invalid phone format
- [ ] PUT updates salesperson and propagates to orders
- [ ] DELETE fails if person has subordinates
- [ ] GET /api/order returns all orders with denormalized fields
- [ ] Manager assignment respects hierarchy rules (RSM→SSM, ASM→RSM, etc.)

### Edge Cases
- [ ] Updating a salesperson's zone propagates to related orders (denormalized)
- [ ] Filtering by zone/status on orders endpoint works correctly
- [ ] Salesperson with no phone/email is still retrieved (optional fields)
- [ ] Timezone handling for createdAt timestamps

---

## 10. Deployment Checklist

- [ ] Environment variable: `API_URL` set to backend base URL
- [ ] CORS enabled for frontend origin
- [ ] JWT secret configured securely
- [ ] Database indices created on frequently queried fields
- [ ] Seed data loaded (Bihar hierarchy + 16 sample orders)
- [ ] Error logging configured
- [ ] Rate limiting or throttling (optional)
- [ ] Health check endpoint `/api/health` (optional)

---

## 11. Migration Path

### Phase 1 (Current)
- Frontend uses mock data with `USE_MOCK = true` flag in service
- Data persisted in localStorage for demo

### Phase 2 (Integration)
1. Set `USE_MOCK = false` in `src/app/services/sales-hierarchy.service.ts`
2. Set `environment.apiUrl` to backend base URL
3. Deploy backend with above API endpoints
4. Test integration end-to-end

### Phase 3 (Optimization)
- Add pagination to large result sets
- Implement role-based access control
- Add audit logging for changes
- Optimize database queries

---

## 12. Contact Points

- **Frontend Service**: `src/app/services/sales-hierarchy.service.ts`
- **Pages**:
  - Onboarding: `src/app/sales/salesperson-onboarding/salesperson-onboarding.page.*`
  - Orders: `src/app/sales/hierarchy-orders/hierarchy-orders.page.*`
- **API Base URL**: `${environment.apiUrl}/sales-hierarchy` (persons), `${environment.apiUrl}/order` (orders)
- **Auth Header**: From `auth.service.ts` via `auth.getToken()`

---

**Generated**: March 21, 2026  
**Framework**: Angular 16+ (Ionic, Standalone Components)  
**Backend Technology**: (To be implemented - Node.js/Express, Spring Boot, .NET, etc.)
