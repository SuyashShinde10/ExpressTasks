# Express & MySQL MVC API

This repository contains a modular, production-ready REST API built with Express.js and raw MySQL queries. The project adheres strictly to the MVC (Model-View-Controller) / Layered Architecture pattern, ensuring scalability, maintainability, and clean separation of concerns.

## Features & Tasks Completed
- **Task 1: Complex Data Insertion:** A robust `POST /api/orders` endpoint that utilizes MySQL Transactions to insert a user, an order, and multiple bulk order items while ensuring atomic database states and preventing duplicate products.
- **Task 2: Complex Data Extraction:** A highly optimized `GET /api/orders/:id` endpoint that solves the N+1 problem by retrieving data across three tables using a single `JOIN` query, parsing the flat tabular data into deeply nested JSON.
- **Task 3: User Validation:** A `POST /api/users/validate` endpoint featuring custom Express middlewares and Joi schemas for rigorous format checking (email, 10-digit mobile, exact enum matches) and database conflict resolution.

## Project Structure
The codebase has been refactored into an industry-standard layered architecture:
```text
express-mysql-api/
├── src/                    
│   ├── config/             # DB connection pool & schema initialization
│   ├── controllers/        # Request handling and HTTP response formulation
│   ├── middlewares/        # Custom middlewares (e.g., Joi payload validation)
│   ├── models/             # Pure MySQL queries (parameterized to prevent injection)
│   ├── routes/             # Endpoint definitions mapped to controllers
│   ├── services/           # Complex business logic and database transactions
│   ├── utils/              # Helper utilities and Joi validation schemas
│   └── app.js              # Express app configuration
├── docs/                   # Detailed architectural documentation & Postman guides
├── .env                    # Environment variables
└── server.js               # Main entry point
```

## Documentation
For a deep dive into the architectural decisions, code explanations, and Postman testing payloads, please refer to the markdown files inside the `/docs/` folder:
- [Master Documentation](./docs/MASTER_DOCUMENTATION.md) - Full explanation of the MVC setup and implementation logic.
- [Postman Testing Guide](./docs/POSTMAN_TESTING_GUIDE.md) - Exact payloads to test the API locally.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory (you can copy `.env.example` if available) and provide your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=express_demo
   PORT=3000
   ```

3. **Start the Server**
   ```bash
   npm run dev
   # or
   node server.js
   ```
   *Note: On startup, the `src/config/database.js` script will automatically create the database and necessary tables if they don't already exist.*
