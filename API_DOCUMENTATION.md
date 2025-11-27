# Order API Documentation

## 1. GET /api/v1/order/supplier-orders

**Description:** Returns all orders that contain products owned by the authenticated supplier/farmer, including customer information.

**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <token>
Cookie: token=<token>
```

**Request:**
- Method: `GET`
- Endpoint: `/api/v1/order/supplier-orders`
- Query Parameters: None

**Response Structure:**

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 2,
  "orders": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f191e810c19729de860ea",
      "userRole": "buyer",
      "products": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "productId": {
            "_id": "507f1f77bcf86cd799439013",
            "name": "Wheat Seeds",
            "description": "High quality wheat seeds for winter season",
            "price": 1500,
            "unit": "kg",
            "quantity": 100,
            "category": "Seeds",
            "isAvailable": true,
            "images": [
              "https://example.com/image1.jpg",
              "https://example.com/image2.jpg"
            ],
            "upLoadedBy": {
              "userID": "507f191e810c19729de860eb",
              "role": "supplier",
              "uploaderName": "John Supplier"
            },
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          },
          "quantity": 5
        },
        {
          "_id": "507f1f77bcf86cd799439014",
          "productId": {
            "_id": "507f1f77bcf86cd799439015",
            "name": "Organic Fertilizer",
            "description": "Premium organic fertilizer for better crop yield",
            "price": 2500,
            "unit": "bag",
            "quantity": 50,
            "category": "Fertilizers",
            "isAvailable": true,
            "images": [
              "https://example.com/fertilizer1.jpg"
            ],
            "upLoadedBy": {
              "userID": "507f191e810c19729de860eb",
              "role": "supplier",
              "uploaderName": "John Supplier"
            },
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          },
          "quantity": 2
        }
      ],
      "totalPrice": 12500,
      "status": "pending",
      "paymentInfo": {
        "method": "easypaisa",
        "status": "pending",
        "transactionId": null,
        "paidAt": null
      },
      "shippingAddress": {
        "street": "123 Main Street",
        "city": "Lahore",
        "zipCode": "54000",
        "phoneNumber": "+923001234567"
      },
      "deliveryInfo": {
        "estimatedDeliveryDate": null,
        "actualDeliveryDate": null,
        "notes": null
      },
      "notes": "Please deliver in the morning",
      "cartId": "507f1f77bcf86cd799439016",
      "createdAt": "2024-01-20T08:00:00.000Z",
      "updatedAt": "2024-01-20T08:00:00.000Z",
      "customer": {
        "name": "Ahmed Khan",
        "email": "ahmed.khan@example.com",
        "phone": "+923001234567"
      }
    },
    {
      "_id": "507f1f77bcf86cd799439017",
      "userId": "507f191e810c19729de860ec",
      "userRole": "farmer",
      "products": [
        {
          "_id": "507f1f77bcf86cd799439018",
          "productId": {
            "_id": "507f1f77bcf86cd799439019",
            "name": "Pesticide Spray",
            "description": "Effective pesticide for crop protection",
            "price": 800,
            "unit": "bottle",
            "quantity": 200,
            "category": "Pesticides",
            "isAvailable": true,
            "images": [
              "https://example.com/pesticide1.jpg"
            ],
            "upLoadedBy": {
              "userID": "507f191e810c19729de860eb",
              "role": "supplier",
              "uploaderName": "John Supplier"
            },
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          },
          "quantity": 3
        }
      ],
      "totalPrice": 2400,
      "status": "processing",
      "paymentInfo": {
        "method": "cash-on-delivery",
        "status": "pending",
        "transactionId": null,
        "paidAt": null
      },
      "shippingAddress": {
        "street": "456 Farm Road",
        "city": "Faisalabad",
        "zipCode": "38000",
        "phoneNumber": "+923009876543"
      },
      "deliveryInfo": {
        "estimatedDeliveryDate": "2024-01-25T00:00:00.000Z",
        "actualDeliveryDate": null,
        "notes": null
      },
      "notes": null,
      "cartId": "507f1f77bcf86cd799439020",
      "createdAt": "2024-01-19T14:30:00.000Z",
      "updatedAt": "2024-01-20T09:15:00.000Z",
      "customer": {
        "name": "Fatima Ali",
        "email": "fatima.ali@example.com",
        "phone": "+923009876543"
      }
    }
  ]
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication token missing"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "No orders found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 2. GET /api/v1/order/item/:orderId

**Description:** Returns a specific order with customer details. For suppliers/farmers, it only shows products they own in that order and includes customer information. For buyers/farmers (customers), it shows their complete order.

**Authentication:** Required (Bearer Token)

**Headers:**
```
Authorization: Bearer <token>
Cookie: token=<token>
```

**Request:**
- Method: `GET`
- Endpoint: `/api/v1/order/item/:orderId`
- Path Parameters:
  - `orderId` (string, required): The ID of the order to retrieve

**Response Structure:**

### Success Response for Supplier/Farmer (200 OK)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "userRole": "buyer",
    "products": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "productId": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Wheat Seeds",
          "description": "High quality wheat seeds for winter season",
          "price": 1500,
          "unit": "kg",
          "quantity": 100,
          "category": "Seeds",
          "isAvailable": true,
          "images": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
          ],
          "upLoadedBy": {
            "userID": "507f191e810c19729de860eb",
            "role": "supplier",
            "uploaderName": "John Supplier"
          },
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "quantity": 5
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "productId": {
          "_id": "507f1f77bcf86cd799439015",
          "name": "Organic Fertilizer",
          "description": "Premium organic fertilizer for better crop yield",
          "price": 2500,
          "unit": "bag",
          "quantity": 50,
          "category": "Fertilizers",
          "isAvailable": true,
          "images": [
            "https://example.com/fertilizer1.jpg"
          ],
          "upLoadedBy": {
            "userID": "507f191e810c19729de860eb",
            "role": "supplier",
            "uploaderName": "John Supplier"
          },
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "quantity": 2
      }
    ],
    "totalPrice": 12500,
    "status": "pending",
    "paymentInfo": {
      "method": "easypaisa",
      "status": "pending",
      "transactionId": null,
      "paidAt": null
    },
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Lahore",
      "zipCode": "54000",
      "phoneNumber": "+923001234567"
    },
    "deliveryInfo": {
      "estimatedDeliveryDate": null,
      "actualDeliveryDate": null,
      "notes": null
    },
    "notes": "Please deliver in the morning",
    "cartId": "507f1f77bcf86cd799439016",
    "createdAt": "2024-01-20T08:00:00.000Z",
    "updatedAt": "2024-01-20T08:00:00.000Z",
    "customer": {
      "name": "Ahmed Khan",
      "email": "ahmed.khan@example.com",
      "phone": "+923001234567",
      "address": "123 Main Street, Lahore, 54000"
    }
  }
}
```

