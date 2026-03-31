# User Rights & Permissions — Backend API Specification

## Overview

This document specifies the backend API changes required to support the **granular user permissions system** in the frontend. The new system replaces the old binary feature-on/off model with a **3-level access control** per module:

| Access Level | Value  | Description                                     |
|-------------|--------|-------------------------------------------------|
| No Access   | `NONE` | Module is completely hidden from the user        |
| Read Only   | `READ` | User can view data but cannot create/edit/delete |
| Full Edit   | `EDIT` | User has full CRUD access to the module          |

---

## Database Schema Changes

### New Table: `user_module_permissions`

| Column       | Type                           | Constraints                        | Description                         |
|-------------|--------------------------------|------------------------------------|-------------------------------------|
| `id`         | `BIGINT`                       | `PRIMARY KEY, AUTO_INCREMENT`      | Unique ID                           |
| `user_id`    | `BIGINT`                       | `NOT NULL, FK → users(id)`        | Reference to the user               |
| `feature_key`| `VARCHAR(100)`                 | `NOT NULL`                         | Module/feature identifier           |
| `access_level`| `ENUM('NONE','READ','EDIT')`  | `NOT NULL, DEFAULT 'NONE'`        | Access level for this module        |
| `granted_by` | `BIGINT`                       | `FK → users(id)`                  | Admin who granted this permission   |
| `granted_at` | `TIMESTAMP`                    | `DEFAULT CURRENT_TIMESTAMP`        | When the permission was last set    |
| `updated_at` | `TIMESTAMP`                    | `ON UPDATE CURRENT_TIMESTAMP`      | Last modification timestamp         |

**Indexes:**
```sql
UNIQUE INDEX idx_user_feature (user_id, feature_key)
INDEX idx_feature_key (feature_key)
```

### New Table: `permission_audit_log`

Tracks every permission change for compliance and accountability.

| Column          | Type           | Constraints                        | Description                        |
|----------------|----------------|------------------------------------|------------------------------------|
| `id`            | `BIGINT`       | `PRIMARY KEY, AUTO_INCREMENT`      | Unique ID                          |
| `user_id`       | `BIGINT`       | `NOT NULL, FK → users(id)`        | User whose permissions changed     |
| `feature_key`   | `VARCHAR(100)` | `NOT NULL`                         | Module affected                    |
| `old_access`    | `VARCHAR(10)`  | `NULLABLE`                         | Previous access level              |
| `new_access`    | `VARCHAR(10)`  | `NOT NULL`                         | New access level                   |
| `changed_by`    | `BIGINT`       | `NOT NULL, FK → users(id)`        | Admin who made the change          |
| `changed_at`    | `TIMESTAMP`    | `DEFAULT CURRENT_TIMESTAMP`        | Timestamp of the change            |
| `ip_address`    | `VARCHAR(45)`  |                                    | IP address of the admin            |

---

## Feature Keys (Module Identifiers)

These are the `feature_key` values used across the system. Each maps to a frontend module/page:

| Feature Key              | Display Name         | Category              |
|--------------------------|---------------------|-----------------------|
| `DASHBOARD`              | Dashboard           | Core                  |
| `OPERATIONS`             | Operations          | Core                  |
| `FEEDBACK`               | Feedback            | Core                  |
| `INVENTORY_MASTERS`      | Master Inventory    | Inventory             |
| `INVENTORY_TRANSACTIONS` | Machine Parts       | Inventory             |
| `UNIT_MASTER`            | Unit Master         | Inventory             |
| `ACCOUNTS`               | Accounts Master     | Accounts              |
| `ACCOUNTS_TRANSACTION`   | Transactions        | Accounts              |
| `PAYMENT_REQUEST`        | Payment Requests    | Accounts              |
| `SALES`                  | Sales Management    | Sales & Distribution  |
| `DISTRIBUTOR`            | Distributor         | Sales & Distribution  |
| `ORDER_DETAILS`          | Order Tracking      | Sales & Distribution  |
| `PROFORMA_INVOICE`       | Proforma Invoice    | Sales & Distribution  |
| `DISPATCH`               | Dispatch            | Logistics             |
| `GDN`                    | GDN                 | Logistics             |
| `LOGISTICS`              | Logistics           | Logistics             |
| `HR`                     | HR Department       | HR                    |
| `HR_DESIGNATION`         | Designation         | HR                    |
| `HR_EMPLOYEE`            | Employee            | HR                    |
| `COMPLAINT`              | Complaints          | Support               |
| `COMPLAINTS_MANAGEMENT`  | Manage Complaints   | Support               |
| `USER_RIGHTS`            | User Rights         | Administration        |

