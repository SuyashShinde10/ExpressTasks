# Postman Testing Guide

Follow these exact steps to test the Express API endpoints using Postman. Ensure your Node server is running (`node server.js`) before starting.

---

## Test 1: User Validation (Task 3)
Let's verify the Joi validation logic works.

1. Open Postman and click **New > HTTP Request**.
2. Set the method to **POST**.
3. Set the URL to: `http://localhost:3000/api/users/validate`
4. Go to the **Body** tab.
5. Select **raw** and choose **JSON** from the dropdown on the right.
6. Paste this payload:
```json
{
  "email": "testuser@example.com",
  "mobile": "1234567890",
  "status": "Active"
}
```
7. Click **Send**. 
**Expected Result:** You should get a `200 OK` response: `{"message": "User data is valid and can be registered."}`

---

## Test 2: Complex Data Insertion (Task 1)
Now let's actually insert a user, an order, and items all at once using our database transaction.

1. Open a new request tab in Postman.
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

*(Note: If you click Send a second time, it will fail with a `409 Conflict` or a duplicate product error, which proves our error handling works!)*

---

## Test 3: Complex Data Extraction (Task 2)
Finally, let's pull that exact data back out of the database and ensure it formats perfectly into nested JSON.

1. Open a new request tab in Postman.
2. Set the method to **GET**.
3. Set the URL to: `http://localhost:3000/api/orders/1`
4. Click **Send**. *(No body is required for GET requests).*
**Expected Result:** You should get a `200 OK` response that shows the user, order, and items formatted flawlessly like this:

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