### Success Response for Buyer/Farmer (Customer) (200 OK)

```json
{
  "success": true,
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "userRole": "buyer",
    "products": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "productId": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "Wheat Seeds",
          "description": "High quality wheat seeds for winter season",
          "price": 1500,
          "unit": "kg",
          "quantity": 100,
          "category": "Seeds",
          "isAvailable": true,
          "images": [
            "https://example.com/image1.jpg",
            "https://example.com/image2.jpg"
          ],
          "upLoadedBy": {
            "userID": "507f191e810c19729de860eb",
            "role": "supplier",
            "uploaderName": "John Supplier"
          },
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "quantity": 5
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "productId": {
          "_id": "507f1f77bcf86cd799439021",
          "name": "Rice Seeds",
          "description": "Premium rice seeds",
          "price": 1200,
          "unit": "kg",
          "quantity": 80,
          "category": "Seeds",
          "isAvailable": true,
          "images": [
            "https://example.com/rice1.jpg"
          ],
          "upLoadedBy": {
            "userID": "507f191e810c19729de860ed",
            "role": "farmer",
            "uploaderName": "Ali Farmer"
          },
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "quantity": 3
      }
    ],
    "totalPrice": 11100,
    "status": "pending",
    "paymentInfo": {
      "method": "easypaisa",
      "status": "pending",
      "transactionId": null,
      "paidAt": null
    },
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "Lahore",
      "zipCode": "54000",
      "phoneNumber": "+923001234567"
    },
    "deliveryInfo": {
      "estimatedDeliveryDate": null,
      "actualDeliveryDate": null,
      "notes": null
    },
    "notes": "Please deliver in the morning",
    "cartId": "507f1f77bcf86cd799439016",
    "createdAt": "2024-01-20T08:00:00.000Z",
    "updatedAt": "2024-01-20T08:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid order ID format"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication token missing"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "You don't have permission to access this order"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Order not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Response Field Descriptions

### Order Object
- `_id` (string): Unique order identifier
- `userId` (string): ID of the customer who placed the order
- `userRole` (string): Role of the customer - "buyer" or "farmer"
- `products` (array): Array of products in the order
  - `_id` (string): Product order item ID
  - `productId` (object): Full product details
    - `_id` (string): Product ID
    - `name` (string): Product name
    - `description` (string): Product description
    - `price` (number): Product price per unit
    - `unit` (string): Unit of measurement (kg, bag, bottle, etc.)
    - `quantity` (number): Available stock quantity
    - `category` (string): Product category
    - `isAvailable` (boolean): Product availability status
    - `images` (array): Array of product image URLs
    - `upLoadedBy` (object): Information about who uploaded the product
      - `userID` (string): ID of the supplier/farmer
      - `role` (string): Role - "supplier" or "farmer"
      - `uploaderName` (string): Name of the uploader
    - `createdAt` (string): Product creation timestamp (ISO 8601)
    - `updatedAt` (string): Product last update timestamp (ISO 8601)
  - `quantity` (number): Quantity ordered
- `totalPrice` (number): Total price for the order (for suppliers, only their products)
- `status` (string): Order status - "pending", "processing", "shipped", "delivered", "canceled"
- `paymentInfo` (object): Payment information
  - `method` (string): Payment method - "easypaisa", "cash-on-delivery", "jazzcash"
  - `status` (string): Payment status - "pending", "completed", "failed", "refunded"
  - `transactionId` (string|null): Transaction ID if payment is completed
  - `paidAt` (string|null): Payment timestamp (ISO 8601) if paid
- `shippingAddress` (object): Delivery address
  - `street` (string): Street address
  - `city` (string): City name
  - `zipCode` (string): Postal/ZIP code
  - `phoneNumber` (string): Contact phone number
- `deliveryInfo` (object): Delivery information
  - `estimatedDeliveryDate` (string|null): Estimated delivery date (ISO 8601)
  - `actualDeliveryDate` (string|null): Actual delivery date (ISO 8601)
  - `notes` (string|null): Delivery notes
- `notes` (string|null): Order notes/special instructions
- `cartId` (string): Reference to original cart (if applicable)
- `createdAt` (string): Order creation timestamp (ISO 8601)
- `updatedAt` (string): Order last update timestamp (ISO 8601)
- `customer` (object|null): Customer information (only for suppliers/farmers)
  - `name` (string): Customer name
  - `email` (string): Customer email
  - `phone` (string): Customer phone number
  - `address` (string): Customer address (only in getOrderById for suppliers)

---

## Important Notes

1. **For Suppliers/Farmers:**
   - `getSupplierOrders` returns all orders containing their products
   - `getOrderById` returns only their products in that order
   - `totalPrice` is calculated only for their products
   - Customer information is included in both endpoints

2. **For Buyers/Farmers (Customers):**
   - `getOrderById` returns their complete order with all products
   - Customer information is not included (they are the customer)

3. **Order Status:**
   - Orders with status "canceled" cannot have their status updated by suppliers/farmers
   - Only buyers/farmers can cancel their own orders (when status is "pending" or "processing")

4. **Authentication:**
   - Both endpoints require valid authentication token
   - Token should be sent in cookies or Authorization header

5. **Filtering:**
   - `getSupplierOrders` automatically filters to show only orders containing the supplier's products
   - Empty orders (no matching products) are excluded from results

