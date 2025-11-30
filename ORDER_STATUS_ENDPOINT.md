# Order Status Update Endpoint Documentation

## Endpoint

**PUT** `/api/v1/order/update-status/:orderId`

Updates the status of an order with comprehensive validation, transition checks, and proper responses.

---

## Authentication

Requires authentication via JWT token in cookies.

**Required Roles:**
- `farmer` (can update orders containing their products)
- `supplier` (can update orders containing their products)
- `admin` (can update any order)

---

## Request

### URL Parameters
- `orderId` (string, required) - The ID of the order to update

### Request Body
```json
{
  "status": "processing"  // Required: one of: pending, confirmed, processing, shipped, delivered, cancelled
}
```

### Valid Status Values
- `pending` - Order placed, waiting for seller confirmation
- `confirmed` - Seller accepted the order
- `processing` - Order is being prepared
- `shipped` - Order has been shipped
- `delivered` - Order has been delivered (buyer must confirm receipt)
- `cancelled` - Order has been cancelled

---

## Status Transition Rules

### Allowed Transitions

| Current Status | Allowed Next Status |
|---------------|---------------------|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `processing`, `cancelled` |
| `processing` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | *(none - buyer must confirm receipt)* |
| `received` | *(none - final status)* |
| `cancelled` | *(none - final status)* |

### Restrictions
- ❌ Cannot update status if dispute is open
- ❌ Cannot reverse status (e.g., `delivered` → `shipped`)
- ❌ Cannot skip statuses (e.g., `confirmed` → `shipped`)
- ❌ Cannot update after `delivered` (buyer must confirm receipt)
- ❌ Cannot update `cancelled` or `received` orders
- ⏱️ Cannot mark as `delivered` immediately after `shipped` (minimum time required)

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Order status updated successfully from \"processing\" to \"shipped\"",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "previousStatus": "processing",
    "currentStatus": "shipped",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "order": {
      "_id": "507f1f77bcf86cd799439011",
      "orderStatus": "shipped",
      "customerId": {
        "_id": "507f191e810c19729de860ea",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": "123 Main St"
      },
      "products": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "productId": {
            "_id": "507f191e810c19729de860eb",
            "name": "Organic Tomatoes",
            "price": 15.99
          },
          "quantity": 2,
          "price": 15.99,
          "status": "shipped",
          "farmerId": {
            "_id": "507f191e810c19729de860ec",
            "name": "Farm Fresh",
            "email": "farm@example.com"
          }
        }
      ],
      "totalPrice": 31.98,
      "shippedAt": "2025-01-15T10:30:00.000Z",
      "expected_delivery_date": "2025-01-22T10:30:00.000Z",
      "paymentInfo": {
        "method": "cash-on-delivery",
        "status": "pending"
      },
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "zipCode": "10001",
        "phoneNumber": "+1234567890"
      },
      "createdAt": "2025-01-10T08:00:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  },
  "metadata": {
    "statusTransition": {
      "from": "processing",
      "to": "shipped",
      "timestamp": "2025-01-15T10:30:00.000Z"
    },
    "authorizedBy": {
      "userId": "507f191e810c19729de860ec",
      "role": "farmer"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Status
```json
{
  "success": false,
  "message": "Invalid status. Must be one of: pending, confirmed, processing, shipped, delivered, cancelled"
}
```

#### 400 Bad Request - Invalid Transition
```json
{
  "success": false,
  "message": "Cannot change status from \"confirmed\" to \"shipped\". Allowed transitions: processing, cancelled"
}
```

#### 400 Bad Request - Dispute Open
```json
{
  "success": false,
  "message": "Cannot update order status while dispute is open. Please resolve the dispute first."
}
```

#### 400 Bad Request - Time Restriction
```json
{
  "success": false,
  "message": "Cannot mark as delivered yet. Please wait 5 more minute(s). Minimum 10 minutes required after shipping."
}
```

#### 403 Forbidden - Unauthorized
```json
{
  "success": false,
  "message": "You don't have permission to update this order status. Only sellers (farmers/suppliers) or admins can update order status."
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Order not found"
}
```

---

## Features

### 1. **Comprehensive Validation**
- Validates status value
- Checks status transition rules
- Verifies user authorization
- Checks for open disputes
- Validates time restrictions

### 2. **Automatic Timestamps**
- Sets `shippedAt` when status changes to `shipped`
- Sets `deliveredAt` when status changes to `delivered`
- Sets `expected_delivery_date` when order is shipped

### 3. **Notifications**
- Sends in-app notification to customer
- Sends email notification to customer
- Logs order status change in history

### 4. **Support for Both Models**
- Works with `OrderMultiVendor` (new model)
- Works with `Order` (legacy model)
- Automatically detects which model to use

### 5. **Structured Response**
- Returns previous and current status
- Includes full order details
- Provides metadata about the transition
- Shows who authorized the change

---

## Example Usage

### Update Order to Processing
```bash
PUT /api/v1/order/update-status/507f1f77bcf86cd799439011
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "processing"
}
```

### Update Order to Shipped
```bash
PUT /api/v1/order/update-status/507f1f77bcf86cd799439011
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "shipped"
}
```

### Update Order to Delivered
```bash
PUT /api/v1/order/update-status/507f1f77bcf86cd799439011
Content-Type: application/json
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "status": "delivered"
}
```

**Note:** For `delivered` status, the order must be in `shipped` status and minimum time must have passed since shipping (configured in `SHIPPED_TO_DELIVERED_MINUTES`).

---

## Related Endpoints

- `PUT /api/v1/order/delivered/:orderId` - Mark order as delivered (with proof of delivery)
- `PUT /api/v1/order/confirm-receipt/:orderId` - Buyer confirms receipt
- `PATCH /api/v1/order/:orderId/product/:productId/status` - Update individual product status (multi-vendor orders)

---

## Notes

1. **Time Validation**: The minimum time between `shipped` and `delivered` is configurable via `SystemConfig` with key `SHIPPED_TO_DELIVERED_MINUTES` (default: 10 minutes for testing).

2. **Dispute Handling**: If a dispute is open or pending admin review, status updates are blocked until the dispute is resolved.

3. **Final Statuses**: Once an order reaches `delivered`, only the buyer can confirm receipt. Once it reaches `received` or `cancelled`, no further status changes are allowed.

4. **Notifications**: Customers receive both in-app notifications and email notifications when order status changes to `shipped` or `delivered`.

5. **Order History**: All status changes are logged in the order history for audit purposes.

