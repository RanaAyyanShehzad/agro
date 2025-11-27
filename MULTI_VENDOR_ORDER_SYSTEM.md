# Multi-Vendor Order System Documentation

## Overview

This is a complete multi-vendor order management system for a marketplace with three user roles: **farmer**, **buyer**, and **supplier**. A single order can contain products from multiple farmers/suppliers, with individual product status tracking and automatic order status calculation.

## File Structure

```
Backend/
├── models/
│   └── orderMultiVendor.js          # Order model with multi-vendor support
├── controllers/
│   └── orderMultiVendor.js         # Order controller functions
├── routes/
│   └── orderMultiVendor.js          # Express routes
├── middlewares/
│   └── orderMiddleware.js           # Authorization middleware
└── utils/
    └── orderHelpers.js              # Helper functions (calculateOrderStatus)
```

## Order Model Structure

### Fields

- **buyerId** (ObjectId, ref: Buyer) - The buyer who placed the order
- **products** (Array) - Array of product items, each containing:
  - `productId` (ObjectId, ref: Products) - Reference to the product
  - `farmerId` (ObjectId, ref: Farmer) - Owner if product is from a farmer
  - `supplierId` (ObjectId, ref: Supplier) - Owner if product is from a supplier
  - `quantity` (Number) - Quantity ordered
  - `price` (Number) - Price at time of order
  - `status` (String) - One of: "processing", "confirmed", "shipped", "delivered", "cancelled"
- **orderStatus** (String) - Auto-calculated order status
- **totalPrice** (Number) - Total order price
- **paymentInfo** (Object) - Payment details
- **shippingAddress** (Object) - Delivery address
- **deliveryInfo** (Object) - Delivery information
- **notes** (String) - Order notes
- **cartId** (ObjectId) - Reference to original cart

### Order Status Calculation

The `orderStatus` is automatically calculated based on product statuses:

- **All products same status** → `orderStatus` = that status
- **Mixed statuses:**
  - If includes "cancelled" → `"partially_cancelled"`
  - If includes "delivered" → `"partially_delivered"`
  - If includes "shipped" → `"partially_shipped"`
  - Otherwise → `"processing"`

## API Endpoints

### 1. PATCH /order/:orderId/product/:productId/status

**Description:** Update the status of a specific product in an order.

**Authentication:** Required

**Authorization:** Only the farmer/supplier who owns the product can update its status.

**Request Body:**
```json
{
  "status": "confirmed"  // One of: "processing", "confirmed", "shipped", "delivered", "cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product status updated successfully",
  "order": {
    "_id": "...",
    "buyerId": { "name": "...", "email": "..." },
    "products": [...],
    "orderStatus": "partially_shipped",
    ...
  }
}
```

**Error Cases:**
- 400: Invalid status or product already cancelled
- 403: User doesn't own the product
- 404: Order or product not found

### 2. PATCH /order/:orderId/cancel

**Description:** Cancel an entire order.

**Authentication:** Required

**Authorization:** Only the buyer who placed the order can cancel.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "order": {
    "_id": "...",
    "orderStatus": "cancelled",
    "products": [
      { "status": "cancelled", ... },
      ...
    ],
    ...
  }
}
```

**Error Cases:**
- 400: Order has shipped or delivered products
- 403: User is not the buyer
- 404: Order not found

### 3. GET /order/:orderId

**Description:** Get complete order details with populated buyer and product information.

**Authentication:** Required

**Authorization:**
- Buyers can only see their own orders
- Farmers/Suppliers can see orders containing their products

**Response:**
```json
{
  "success": true,
  "order": {
    "_id": "...",
    "buyerId": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+923001234567",
      "address": "123 Main St"
    },
    "products": [
      {
        "_id": "...",
        "productId": {
          "_id": "...",
          "name": "Wheat Seeds",
          "price": 1500,
          ...
        },
        "farmerId": {
          "_id": "...",
          "name": "Farmer Name",
          "email": "farmer@example.com"
        },
        "supplierId": null,
        "quantity": 5,
        "price": 1500,
        "status": "confirmed"
      },
      ...
    ],
    "orderStatus": "partially_shipped",
    "totalPrice": 12500,
    ...
  }
}
```

## Helper Functions

### calculateOrderStatus(order)

Calculates the order status based on individual product statuses.

**Location:** `utils/orderHelpers.js`

**Usage:**
```javascript
import { calculateOrderStatus } from "../utils/orderHelpers.js";

const orderStatus = calculateOrderStatus(order);
order.orderStatus = orderStatus;
```

## Middleware

### isProductOwner

Checks if the authenticated user owns a specific product in an order.

**Location:** `middlewares/orderMiddleware.js`

**Usage:**
```javascript
router.patch(
  "/order/:orderId/product/:productId/status",
  isProductOwner,
  updateProductStatus
);
```

### canCancelOrder

Checks if the order can be cancelled by the authenticated buyer.

**Location:** `middlewares/orderMiddleware.js`

**Usage:**
```javascript
router.patch(
  "/order/:orderId/cancel",
  canCancelOrder,
  cancelOrder
);
```

## Password Validation

The password regex has been updated to include all special characters:

**Allowed Special Characters:** `!@#$%^&*()_+-=[]{}|;:'",.<>?/~`

**Regex Pattern:**
```javascript
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~]{8,}$/
```

**Requirements:**
- At least 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character from the allowed set

## Integration

To use this system in your app, add the routes to `app.js`:

```javascript
import orderMultiVendorRoutes from "./routes/orderMultiVendor.js";

app.use("/api/v1", orderMultiVendorRoutes);
```

## Example Usage

### Update Product Status (Farmer/Supplier)

```javascript
// PATCH /api/v1/order/507f1f77bcf86cd799439011/product/507f1f77bcf86cd799439012/status
{
  "status": "shipped"
}
```

### Cancel Order (Buyer)

```javascript
// PATCH /api/v1/order/507f1f77bcf86cd799439011/cancel
```

### Get Order Details

```javascript
// GET /api/v1/order/507f1f77bcf86cd799439011
```

## Status Flow

### Product Status Flow:
1. `processing` → `confirmed` or `cancelled`
2. `confirmed` → `shipped` or `cancelled`
3. `shipped` → `delivered`
4. `delivered` → (final state)
5. `cancelled` → (final state, cannot be updated)

### Order Status Examples:
- All products `processing` → Order: `processing`
- All products `confirmed` → Order: `confirmed`
- Products: `[shipped, confirmed]` → Order: `partially_shipped`
- Products: `[delivered, shipped]` → Order: `partially_delivered`
- Products: `[cancelled, confirmed]` → Order: `partially_cancelled`

## Security Features

1. **Authentication Required:** All endpoints require valid JWT token
2. **Role-Based Authorization:** 
   - Only product owners can update product status
   - Only buyers can cancel their orders
3. **Status Validation:** Cannot update cancelled products
4. **Cancellation Protection:** Cannot cancel orders with shipped/delivered products

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

