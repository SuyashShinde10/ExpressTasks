# Express.js & MySQL API Build Guide

**Project Repository**
Source Code: https://github.com/SuyashShinde10/ExpressTasks

This document outlines the architecture, code implementation, and testing procedures for the Express.js API project utilizing raw MySQL queries.

## 1. Global Architecture & Setup
The project is initialized using Node.js with the following core dependencies: `express` (routing), `mysql2/promise` (async database communication), and `joi` (data validation).

### Database Connection & Schema (`database.js`)
- **Connection Pool:** `mysql.createPool(...)` manages multiple concurrent connections efficiently. Credentials are securely loaded via the `dotenv` package.
- **Initialization Script:** An `initializeDatabase` function executes raw `CREATE TABLE IF NOT EXISTS` commands on server startup to ensure the `users`, `orders`, and `order_items` tables are ready before accepting traffic.

## 2. Task 1: Complex Data Insertion API
**Endpoint:** `POST /api/orders` | **File:** `routes/orders.js`

This endpoint handles complex JSON payloads and relies heavily on MySQL transactions to write to three tables simultaneously while ensuring data consistency.

### Data Validation
Before processing, the system verifies all fields and checks for duplicate products within the request payload.
```javascript
const productNames = order.items.map(item => item.product_name);
const uniqueProductNames = new Set(productNames);
if (uniqueProductNames.size !== productNames.length) { /* return 400 */ }
```

### Transaction Management & Upserting
A dedicated connection is acquired to begin a transaction. The system first checks if the user exists (by email and mobile) to either retrieve their existing ID or insert a new record. Server-side calculations determine the total order amount before inserting the order record. Finally, a bulk insert is performed for optimal efficiency.
```javascript
connection = await pool.getConnection();
await connection.beginTransaction();
// Upsert User, Insert Order, then Bulk Insert Items:

const itemValues = order.items.map(item => [orderId, item.product_name, item.quantity, item.price]);
await connection.query('INSERT INTO order_items (...) VALUES ?', [itemValues]);
await connection.commit();
```
If any query fails, `await connection.rollback();` is executed in the catch block to erase partial data.

## 3. Task 2: Complex Data Extraction API
**Endpoint:** `GET /api/orders/:id` | **File:** `routes/orders.js`

This endpoint prevents the N+1 query problem by extracting all related data across the three tables using a single parameterized SQL `JOIN` query.

### Query & Data Transformation
```sql
SELECT u.user_id, u.full_name, ... o.order_id, ... i.item_id, i.product_name ...
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN order_items i ON o.order_id = i.order_id
WHERE o.order_id = ?
```
Because SQL returns flat tabular data, JavaScript logic transforms the array of rows into a deeply nested JSON object. User and order metadata are extracted from the first row, while the remaining rows are mapped to construct the items array.

## 4. Task 3: User Validation API
**Endpoint:** `POST /api/users/validate` | **File:** `routes/users.js`

This endpoint runs validation logic in isolation without inserting data into the database.

### Joi Schema & Constraint Checks
A Joi schema enforces formatting (e.g., regex for exact 10-digit mobile numbers). Afterwards, the database is queried to ensure uniqueness.
```javascript
const userValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  mobile: Joi.string().pattern(/^\d{10}$/).required(),
  status: Joi.string().valid('Active', 'Inactive').required()
});

// Database constraint check:
const [rows] = await connection.query(
  'SELECT email, mobile FROM users WHERE email = ? OR mobile = ?',
  [email, mobile]
);
```
If duplicates are found, a `409 Conflict` is returned detailing exactly which fields caused the conflict.

## 5. API Testing & Execution Guide (Postman)
This section outlines the step-by-step procedures to verify the functionality of the API endpoints.

### Test 1: User Validation (Success)
- **Action:** Verify Joi validation and uniqueness logic.
- **Configuration:** `POST` request to `http://localhost:3000/api/users/validate`
- **Payload (Raw JSON):**
```json
{
  "email": "johndoe@example.com",
  "mobile": "1234567890",
  "status": "Active"
}
```
- **Result:** `200 OK` (Message: "User data is valid and can be registered.")

### Test 2: Complex Data Insertion
- **Action:** Insert a user, order, and items using a single transaction.
- **Configuration:** `POST` request to `http://localhost:3000/api/orders`
- **Payload (Raw JSON):**
```json
{
  "user": {
    "full_name": "Rahul Sharma",
    "email": "rahul@test.com",
    "mobile": "9876543210"
  },
  "order": {
    "order_date": "2026-07-06",
    "items": [
      { "product_name": "Laptop", "quantity": 1, "price": 55000 },
      { "product_name": "Mouse", "quantity": 2, "price": 700 }
    ]
  }
}
```
- **Result:** `201 Created` showing a calculated `total_amount` of `56400`.
*Note: Executing this exact payload a second time will yield a 409 Conflict or 400 Bad Request, verifying the error handling logic.*

### Test 3: Complex Data Extraction
- **Action:** Retrieve data across all three tables formatted as nested JSON.
- **Configuration:** `GET` request to `http://localhost:3000/api/orders/1`
- **Result:** `200 OK` returning the following formatted object:
```json
{
  "user": {
    "user_id": 1,
    "full_name": "Rahul Sharma",
    "email": "rahul@test.com",
    "mobile": "9876543210",
    "status": "Active"
  },
  "order": {
    "order_id": 1,
    "order_date": "2026-07-05T18:30:00.000Z",
    "total_amount": "56400.00"
  },
  "items": [
    { "item_id": 1, "product_name": "Laptop", "quantity": 1, "price": "55000.00" },
    { "item_id": 2, "product_name": "Mouse", "quantity": 2, "price": "700.00" }
  ]
}
```

## 6. Technical Summary
- No Object Relational Mappers (ORMs) were used; all data modeling was handled natively.
- All database queries utilize parameterized inputs to prevent SQL injection vulnerabilities.
- Connection releasing is rigorously managed inside `finally` blocks for optimal memory and connection limit safety.
