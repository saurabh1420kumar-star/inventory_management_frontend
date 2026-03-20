# Spring Boot Backend — Bill of Materials (BOM) API

> **Companion backend specification** for the `inventory_management_fronted-` Angular/Ionic frontend.  
> Base URL: `https://api.imsnectarorigin.com`  
> API Prefix: `/api/products`

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Configuration](#3-configuration)
4. [Database Schema](#4-database-schema)
5. [Entity / DTO Reference](#5-entity--dto-reference)
6. [API Endpoints](#6-api-endpoints)
    - [GET /bom](#get-apibom--list-all-boms)
    - [GET /bom/:id](#get-apibomid--get-single-bom)
    - [GET /bom/product/:productId](#get-apibomproductproductid--boms-by-product)
    - [POST /bom](#post-apibom--create-bom)
    - [PUT /bom/:id](#put-apibomid--update-bom)
    - [DELETE /bom/:id](#delete-apibomid--delete-bom)
    - [Supporting Endpoints](#supporting-endpoints)
7. [Business Logic — Computed Fields](#7-business-logic--computed-fields)
8. [Validation Rules](#8-validation-rules)
9. [Error Response Format](#9-error-response-format)
10. [CORS Configuration](#10-cors-configuration)
11. [Security Considerations](#11-security-considerations)
12. [Sample Payloads](#12-sample-payloads)

---

## 1. Tech Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Framework      | Spring Boot 3.x                    |
| Language       | Java 17+                           |
| ORM            | Spring Data JPA (Hibernate 6)      |
| Database       | MySQL 8 / PostgreSQL 15            |
| Validation     | Jakarta Validation (Bean Validation 3) |
| JSON           | Jackson (default)                  |
| Build          | Maven 3.9+ / Gradle 8+             |
| Security       | Spring Security (JWT)              |
| Migrations     | Flyway / Liquibase                 |

---

## 2. Project Structure

```
src/main/java/com/imsnectarorigin/inventory/
├── config/
│   ├── CorsConfig.java
│   └── SecurityConfig.java
├── controller/
│   ├── BomController.java
│   ├── RawMaterialController.java
│   └── FinishedProductController.java
├── service/
│   ├── BomService.java
│   └── BomServiceImpl.java
├── repository/
│   └── BomRepository.java
├── model/
│   ├── entity/
│   │   ├── BillOfMaterial.java
│   │   ├── BomComponent.java
│   │   └── AdditionalCost.java
│   └── dto/
│       ├── BomRequestDto.java
│       ├── BomResponseDto.java
│       ├── BomComponentDto.java
│       └── AdditionalCostDto.java
└── exception/
    ├── GlobalExceptionHandler.java
    ├── ResourceNotFoundException.java
    └── BomValidationException.java
```

---

## 3. Configuration

### `application.yml`

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/inventory_db?useSSL=false&serverTimezone=UTC
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: validate          # Use Flyway for migrations in production
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
        format_sql: true
  jackson:
    serialization:
      write-dates-as-timestamps: false
    time-zone: UTC

app:
  api-prefix: /api/products
  cors:
    allowed-origins:
      - http://localhost:4200       # Angular dev server
      - https://imsnectarorigin.com # Production domain
      - capacitor://localhost        # Capacitor mobile app
      - ionic://localhost            # Ionic dev
```

---

## 4. Database Schema

```sql
-- ─────────────────────────────────────────────
--  bill_of_materials
-- ─────────────────────────────────────────────
CREATE TABLE bill_of_materials (
    id                      BIGINT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    finished_product_id     BIGINT          NOT NULL,
    finished_product_name   VARCHAR(255)    NOT NULL,
    bom_name                VARCHAR(255)    NOT NULL,
    output_quantity         DECIMAL(15, 4)  NOT NULL DEFAULT 1,
    output_unit             VARCHAR(50)     NOT NULL DEFAULT 'BAG',
    cost_allocation_percent DECIMAL(5, 2)   NOT NULL DEFAULT 100.00
        CHECK (cost_allocation_percent > 0 AND cost_allocation_percent <= 100),
    total_component_cost    DECIMAL(15, 2)  NOT NULL DEFAULT 0.00,
    total_additional_cost   DECIMAL(15, 2)  NOT NULL DEFAULT 0.00,
    effective_cost          DECIMAL(15, 2)  NOT NULL DEFAULT 0.00,
    effective_rate_per_unit DECIMAL(15, 2)  NOT NULL DEFAULT 0.00,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_bom_finished_product (finished_product_id),
    INDEX idx_bom_name (bom_name)
);

-- ─────────────────────────────────────────────
--  bom_components
-- ─────────────────────────────────────────────
CREATE TABLE bom_components (
    id                  BIGINT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bom_id              BIGINT          NOT NULL,
    raw_material_id     BIGINT          NOT NULL,
    raw_material_name   VARCHAR(255)    NOT NULL,
    quantity            DECIMAL(15, 4)  NOT NULL,
    unit                VARCHAR(50)     NOT NULL DEFAULT 'KG',
    rate                DECIMAL(15, 4)  NOT NULL,
    amount              DECIMAL(15, 2)  NOT NULL,

    CONSTRAINT fk_bom_component FOREIGN KEY (bom_id)
        REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    INDEX idx_bom_component_bom (bom_id),
    INDEX idx_bom_component_material (raw_material_id)
);

-- ─────────────────────────────────────────────
--  bom_additional_costs
-- ─────────────────────────────────────────────
CREATE TABLE bom_additional_costs (
    id          BIGINT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bom_id      BIGINT          NOT NULL,
    type        VARCHAR(100)    NOT NULL,
    percentage  DECIMAL(5, 2)   NOT NULL,
    amount      DECIMAL(15, 2)  NOT NULL,

    CONSTRAINT fk_bom_additional_cost FOREIGN KEY (bom_id)
        REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    INDEX idx_bom_additional_cost (bom_id)
);
```

---

## 5. Entity / DTO Reference

### `BomResponseDto` — **what the frontend receives**

```java
public class BomResponseDto {
    private Long id;
    private Long finishedProductId;
    private String finishedProductName;
    private String bomName;
    private Double outputQuantity;
    private String outputUnit;
    private Double costAllocationPercent;
    private List<BomComponentDto> components;
    private List<AdditionalCostDto> additionalCosts;
    private Double totalComponentCost;     // server-computed
    private Double totalAdditionalCost;    // server-computed
    private Double effectiveCost;          // server-computed
    private Double effectiveRatePerUnit;   // server-computed
    private Instant createdAt;
    private Instant updatedAt;
}
```

### `BomComponentDto`

```java
public class BomComponentDto {
    private Long id;                  // null on create
    private Long rawMaterialId;       // FK → raw_materials.id
    private String rawMaterialName;
    private Double quantity;
    private String unit;              // "KG", "LITER", "PIECE", "METER"
    private Double rate;              // per unit rate
    private Double amount;            // quantity × rate (server recomputes on save)
}
```

### `AdditionalCostDto`

```java
public class AdditionalCostDto {
    private String type;        // e.g. "Labour & Processing", "Overhead"
    private Double percentage;  // e.g. 2.5 means 2.5%
    private Double amount;      // server-computed: totalComponentCost × (percentage / 100)
}
```

### `BomRequestDto` — **what the frontend sends on CREATE / UPDATE**

The frontend sends the same shape as `BomResponseDto` but computed fields
(`totalComponentCost`, `totalAdditionalCost`, `effectiveCost`, `effectiveRatePerUnit`)
can be included or omitted — **the backend must recompute them server-side** to prevent
client-side tampering.

---

## 6. API Endpoints

All endpoints are under the path prefix `/api/products/bom`.

---

### `GET /api/products/bom` — List all BOMs

Returns every BOM, including nested components and additional costs.

**Request**
```
GET /api/products/bom
Authorization: Bearer <jwt>
```

**Response `200 OK`**
```json
[
  {
    "id": 1,
    "finishedProductId": 101,
    "finishedProductName": "Manka Mash 20 Kg",
    "bomName": "MANKA MASH 20 KG",
    "outputQuantity": 20.0,
    "outputUnit": "BAG",
    "costAllocationPercent": 100.0,
    "components": [
      {
        "id": 1,
        "rawMaterialId": 1,
        "rawMaterialName": "DORB",
        "quantity": 111.4,
        "unit": "KG",
        "rate": 14.06,
        "amount": 1566.28
      }
    ],
    "additionalCosts": [],
    "totalComponentCost": 6965.88,
    "totalAdditionalCost": 0.0,
    "effectiveCost": 6965.88,
    "effectiveRatePerUnit": 348.29,
    "createdAt": "2025-03-20T10:30:00Z",
    "updatedAt": "2025-03-20T10:30:00Z"
  }
]
```

**Empty list (no BOMs yet) — frontend expects `[]`, NOT 404**
```json
[]
```

> The frontend catches errors with `catchError(() => of([]))`. Return `[]` with `200 OK`
> when no BOMs exist. Never return `204 No Content` for list endpoints.

---

### `GET /api/products/bom/:id` — Get single BOM

**Request**
```
GET /api/products/bom/1
Authorization: Bearer <jwt>
```

**Response `200 OK`**
```json
{
  "id": 1,
  "finishedProductId": 101,
  "finishedProductName": "Manka Mash 20 Kg",
  "bomName": "MANKA MASH 20 KG",
  "outputQuantity": 20.0,
  "outputUnit": "BAG",
  "costAllocationPercent": 100.0,
  "components": [ ... ],
  "additionalCosts": [],
  "totalComponentCost": 6965.88,
  "totalAdditionalCost": 0.0,
  "effectiveCost": 6965.88,
  "effectiveRatePerUnit": 348.29,
  "createdAt": "2025-03-20T10:30:00Z",
  "updatedAt": "2025-03-20T10:30:00Z"
}
```

**Response `404 Not Found`**
```json
{
  "timestamp": "2025-03-20T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "BOM with id 1 not found",
  "path": "/api/products/bom/1"
}
```

---

### `GET /api/products/bom/product/:productId` — BOMs by product

Filters BOMs belonging to a specific finished product.

**Request**
```
GET /api/products/bom/product/101
Authorization: Bearer <jwt>
```

**Response `200 OK`** — same shape as list endpoint, filtered by `finishedProductId`.

---

### `POST /api/products/bom` — Create BOM

**Request**
```
POST /api/products/bom
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "finishedProductId": 101,
  "finishedProductName": "Manka Mash 20 Kg",
  "bomName": "MANKA MASH 20 KG",
  "outputQuantity": 20,
  "outputUnit": "BAG",
  "costAllocationPercent": 100,
  "components": [
    {
      "rawMaterialId": 1,
      "rawMaterialName": "DORB",
      "quantity": 111.4,
      "unit": "KG",
      "rate": 14.06,
      "amount": 1566.28
    },
    {
      "rawMaterialId": 2,
      "rawMaterialName": "YELLOW MAZE",
      "quantity": 125.4,
      "unit": "KG",
      "rate": 18.76,
      "amount": 2352.50
    }
  ],
  "additionalCosts": [
    {
      "type": "Labour & Processing",
      "percentage": 2.5,
      "amount": 0
    }
  ]
}
```

> **Note:** The frontend sends client-computed `amount` and aggregate totals, but the
> backend **must recompute** all derived fields for integrity (see §7).

**Response `201 Created`** — full `BomResponseDto` with server-assigned `id`, recomputed
totals, and `createdAt` / `updatedAt` timestamps.

```json
{
  "id": 4,
  "finishedProductId": 101,
  "finishedProductName": "Manka Mash 20 Kg",
  "bomName": "MANKA MASH 20 KG",
  "outputQuantity": 20.0,
  "outputUnit": "BAG",
  "costAllocationPercent": 100.0,
  "components": [
    {
      "id": 29,
      "rawMaterialId": 1,
      "rawMaterialName": "DORB",
      "quantity": 111.4,
      "unit": "KG",
      "rate": 14.06,
      "amount": 1566.28
    }
  ],
  "additionalCosts": [
    {
      "type": "Labour & Processing",
      "percentage": 2.5,
      "amount": 39.16
    }
  ],
  "totalComponentCost": 1566.28,
  "totalAdditionalCost": 39.16,
  "effectiveCost": 1605.44,
  "effectiveRatePerUnit": 80.27,
  "createdAt": "2025-03-20T11:00:00Z",
  "updatedAt": "2025-03-20T11:00:00Z"
}
```

**Response `400 Bad Request`** (validation failure)
```json
{
  "timestamp": "2025-03-20T11:00:00Z",
  "status": 400,
  "error": "Validation Failed",
  "message": "Request body has validation errors",
  "errors": {
    "bomName": "BOM name is required",
    "components": "BOM must have at least one component",
    "outputQuantity": "Output quantity must be greater than 0"
  }
}
```

---

### `PUT /api/products/bom/:id` — Update BOM

Full replacement of the BOM record (including components and additional costs).
All child records should be deleted and re-inserted to handle removals.

**Request**
```
PUT /api/products/bom/4
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "finishedProductId": 101,
  "finishedProductName": "Manka Mash 20 Kg",
  "bomName": "MANKA MASH 20 KG (REVISED)",
  "outputQuantity": 20,
  "outputUnit": "BAG",
  "costAllocationPercent": 100,
  "components": [ ... ],
  "additionalCosts": [ ... ]
}
```

**Response `200 OK`** — same as POST 201 body, updated `updatedAt` timestamp.

**Response `404 Not Found`** — if BOM id does not exist.

---

### `DELETE /api/products/bom/:id` — Delete BOM

Deletes the BOM and all its components + additional costs (cascades via FK).

**Request**
```
DELETE /api/products/bom/4
Authorization: Bearer <jwt>
```

**Response `204 No Content`** — empty body.  
**Response `404 Not Found`** — if id does not exist.

> The frontend calls `deleteBOM(id)` and expects either `204` or any 2xx to succeed.
> Do **not** return `200` with a body—the Angular `HttpClient` will deserialize `void`.

---

### Supporting Endpoints

These endpoints are also called by the frontend (`InventoryService`) and must exist:

#### Raw Materials

```
GET    /api/products/raw-materials          → InventoryItem[]
POST   /api/products/raw-materials          → InventoryItem
PUT    /api/products/raw-materials/:id      → InventoryItem
DELETE /api/products/raw-materials/:id      → 204
```

Each item must include the fields used to populate the BOM component dropdown:

```json
{
  "id": 1,
  "name": "DORB",
  "materialCode": "RM-001",
  "unit": "KG",
  "quantity": 500.0,
  "minimumThreshold": 50.0,
  "lowStock": false,
  "category": "raw_material",
  "price": 14.06,
  "createdAt": "2025-03-01T00:00:00Z",
  "updatedAt": "2025-03-20T00:00:00Z"
}
```

> The `price` field is used as the default `rate` when selecting a material in the
> BOM create modal (`onBomComponentMaterialChange`).

#### Finished Products

```
GET    /api/products/finished-products      → InventoryItem[]
POST   /api/products/finished-products      → InventoryItem
PUT    /api/products/finished-products/:id  → InventoryItem
DELETE /api/products/finished-products/:id  → 204
```

The finished products list populates the product dropdown in the Create BOM modal
(`finishedProductsList`).

---

## 7. Business Logic — Computed Fields

The backend **must recompute** all aggregate fields on every `POST` / `PUT` to prevent
injection of false cost data from the client.

```
for each component:
    component.amount = component.quantity × component.rate
    (round to 2 decimal places)

totalComponentCost = Σ component.amount

for each additionalCost:
    additionalCost.amount = totalComponentCost × (additionalCost.percentage / 100)
    (round to 2 decimal places)

totalAdditionalCost = Σ additionalCost.amount

effectiveCost = totalComponentCost + totalAdditionalCost

effectiveRatePerUnit = effectiveCost / outputQuantity
    (round to 2 decimal places)
```

### Java implementation outline

```java
@Service
public class BomServiceImpl implements BomService {

    public BomResponseDto computeAndSave(BomRequestDto request, Long existingId) {
        // 1. Recompute component amounts
        double totalComponentCost = request.getComponents().stream()
            .peek(c -> c.setAmount(
                BigDecimal.valueOf(c.getQuantity())
                    .multiply(BigDecimal.valueOf(c.getRate()))
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue()
            ))
            .mapToDouble(BomComponentDto::getAmount)
            .sum();

        totalComponentCost = round2(totalComponentCost);

        // 2. Recompute additional cost amounts
        final double base = totalComponentCost;
        double totalAdditionalCost = request.getAdditionalCosts().stream()
            .peek(ac -> ac.setAmount(
                round2(base * ac.getPercentage() / 100.0)
            ))
            .mapToDouble(AdditionalCostDto::getAmount)
            .sum();

        totalAdditionalCost = round2(totalAdditionalCost);

        // 3. Roll-up
        double effectiveCost = round2(totalComponentCost + totalAdditionalCost);
        double effectiveRatePerUnit = round2(
            effectiveCost / request.getOutputQuantity()
        );

        // 4. Persist and return ...
    }

    private double round2(double value) {
        return BigDecimal.valueOf(value)
            .setScale(2, RoundingMode.HALF_UP)
            .doubleValue();
    }
}
```

---

## 8. Validation Rules

Enforced via Jakarta Bean Validation on `BomRequestDto`:

| Field                   | Rule                                                                    |
|-------------------------|-------------------------------------------------------------------------|
| `bomName`               | `@NotBlank`, max 255 chars                                              |
| `finishedProductId`     | `@NotNull`, must exist in finished products table                       |
| `finishedProductName`   | `@NotBlank`, max 255 chars                                              |
| `outputQuantity`        | `@NotNull`, `@Positive` (> 0)                                           |
| `outputUnit`            | `@NotBlank`, max 50 chars                                               |
| `costAllocationPercent` | `@NotNull`, `@DecimalMin("0.01")`, `@DecimalMax("100.00")`              |
| `components`            | `@NotEmpty` — at least 1 component required                             |
| `components[].rawMaterialId` | `@NotNull`, `@Positive`                                            |
| `components[].rawMaterialName`| `@NotBlank`                                                       |
| `components[].quantity` | `@NotNull`, `@Positive`                                                 |
| `components[].unit`     | `@NotBlank`                                                             |
| `components[].rate`     | `@NotNull`, `@PositiveOrZero`                                           |
| `additionalCosts[].type`| `@NotBlank` if cost entry is present                                    |
| `additionalCosts[].percentage` | `@DecimalMin("0.0")`, `@DecimalMax("100.0")`                   |

---

## 9. Error Response Format

All error responses must follow this envelope so the frontend can parse them consistently:

```json
{
  "timestamp": "2025-03-20T11:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Human-readable description",
  "path": "/api/products/bom",
  "errors": {
    "fieldName": "Validation message"
  }
}
```

### GlobalExceptionHandler snippet

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> errors = ex.getBindingResult()
            .getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"
            ));
        return ResponseEntity.badRequest().body(
            ErrorResponse.builder()
                .status(400).error("Validation Failed")
                .message("Request body has validation errors")
                .errors(errors).path(req.getRequestURI())
                .build()
        );
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest req) {
        return ResponseEntity.status(404).body(
            ErrorResponse.builder()
                .status(404).error("Not Found")
                .message(ex.getMessage()).path(req.getRequestURI())
                .build()
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest req) {
        return ResponseEntity.status(500).body(
            ErrorResponse.builder()
                .status(500).error("Internal Server Error")
                .message("An unexpected error occurred")
                .path(req.getRequestURI())
                .build()
        );
    }
}
```

---

## 10. CORS Configuration

The Angular app runs on `localhost:4200` during development and the Capacitor mobile app
uses `capacitor://localhost`. Both origins must be allowed.

```java
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:4200",          // Angular dev
            "http://localhost:8100",          // Ionic dev
            "capacitor://localhost",          // Capacitor iOS/Android
            "ionic://localhost",
            "https://imsnectarorigin.com"     // Production
        ));

        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));

        config.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "Accept",
            "X-Requested-With", "Cache-Control"
        ));

        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

---

## 11. Security Considerations

### Authentication
All BOM endpoints require a valid JWT in the `Authorization: Bearer <token>` header.
Return `401 Unauthorized` (not `403`) when the token is missing or expired.

### Input Sanitization
- Strip or reject HTML/script tags from `bomName`, `finishedProductName`, and `type`
  fields to prevent stored XSS.
- `rawMaterialId` and `finishedProductId` must reference real records; validate via
  repository lookup before persisting to prevent IDOR.

### Decimal Precision
- Store all monetary values as `DECIMAL(15, 2)` in the database, **not** `FLOAT` or
  `DOUBLE`, to avoid floating-point rounding errors in cost aggregation.
- Use `BigDecimal` — never `double` — for all cost arithmetic in Java.

### Rate Limiting
Apply rate limiting on mutation endpoints (`POST`, `PUT`, `DELETE`) to prevent
mass BOM creation / deletion abuse.

### Audit Logging
Log `createdBy` / `updatedBy` user IDs alongside `createdAt` / `updatedAt`. The
frontend does not send these — resolve them from the JWT principal server-side.

---

## 12. Sample Payloads

### Full POST request — Poultry Feed 50 KG (with additional costs)

```json
POST /api/products/bom
{
  "finishedProductId": 102,
  "finishedProductName": "Poultry Feed Premium 50 KG",
  "bomName": "POULTRY FEED 50 KG",
  "outputQuantity": 50,
  "outputUnit": "BAG",
  "costAllocationPercent": 100,
  "components": [
    { "rawMaterialId": 2,  "rawMaterialName": "YELLOW MAZE",  "quantity": 340.0, "unit": "KG", "rate": 18.76, "amount": 6378.40 },
    { "rawMaterialId": 1,  "rawMaterialName": "DORB",         "quantity": 120.0, "unit": "KG", "rate": 14.06, "amount": 1687.20 },
    { "rawMaterialId": 9,  "rawMaterialName": "SOYBEAN MEAL", "quantity":  80.0, "unit": "KG", "rate": 42.50, "amount": 3400.00 },
    { "rawMaterialId": 4,  "rawMaterialName": "DDGS",         "quantity":  60.0, "unit": "KG", "rate": 16.53, "amount":  991.80 },
    { "rawMaterialId": 10, "rawMaterialName": "LIMESTONE",    "quantity":  18.0, "unit": "KG", "rate":  5.20, "amount":   93.60 },
    { "rawMaterialId": 5,  "rawMaterialName": "SALT",         "quantity":   8.0, "unit": "KG", "rate":  4.00, "amount":   32.00 },
    { "rawMaterialId": 11, "rawMaterialName": "VITAMIN MIX",  "quantity":   2.0, "unit": "KG", "rate": 310.00,"amount":  620.00 },
    { "rawMaterialId": 8,  "rawMaterialName": "BOPP BAG",     "quantity":   2.0, "unit": "KG", "rate": 172.19,"amount":  344.38 }
  ],
  "additionalCosts": [
    { "type": "Labour & Processing", "percentage": 2.5, "amount": 0 },
    { "type": "Overhead",            "percentage": 1.5, "amount": 0 }
  ]
}
```

**Expected response (server recomputes amounts):**

```json
{
  "id": 2,
  "finishedProductId": 102,
  "finishedProductName": "Poultry Feed Premium 50 KG",
  "bomName": "POULTRY FEED 50 KG",
  "outputQuantity": 50.0,
  "outputUnit": "BAG",
  "costAllocationPercent": 100.0,
  "components": [
    { "id": 9,  "rawMaterialId": 2,  "rawMaterialName": "YELLOW MAZE",  "quantity": 340.0, "unit": "KG", "rate": 18.76, "amount": 6378.40 },
    { "id": 10, "rawMaterialId": 1,  "rawMaterialName": "DORB",         "quantity": 120.0, "unit": "KG", "rate": 14.06, "amount": 1687.20 },
    { "id": 11, "rawMaterialId": 9,  "rawMaterialName": "SOYBEAN MEAL", "quantity":  80.0, "unit": "KG", "rate": 42.50, "amount": 3400.00 },
    { "id": 12, "rawMaterialId": 4,  "rawMaterialName": "DDGS",         "quantity":  60.0, "unit": "KG", "rate": 16.53, "amount":  991.80 },
    { "id": 13, "rawMaterialId": 10, "rawMaterialName": "LIMESTONE",    "quantity":  18.0, "unit": "KG", "rate":  5.20, "amount":   93.60 },
    { "id": 14, "rawMaterialId": 5,  "rawMaterialName": "SALT",         "quantity":   8.0, "unit": "KG", "rate":  4.00, "amount":   32.00 },
    { "id": 15, "rawMaterialId": 11, "rawMaterialName": "VITAMIN MIX",  "quantity":   2.0, "unit": "KG", "rate": 310.00,"amount":  620.00 },
    { "id": 16, "rawMaterialId": 8,  "rawMaterialName": "BOPP BAG",     "quantity":   2.0, "unit": "KG", "rate": 172.19,"amount":  344.38 }
  ],
  "additionalCosts": [
    { "type": "Labour & Processing", "percentage": 2.5, "amount": 338.68 },
    { "type": "Overhead",            "percentage": 1.5, "amount": 203.21 }
  ],
  "totalComponentCost": 13547.38,
  "totalAdditionalCost": 541.89,
  "effectiveCost": 14089.27,
  "effectiveRatePerUnit": 281.79,
  "createdAt": "2025-03-20T10:00:00Z",
  "updatedAt": "2025-03-20T10:00:00Z"
}
```

---

### Partial cost allocation example

When `costAllocationPercent < 100`, the effective cost allocated to the primary product is:

```
effectiveCost = (totalComponentCost + totalAdditionalCost) × (costAllocationPercent / 100)
effectiveRatePerUnit = effectiveCost / outputQuantity
```

For example, a BOM with `costAllocationPercent: 80`, `totalComponentCost: 10000`,
`outputQuantity: 10`:

```
effectiveCost       = 10000 × (80/100) = 8000
effectiveRatePerUnit = 8000 / 10       = 800
```

---

### Controller — quick reference

```java
@RestController
@RequestMapping("/api/products/bom")
@RequiredArgsConstructor
public class BomController {

    private final BomService bomService;

    @GetMapping
    public ResponseEntity<List<BomResponseDto>> getAll() {
        return ResponseEntity.ok(bomService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BomResponseDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(bomService.findById(id));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<BomResponseDto>> getByProduct(
            @PathVariable Long productId) {
        return ResponseEntity.ok(bomService.findByProduct(productId));
    }

    @PostMapping
    public ResponseEntity<BomResponseDto> create(
            @RequestBody @Valid BomRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(bomService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BomResponseDto> update(
            @PathVariable Long id,
            @RequestBody @Valid BomRequestDto request) {
        return ResponseEntity.ok(bomService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        bomService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

*Last updated: March 2026 — matches frontend version `inventory_management_fronted-` BOM tab.*
