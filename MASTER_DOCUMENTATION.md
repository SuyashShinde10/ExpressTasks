# Express & MySQL API Build Guide

This document outlines the step-by-step process of building the complex Express.js API project using raw MySQL queries.

## 1. Project Initialization & Setup

The first step was to initialize a Node.js project and install the necessary dependencies:

- **express**: To handle routing and server logic.
- **mysql2**: To handle communication with the MySQL database. We specifically use `mysql2/promise` to allow for clean `async/await` syntax.
- **joi**: For robust data validation in the user API endpoint.

```powershell
mkdir express-mysql-api
cd express-mysql-api
npm init -y
npm install express mysql2 joi
```

## 2. Database Connection and Schema Initialization

We created a `database.js` file to establish a connection pool to the MySQL database. Using a connection pool ensures efficient resource management by reusing active connections rather than creating new ones on every request. 

We also defined a startup function `initializeDatabase` that executes raw SQL commands to create the `express_demo` database and the three required tables if they don't already exist:
1. `users`: Stores user details, ensuring email and mobile uniqueness.
2. `orders`: Stores the order metadata and a foreign key to the `users` table.
3. `order_items`: Stores the specific items belonging to an order and a foreign key to the `orders` table.

## 3. Creating the Server Entry Point

We created `server.js` to act as the main entry point for the application. Here, we set up our Express app and mounted our route handlers for `/api/orders` and `/api/users`. Before starting the server, we call the `initializeDatabase()` function so that the application is guaranteed to have a ready schema before it accepts requests.

## 4. Implementing Task 1: Complex Data Insertion

In `routes/orders.js`, we implemented the `POST /api/orders` endpoint.

This endpoint receives a complex JSON payload and relies heavily on MySQL transactions to ensure data consistency.

- **Validation**: We verify all fields are present and that there are no duplicate products in the array provided by the client.
- **Transaction Start**: We acquire a dedicated connection from the pool and start the transaction (`BEGIN`).
- **Upserting User**: We query the database to see if the user already exists using their email and mobile. If they do, we grab their existing ID. If they don't, we insert them and get the new ID.
- **Calculating Totals**: We calculate the order total on the server side instead of trusting client data.
- **Inserting Orders & Items**: We insert the order record, then we construct a bulk insertion query for the `order_items` table.
- **Commit or Rollback**: If everything succeeds, we commit the transaction to make changes permanent and explicitly return the newly created `order_id` along with the order summary. If any single query fails, we rollback the entire transaction to avoid partial data inserts. Finally, we release the connection back to the pool in a `finally` block.

## 5. Implementing Task 2: Complex Data Extraction

In the same `routes/orders.js` file, we added the `GET /api/orders/:id` endpoint.

To avoid the N+1 query problem, we wrote a single SQL query using `JOIN` statements to retrieve the `users`, `orders`, and `order_items` row data all at once.

Since SQL returns a flat tabular result where user and order details are repeated for every item, we implemented JavaScript logic to transform this flat array into a deeply nested JSON object. We take the user and order properties from the first row and construct an array out of the remaining item-specific columns.

## 6. Implementing Task 3: User Validation API

In `routes/users.js`, we implemented the `POST /api/users/validate` endpoint to handle data validation without actual insertion.

- **Format Rules**: We built a Joi schema to validate the incoming request, strictly checking for valid email formatting and ensuring the mobile number was exactly 10 digits using Regex. We also verified the status was "Active".
- **Database Rules**: We queried the database to check if the provided email or mobile number already exists to avoid future conflicts.
- **Error Handling**: We returned specific error messages in the HTTP response. A `400 Bad Request` was used for formatting or status errors, and a `409 Conflict` was used when duplicates were found in the database.

## Final Review
- No Object Relational Mappers (ORMs) were used.
- All database queries were fully parameterized to prevent SQL injection.
- Connection releasing is rigorously managed inside `finally` blocks for optimal memory and connection limit safety.


---

# API Code Explanation by Task

This document breaks down how the Express.js API fulfills each requested task, focusing on the specific code implementations.

## Global Requirements

### Database Connection (`database.js`)
We use `mysql2/promise` to allow modern `async/await` syntax instead of callbacks. 
- **Connection Pool**: `mysql.createPool(...)` manages multiple concurrent connections efficiently. We use the `dotenv` package to securely load credentials from the `.env` file instead of hardcoding them.
- **Initialization Script**: The `initializeDatabase` function runs immediately when the server starts. It ensures all three tables (`users`, `orders`, `order_items`) exist before the API accepts any traffic. It uses raw `CREATE TABLE IF NOT EXISTS` queries without relying on an ORM.

---

## Task 1: Complex Data Insertion API
**Endpoint:** `POST /api/orders`
**File:** `routes/orders.js`

This is the most complex part of the application because it requires writing to three different tables and must succeed or fail as a single unit (a transaction).

### 1. Validation
We first verify all incoming JSON fields exist. 
```javascript
const productNames = order.items.map(item => item.product_name);
const uniqueProductNames = new Set(productNames);
if (uniqueProductNames.size !== productNames.length) { ... }
```
This specific block extracts all the product names from the incoming array and places them in a `Set`. Since a Set cannot contain duplicates, if the size of the Set is smaller than the original array, we immediately know there was a duplicate product and we reject the request with a `400` error.

### 2. Transaction Management
```javascript
connection = await pool.getConnection();
await connection.beginTransaction();
// ... execute queries
await connection.commit();
```
We request a single, dedicated connection from the pool and start a transaction. If any query inside the `try` block fails, the code jumps to the `catch` block and runs `await connection.rollback();`, which completely erases any partial data that was inserted.

