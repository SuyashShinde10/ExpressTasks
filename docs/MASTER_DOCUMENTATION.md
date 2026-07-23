# Express & MySQL API - Modular MVC Architecture

This document outlines the step-by-step process and the architectural decisions behind building the Express.js API project using raw MySQL queries.

## 1. Project Initialization & Layered Setup

To ensure the application is scalable, testable, and production-ready, we migrated from a basic flat structure to a robust **Layered (MVC) Architecture**.

### The Ideal Folder Structure
```text
express-mysql-api/
├── src/                    # Source code container
│   ├── config/             # Environment and database configuration
│   ├── controllers/        # Express route handlers (business logic)
│   ├── middlewares/        # Custom middlewares (Joi validation)
│   ├── models/             # Encapsulates raw MySQL queries
│   ├── routes/             # API route definitions
│   ├── services/           # Reusable business logic (complex transactions)
│   ├── utils/              # Utility classes and schemas
│   └── app.js              # Express app setup (without server starting)
├── docs/                   # Documentation files
├── .env                    # Environment variables
├── package.json
└── server.js               # Entry point (starts the server)
```

## 2. Database Connection (`src/config/database.js`)
We use `mysql2/promise` to manage connections via a connection pool. 
We also maintain an `initializeDatabase` script here that executes raw `CREATE TABLE IF NOT EXISTS` queries on application startup to ensure schema integrity without relying on ORMs.

## 3. Creating the Server Entry Point
- **`src/app.js`**: Responsible only for Express app configuration and mounting routes (`/api/orders`, `/api/users`).
- **`server.js`**: The pure entry point. It imports `app.js` and `database.js`, initializes the database, and starts listening on the defined `PORT`.

## 4. Implementing Task 1: Complex Data Insertion
**Endpoint:** `POST /api/orders`

This task requires writing to three different tables as a single transaction. We structured this using our modular design:
- **Route (`src/routes/orders.routes.js`)**: Maps the POST request to the controller.
- **Controller (`src/controllers/order.controller.js`)**: Verifies required fields are present and ensures there are no duplicate products in the request payload.
- **Service (`src/services/order.service.js`)**: Handles the complex MySQL transaction (`BEGIN`, `COMMIT`, `ROLLBACK`). It calculates the total order amount on the backend and coordinates interactions between `UserModel` and `OrderModel`.
- **Models (`src/models/user.model.js` & `order.model.js`)**: Perform the actual `INSERT` and `SELECT` raw queries against the database, fully parameterized to prevent SQL injection.

## 5. Implementing Task 2: Complex Data Extraction
**Endpoint:** `GET /api/orders/:id`

To avoid the N+1 query problem, we extract data across three tables using a single `JOIN` query.
- **Controller (`src/controllers/order.controller.js`)**: Receives the `id` param and asks the `OrderModel` for the data.
- **Model (`src/models/order.model.js`)**: Executes the raw `JOIN` query.
- **Data Transformation (Controller)**: Since SQL returns flat tabular data, the controller contains the logic to map this flat array into a deeply nested JSON object requested by the client (separating `user`, `order`, and mapping the `items` array).

## 6. Implementing Task 3: User Validation API
**Endpoint:** `POST /api/users/validate`

- **Middleware Validation (`src/middlewares/validate.js`)**: A generic reusable Express middleware that intercepts requests and runs them against a Joi schema.
- **Schemas (`src/utils/validationSchemas.js`)**: Defines the strict `userValidationSchema` (validating email format, exact 10-digit mobile, and strict 'Active' status).
- **Controller (`src/controllers/user.controller.js`)**: If middleware validation passes, the controller uses the `UserModel` to query the database. It then determines exactly what triggered the conflict (email, mobile, or both) and returns a `409 Conflict`, or a `200 OK` if the data is pristine.

## Final Review
- **Separation of Concerns**: By separating Routes, Controllers, Services, and Models, the codebase is highly reusable and scalable.
- **No ORMs**: All logic relies entirely on optimized raw SQL queries.
- **Safety**: SQL parameters (`?`) prevent injection, and transactions ensure atomic database writes. Connection releasing is rigorously managed across all services and models.