---

## API Endpoints

### 1. Get User Permissions

Retrieves the full permissions map for a specific user.

```
GET /api/permissions/user/{userId}/permissions
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Path Parameters:**
| Parameter | Type   | Description |
|-----------|--------|-------------|
| `userId`  | `Long` | Target user ID |

**Response `200 OK`:**
```json
{
  "userId": 5,
  "username": "rajeshk",
  "firstName": "Rajesh",
  "lastName": "Kumar",
  "roleType": "SALES_OFFICER",
  "permissions": {
    "DASHBOARD": "EDIT",
    "OPERATIONS": "NONE",
    "FEEDBACK": "READ",
    "INVENTORY_MASTERS": "READ",
    "INVENTORY_TRANSACTIONS": "NONE",
    "UNIT_MASTER": "NONE",
    "ACCOUNTS": "NONE",
    "ACCOUNTS_TRANSACTION": "NONE",
    "PAYMENT_REQUEST": "NONE",
    "SALES": "EDIT",
    "DISTRIBUTOR": "READ",
    "ORDER_DETAILS": "EDIT",
    "PROFORMA_INVOICE": "READ",
    "DISPATCH": "NONE",
    "GDN": "NONE",
    "LOGISTICS": "NONE",
    "HR": "NONE",
    "HR_DESIGNATION": "NONE",
    "HR_EMPLOYEE": "NONE",
    "COMPLAINT": "READ",
    "COMPLAINTS_MANAGEMENT": "NONE",
    "USER_RIGHTS": "NONE"
  }
}
```

**Response `403 Forbidden`:**
```json
{
  "error": "FORBIDDEN",
  "message": "Only admins can view user permissions"
}
```

---

### 2. Update User Permissions (Bulk)

Sets the complete permissions map for a user. Replaces all existing permissions.

```
PUT /api/permissions/user/{userId}/permissions
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Path Parameters:**
| Parameter | Type   | Description |
|-----------|--------|-------------|
| `userId`  | `Long` | Target user ID |

**Request Body:**
```json
{
  "permissions": {
    "DASHBOARD": "EDIT",
    "OPERATIONS": "NONE",
    "FEEDBACK": "READ",
    "INVENTORY_MASTERS": "READ",
    "INVENTORY_TRANSACTIONS": "NONE",
    "UNIT_MASTER": "NONE",
    "ACCOUNTS": "NONE",
    "ACCOUNTS_TRANSACTION": "NONE",
    "PAYMENT_REQUEST": "NONE",
    "SALES": "EDIT",
    "DISTRIBUTOR": "READ",
    "ORDER_DETAILS": "EDIT",
    "PROFORMA_INVOICE": "READ",
    "DISPATCH": "NONE",
    "GDN": "NONE",
    "LOGISTICS": "NONE",
    "HR": "NONE",
    "HR_DESIGNATION": "NONE",
    "HR_EMPLOYEE": "NONE",
    "COMPLAINT": "READ",
    "COMPLAINTS_MANAGEMENT": "NONE",
    "USER_RIGHTS": "NONE"
  }
}
```

**Validation Rules:**
- All `feature_key` values must be from the known set (reject unknown keys)
- All `access_level` values must be `NONE`, `READ`, or `EDIT`
- Admins cannot remove their own `USER_RIGHTS` access (prevent lockout)
- `SUPER_ADMIN` users' permissions cannot be modified by `ADMIN` users

**Response `200 OK`:**
```json
{
  "message": "Permissions updated successfully",
  "userId": 5,
  "updatedCount": 22,
  "updatedBy": "admin_username",
  "timestamp": "2026-03-31T10:30:00Z"
}
```

**Response `400 Bad Request`:**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid feature key: UNKNOWN_MODULE",
  "invalidKeys": ["UNKNOWN_MODULE"]
}
```

**Response `403 Forbidden`:**
```json
{
  "error": "FORBIDDEN",
  "message": "Cannot modify SUPER_ADMIN permissions"
}
```

---

### 3. Get All Users with Permissions Summary

Returns the user list with a summary count of their permissions.

```
GET /api/permissions/all-users-with-permissions
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Query Parameters (optional):**
| Parameter | Type     | Description                         |
|-----------|----------|-------------------------------------|
| `role`    | `String` | Filter by roleType                  |
| `status`  | `String` | Filter by status (ACTIVE, PENDING)  |
| `search`  | `String` | Search in firstName, lastName, email|

