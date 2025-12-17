# BUYER CONFIRM ORDER ENDPOINT

## Base URL
- **Order Routes**: `/api/v1/order`

All endpoints require authentication (JWT token in cookies).

---

## 🟢 BUYER CONFIRM ORDER RECEIPT

### Endpoint
**`PUT /api/v1/order/confirm-receipt/:orderId`**

**Description**: Buyer confirms receipt of a delivered order. This updates the order status to "received" and payment status to "complete". Sellers are notified when the buyer confirms receipt.

**Authorization**: Buyer or Farmer (as buyer) only

**URL Parameters**:
- `orderId` (required): Order ID (must be valid MongoDB ObjectId)

**Request Body**: None required

**Example Request**:
```
PUT /api/v1/order/confirm-receipt/692b605f913be2c38bcfe308
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Order receipt confirmed successfully",
  "order": {
    "_id": "692b605f913be2c38bcfe308",
    "orderStatus": "received",
    "customerId": "69293fdf4fbb23e04c7dc009",
    "customerModel": "Buyer",
    "products": [
      {
        "_id": "product_item_id",
        "productId": {
          "_id": "product_id",
          "name": "Organic Tomatoes",
          "price": 100,
          "images": ["url1", "url2"]
        },
        "farmerId": "69293fe24fbb23e04c7dc00f",
        "quantity": 2,
        "price": 100,
        "status": "received"
      }
    ],
    "totalPrice": 200,
    "payment_status": "complete",
    "paymentInfo": {
      "method": "card",
      "status": "completed",
      "paidAt": "2025-01-29T12:00:00.000Z"
    },
    "dispute_status": "none",
    "shippedAt": "2025-01-29T10:00:00.000Z",
    "deliveredAt": "2025-01-29T11:00:00.000Z",
    "receivedAt": "2025-01-29T12:00:00.000Z",
    "createdAt": "2025-01-29T08:00:00.000Z",
    "updatedAt": "2025-01-29T12:00:00.000Z"
  }
}
```

**Error Responses**:

1. **403 Forbidden - Not a buyer**:
```json
{
  "success": false,
  "message": "Only buyers can confirm receipt"
}
```

2. **404 Not Found - Order not found**:
```json
{
  "success": false,
  "message": "Order not found"
}
```

3. **403 Forbidden - Order doesn't belong to buyer**:
```json
{
  "success": false,
  "message": "This order does not belong to you"
}
```

4. **400 Bad Request - Order not in delivered status**:
```json
{
  "success": false,
  "message": "Cannot confirm receipt. Order status is \"processing\". Order must be in \"delivered\" status."
}
```

5. **400 Bad Request - Dispute is open**:
```json
{
  "success": false,
  "message": "Cannot confirm receipt while dispute is open. Please resolve the dispute first."
}
```

---

## 📋 WHAT HAPPENS WHEN BUYER CONFIRMS ORDER

1. **Order Status Update**:
   - Order status changes from `"delivered"` → `"received"`
   - `receivedAt` timestamp is set to current time

2. **Payment Status Update**:
   - Payment status changes from `"pending"` → `"complete"`
   - `paymentInfo.status` changes to `"completed"`
   - `paymentInfo.paidAt` timestamp is set

3. **Seller Notification**:
   - All sellers (farmers/suppliers) who have products in the order receive:
     - Email notification
     - In-app notification
     - Notification type: `"order_received"`

4. **Order History Logged**:
   - Order status change is logged in `OrderHistory` collection
   - Log includes: who made the change, old status, new status, timestamp

---

## 🔄 ORDER STATUS FLOW

```
pending → confirmed → processing → shipped → delivered → received ✅
                                                      ↓
                                                 (auto-confirm after time)
```

**Note**: If buyer doesn't confirm within the configured time (`DELIVERED_TO_RECEIVED_MINUTES`), the order is automatically confirmed by the system.

---

## ⚠️ IMPORTANT NOTES

1. **Order Must Be Delivered**: 
   - Buyer can only confirm receipt if order status is `"delivered"`
   - Cannot confirm if order is still `"pending"`, `"confirmed"`, `"processing"`, or `"shipped"`

2. **No Open Disputes**:
   - Buyer cannot confirm receipt if there's an open dispute (`dispute_status: "open"` or `"pending_admin_review"`)
   - Must resolve dispute first

3. **Ownership Verification**:
   - Only the buyer who placed the order can confirm receipt
   - System verifies `customerId` (or `userId` for old orders) matches authenticated user

4. **Automatic Confirmation**:
   - If buyer doesn't confirm within configured time, system auto-confirms
   - See `jobs/orderAutoConfirmation.js` for auto-confirmation logic

5. **Payment Completion**:
   - Once confirmed, payment status becomes `"complete"`
   - Sellers receive payment (theoretically, as payment integration is not implemented)

---

## 📝 FRONTEND IMPLEMENTATION EXAMPLE

```javascript
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";

// Confirm order receipt
const confirmOrderReceipt = async (orderId) => {
  try {
    const response = await axios.put(
      `${API_BASE}/order/confirm-receipt/${orderId}`,
      {}, // No body required
      { withCredentials: true }
    );

    if (response.data.success) {
      console.log("Order confirmed successfully:", response.data.order);
      // Update UI, show success message, etc.
      return response.data.order;
    }
  } catch (error) {
    console.error("Error confirming order:", error.response?.data?.message);
    // Handle error (show error message to user)
    throw error;
  }
};

// Usage
await confirmOrderReceipt("692b605f913be2c38bcfe308");
```

---

## 🔗 RELATED ENDPOINTS

- **Get Order Details**: `GET /api/v1/order/item/:orderId`
- **Create Dispute**: `POST /api/v1/order/dispute/:orderId` (if order not received as expected)
- **Get All Orders**: `GET /api/v1/order/user-orders`

---

## ✅ TESTING CHECKLIST

- [ ] Buyer can confirm receipt of delivered order
- [ ] Order status updates to "received"
- [ ] Payment status updates to "complete"
- [ ] Sellers receive notification
- [ ] Cannot confirm if order is not in "delivered" status
- [ ] Cannot confirm if dispute is open
- [ ] Cannot confirm someone else's order
- [ ] Only buyers/farmers can confirm (not suppliers)

