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