### 3. Upserting the User
```javascript
const [existingUsers] = await connection.query(
    'SELECT user_id FROM users WHERE email = ? AND mobile = ?', [user.email, user.mobile]
);
```
We check if the user exists. If `existingUsers.length > 0`, we grab their ID and use it. If not, we run an `INSERT` statement and grab the new `insertId` generated by MySQL.

### 4. Server-Side Calculation & Insertion
We loop through the array on the backend to multiply `quantity * price` and determine the `totalAmount`. We then insert the order and explicitly return the `order_id` back to the client.
Finally, we execute a "bulk insert" for the items:
```javascript
const itemValues = order.items.map(item => [orderId, item.product_name, item.quantity, item.price]);
await connection.query('INSERT INTO order_items (...) VALUES ?', [itemValues]);
```
This allows us to insert 100 items into the database with a single query, which is extremely efficient.

---

## Task 2: Complex Data Extraction API
**Endpoint:** `GET /api/orders/:id`
**File:** `routes/orders.js`

This endpoint extracts all the data across the three tables using a single query to prevent the N+1 performance problem.

### 1. The SQL JOIN
```sql
SELECT u.user_id, u.full_name, ... o.order_id, o.order_date, ... i.item_id, i.product_name ...
FROM orders o
JOIN users u ON o.user_id = u.user_id
JOIN order_items i ON o.order_id = i.order_id
WHERE o.order_id = ?
```
This raw query combines the relevant rows from all three tables wherever the foreign keys match.

### 2. Data Transformation
SQL databases can only return "flat" grids of data. If an order has 3 items, the SQL query returns 3 rows where the user and order data is identical, and only the item data changes.

To turn this back into the requested deeply nested JSON, we map over the array:
```javascript
const result = {
    user: { user_id: rows[0].user_id, ... }, // Take user data from the first row
    order: { order_id: rows[0].order_id, ... }, // Take order data from the first row
    items: rows.map(row => ({ // Loop through all rows to extract the items
        item_id: row.item_id,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price
    }))
};
```

---

## Task 3: User Validation API
**Endpoint:** `POST /api/users/validate`
**File:** `routes/users.js`

This API endpoint runs validation logic in isolation without actually inserting the user into the database.

### 1. Joi Schema Validation
```javascript
const userValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    mobile: Joi.string().pattern(/^\d{10}$/).required(),
    status: Joi.string().valid('Active').required() // Strictly enforces 'Active' status
});
```
We use the `Joi` library to enforce formatting rules. `Joi.string().email()` handles complex email regex validation automatically, while `.pattern(/^\d{10}$/)` ensures the mobile string contains exactly 10 numeric digits. By using `.valid('Active')`, the API automatically rejects "Inactive" inputs as requested.

### 2. Database Constraint Checks
Even if the formatting is correct, we must ensure the data doesn't violate database uniqueness rules.
```javascript
const [rows] = await connection.query(
    'SELECT email, mobile FROM users WHERE email = ? OR mobile = ?', [email, mobile]
);
```
We query the database. If any rows are returned, we loop through them to determine exactly *what* triggered the conflict (was it the email, the mobile, or both?) and return those specific details in a `409 Conflict` HTTP response.


---

# Postman Testing Guide

Follow these exact steps to test the Express API endpoints using Postman. Ensure your Node server is running (`node server.js`) before starting.

---

## Task 1: Complex Data Insertion API
This task inserts an order, calculates the total, and handles duplicate products.

1. Open Postman and click **New > HTTP Request**.
2. Set the method to **POST**.
3. Set the URL to: `http://localhost:3000/api/orders`
4. Go to the **Body** tab, select **raw**, and choose **JSON**.
5. Paste this payload:
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
      {
        "product_name": "Laptop",
        "quantity": 1,
        "price": 55000
      },
      {
        "product_name": "Mouse",
        "quantity": 2,
        "price": 700
      }
    ]
  }
}
```
6. Click **Send**. 
**Expected Result:** You should get a `201 Created` response showing the calculated `total_amount` of `56400` and the new `order_id` (which will be `1`).

*(Note: If you click Send a second time, it will fail with a `409 Conflict` or a duplicate product error, proving our error handling and transaction rollbacks work!)*

---

## Task 2: Complex Data Extraction API
This task pulls data across 3 tables using a JOIN and formats it into nested JSON.

1. Open a new request tab in Postman.
2. Set the method to **GET**.
3. Set the URL to: `http://localhost:3000/api/orders/1`
4. Click **Send**. *(No body is required for GET requests).*
**Expected Result:** You should get a `200 OK` response that shows the nested JSON correctly formatted:
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
    {
      "item_id": 1,
      "product_name": "Laptop",
      "quantity": 1,
      "price": "55000.00"
    },
    {
      "item_id": 2,
      "product_name": "Mouse",
      "quantity": 2,
      "price": "700.00"
    }
  ]
}
```

---

## Task 3: User Validation API
This task verifies format requirements and strict status checks without inserting data.

1. Open Postman and click **New > HTTP Request**.
2. Set the method to **POST**.
3. Set the URL to: `http://localhost:3000/api/users/validate`
4. Go to the **Body** tab, select **raw**, and choose **JSON**.
5. Paste this payload:
```json
{
  "email": "testuser@example.com",
  "mobile": "1234567890",
  "status": "Active"
}
```
6. Click **Send**. 
**Expected Result:** You should get a `200 OK` response: `{"message": "User data is valid and can be registered."}`

*(Note: If you change the status to "Inactive", or make the mobile number 9 digits, it will instantly return a `400 Bad Request` with meaningful error messages).*

