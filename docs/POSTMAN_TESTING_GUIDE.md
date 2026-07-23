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