**Response `200 OK`:**
```json
[
  {
    "id": 5,
    "username": "rajeshk",
    "firstName": "Rajesh",
    "lastName": "Kumar",
    "email": "rajesh@example.com",
    "roleType": "SALES_OFFICER",
    "status": "ACTIVE",
    "contactNo": "+919876543210",
    "createdOn": "2024-01-15T10:00:00Z",
    "lastLoginTime": "2026-03-30T14:22:00Z",
    "permissionSummary": {
      "editCount": 4,
      "readCount": 5,
      "noneCount": 13,
      "totalModules": 22
    }
  }
]
```

---

### 4. Get Permission Audit Log

Returns the history of permission changes for a user.

```
GET /api/permissions/user/{userId}/audit-log
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Query Parameters (optional):**
| Parameter | Type     | Default | Description         |
|-----------|----------|---------|---------------------|
| `page`    | `int`    | `0`     | Page number         |
| `size`    | `int`    | `20`    | Items per page      |

**Response `200 OK`:**
```json
{
  "content": [
    {
      "id": 101,
      "featureKey": "SALES",
      "featureDisplayName": "Sales Management",
      "oldAccess": "NONE",
      "newAccess": "EDIT",
      "changedBy": "admin",
      "changedAt": "2026-03-31T10:30:00Z"
    },
    {
      "id": 100,
      "featureKey": "INVENTORY_MASTERS",
      "featureDisplayName": "Master Inventory",
      "oldAccess": "EDIT",
      "newAccess": "READ",
      "changedBy": "admin",
      "changedAt": "2026-03-30T09:15:00Z"
    }
  ],
  "totalElements": 45,
  "totalPages": 3,
  "currentPage": 0
}
```

---

### 5. Copy Permissions from One User to Another

Bulk operation to clone permissions from a template user.

```
POST /api/permissions/copy
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Request Body:**
```json
{
  "sourceUserId": 5,
  "targetUserIds": [10, 12, 15]
}
```

**Response `200 OK`:**
```json
{
  "message": "Permissions copied successfully",
  "sourceUserId": 5,
  "targetUserIds": [10, 12, 15],
  "copiedModules": 22
}
```

---

### 6. Get Role Template Permissions

Returns the default permission set for a given role. Useful for "reset to role defaults."

```
GET /api/permissions/role-template/{roleType}
```

**Authorization:** `Bearer <token>` — Requires `ADMIN` or `SUPER_ADMIN` role

**Response `200 OK`:**
```json
{
  "roleType": "SALES_OFFICER",
  "permissions": {
    "DASHBOARD": "EDIT",
    "SALES": "EDIT",
    "DISTRIBUTOR": "READ",
    "ORDER_DETAILS": "EDIT",
    "PROFORMA_INVOICE": "READ",
    "COMPLAINT": "READ",
    "FEEDBACK": "READ"
  }
}
```

> **Note:** Only features with `READ` or `EDIT` are included. All unlisted features default to `NONE`.

---

## Changes to Existing Login API

The existing login response needs a small addition. Include the `permissions` map alongside the current `featureNames` array:

### Current Login Response:
```json
{
  "token": "eyJhbGciOi...",
  "type": "Bearer",
  "userId": 5,
  "username": "rajeshk",
  "roleType": "SALES_OFFICER",
  "featureNames": ["SALES", "DISTRIBUTOR", "ORDER_DETAILS"],
  "features": [...]
}
```

### Updated Login Response:
```json
{
  "token": "eyJhbGciOi...",
  "type": "Bearer",
  "userId": 5,
  "username": "rajeshk",
  "roleType": "SALES_OFFICER",
  "featureNames": ["SALES", "DISTRIBUTOR", "ORDER_DETAILS"],
  "features": [...],
  "permissions": {
    "DASHBOARD": "EDIT",
    "SALES": "EDIT",
    "DISTRIBUTOR": "READ",
    "ORDER_DETAILS": "EDIT",
    "PROFORMA_INVOICE": "READ",
    "COMPLAINT": "READ",
    "FEEDBACK": "READ",
    "INVENTORY_MASTERS": "NONE",
    "ACCOUNTS": "NONE"
  }
}
```

> **Backward Compatibility:** Keep `featureNames` and `features` as-is. The frontend will gradually migrate to use `permissions` for access-level checks.

---

## Backend Access Control Enforcement

### Controller-Level Annotations

Create a custom annotation for checking access level on each endpoint:

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresAccess {
    String feature();
    String level() default "READ"; // "READ" or "EDIT"
}
```

**Usage in controllers:**
```java
@GetMapping("/products")
@RequiresAccess(feature = "INVENTORY_MASTERS", level = "READ")
public ResponseEntity<List<Product>> getAllProducts() { ... }

@PostMapping("/products")
@RequiresAccess(feature = "INVENTORY_MASTERS", level = "EDIT")
public ResponseEntity<Product> createProduct(@RequestBody Product product) { ... }

@PutMapping("/products/{id}")
@RequiresAccess(feature = "INVENTORY_MASTERS", level = "EDIT")
public ResponseEntity<Product> updateProduct(...) { ... }

@DeleteMapping("/products/{id}")
@RequiresAccess(feature = "INVENTORY_MASTERS", level = "EDIT")
public ResponseEntity<Void> deleteProduct(...) { ... }
```

### Access Level Hierarchy

```
EDIT > READ > NONE

If endpoint requires READ  → allow READ and EDIT
If endpoint requires EDIT  → allow only EDIT
If user has NONE           → deny with 403
```

### Interceptor / AOP Aspect

```java
@Aspect
@Component
public class AccessControlAspect {

    @Autowired
    private UserPermissionService permissionService;

    @Around("@annotation(requiresAccess)")
    public Object checkAccess(ProceedingJoinPoint joinPoint, RequiresAccess requiresAccess) throws Throwable {
        Long userId = SecurityContextHolder.getContext().getUserId();
        String feature = requiresAccess.feature();
        String requiredLevel = requiresAccess.level();

        String userLevel = permissionService.getAccessLevel(userId, feature);

        if (!hasAccess(userLevel, requiredLevel)) {
            throw new AccessDeniedException("Insufficient permissions for " + feature);
        }

        return joinPoint.proceed();
    }

    private boolean hasAccess(String userLevel, String requiredLevel) {
        if ("EDIT".equals(userLevel)) return true;
        if ("READ".equals(userLevel) && "READ".equals(requiredLevel)) return true;
        return false;
    }
}
```

---

## Migration Strategy

### Step 1: Create Database Tables
Run the SQL migrations to create `user_module_permissions` and `permission_audit_log`.

### Step 2: Seed Existing Permissions
Migrate existing `featureNames` to the new permissions table:
```sql
-- For each user who has a feature, set it to EDIT (preserving current behavior)
INSERT INTO user_module_permissions (user_id, feature_key, access_level, granted_by)
SELECT uf.user_id, uf.feature_name, 'EDIT', 1
FROM user_features uf
ON DUPLICATE KEY UPDATE access_level = 'EDIT';
```

### Step 3: Deploy New Endpoints
Deploy the 6 new API endpoints listed above.

### Step 4: Update Login Response
Add the `permissions` map to the login response alongside existing fields.

### Step 5: Frontend Integration
The frontend is already built to use the new API. Connect the `TODO` placeholders in `user-right.page.ts`:
- `loadUserPermissions()` → Call `GET /api/permissions/user/{userId}/permissions`
- `performSave()` → Call `PUT /api/permissions/user/{userId}/permissions`

### Step 6: Enforce Backend Access Control
Apply `@RequiresAccess` annotations to all controller methods.

---

## Security Considerations

1. **Admin-only access** — All permission management endpoints require `ADMIN` or `SUPER_ADMIN` role
2. **Self-lockout prevention** — Admins cannot revoke their own `USER_RIGHTS` access
3. **Privilege escalation prevention** — `ADMIN` cannot modify `SUPER_ADMIN` permissions
4. **Audit trail** — Every permission change is logged with who changed it, when, and from what IP
5. **Backend enforcement** — Permissions are enforced on every API endpoint, not just the frontend
6. **Input validation** — Reject unknown feature keys and invalid access levels
7. **Rate limiting** — Apply rate limits to permission update endpoints to prevent abuse
