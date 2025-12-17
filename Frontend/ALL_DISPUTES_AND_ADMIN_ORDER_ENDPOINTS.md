# ALL DISPUTES ENDPOINTS & ADMIN ORDER STATUS UPDATE

## Base URLs
- **Order Routes**: `/api/v1/order`
- **Admin Routes**: `/api/v1/admin`

All endpoints require authentication (JWT token in cookies).

---

## 🔵 BUYER DISPUTES ENDPOINTS

### 1. Get All Buyer Disputes
**Endpoint**: `GET /api/v1/order/disputes/buyer`

**Description**: Buyer retrieves all disputes they have created, with optional filtering and pagination.

**Authorization**: Buyer or Farmer (as buyer) only

**Query Parameters**:
- `status` (optional): Filter by status - `"open"` | `"pending_admin_review"` | `"closed"`
- `disputeType` (optional): Filter by type - `"non_delivery"` | `"product_fault"` | `"wrong_item"` | `"other"`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request**:
```
GET /api/v1/order/disputes/buyer?status=open&page=1&limit=10
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "total": 3,
  "page": 1,
  "totalPages": 1,
  "disputes": [
    {
      "_id": "692b148b3d3116503dc6f961",
      "orderId": {
        "_id": "69293fdf4fbb23e04c7dc009",
        "orderStatus": "delivered",
        "customerId": {
          "_id": "69293fdf4fbb23e04c7dc009",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "1234567890"
        },
        "products": [
          {
            "_id": "product_item_id",
            "productId": {
              "_id": "product_id",
              "name": "Organic Tomatoes",
              "price": 100,
              "images": ["url1", "url2"]
            },
            "farmerId": {
              "_id": "farmer_id",
              "name": "Farmer Smith",
              "email": "farmer@example.com"
            },
            "quantity": 2,
            "price": 100,
            "status": "delivered"
          }
        ],
        "totalPrice": 200,
        "dispute_status": "open",
        "payment_status": "pending",
        "createdAt": "2025-01-29T08:00:00.000Z"
      },
      "buyerId": "69293fdf4fbb23e04c7dc009",
      "sellerId": {
        "_id": "69293fe24fbb23e04c7dc00f",
        "name": "Farmer Smith",
        "email": "farmer@example.com",
        "phone": "0987654321"
      },
      "sellerRole": "farmer",
      "disputeType": "product_fault",
      "reason": "Product was damaged during delivery",
      "buyerProof": {
        "images": ["https://example.com/damaged-product.jpg"],
        "description": "Product received in damaged condition",
        "uploadedAt": "2025-01-29T10:00:00.000Z"
      },
      "sellerResponse": {
        "evidence": ["https://example.com/packaging-proof.jpg"],
        "proposal": "I will provide a full refund and replacement product within 3 days.",
        "respondedAt": "2025-01-29T11:00:00.000Z"
      },
      "status": "open",
      "buyerAccepted": false,
      "adminRuling": {
        "decision": null,
        "notes": null,
        "ruledAt": null,
        "adminId": null
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T11:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Buyer Dispute by ID
**Endpoint**: `GET /api/v1/order/dispute/buyer/:disputeId`

**Description**: Buyer retrieves detailed information about a specific dispute they created.

**Authorization**: Buyer or Farmer (as buyer) only

**URL Parameters**:
- `disputeId` (required): Dispute ID (must be valid 24-character MongoDB ObjectId)

**Example Request**:
```
GET /api/v1/order/dispute/buyer/692b148b3d3116503dc6f961
```

**Response** (200 OK):
```json
{
  "success": true,
  "dispute": {
    "_id": "692b148b3d3116503dc6f961",
    "orderId": {
      "_id": "69293fdf4fbb23e04c7dc009",
      "orderStatus": "delivered",
      "customerId": {
        "_id": "69293fdf4fbb23e04c7dc009",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "address": "123 Main St"
      },
      "products": [
        {
          "_id": "product_item_id",
          "productId": {
            "_id": "product_id",
            "name": "Organic Tomatoes",
            "price": 100,
            "images": ["url1", "url2"]
          },
          "farmerId": {
            "_id": "farmer_id",
            "name": "Farmer Smith",
            "email": "farmer@example.com",
            "phone": "0987654321"
          },
          "quantity": 2,
          "price": 100,
          "status": "delivered"
        }
      ],
      "totalPrice": 200,
      "shippingAddress": {
        "street": "123 Main St",
        "city": "City",
        "zipCode": "12345",
        "phoneNumber": "1234567890"
      },
      "dispute_status": "open",
      "payment_status": "pending",
      "createdAt": "2025-01-29T08:00:00.000Z"
    },
    "buyerId": "69293fdf4fbb23e04c7dc009",
    "sellerId": {
      "_id": "69293fe24fbb23e04c7dc00f",
      "name": "Farmer Smith",
      "email": "farmer@example.com",
      "phone": "0987654321",
      "address": "456 Farm Road"
    },
    "sellerRole": "farmer",
    "disputeType": "product_fault",
    "reason": "Product was damaged during delivery",
    "buyerProof": {
      "images": ["https://example.com/damaged-product.jpg"],
      "description": "Product received in damaged condition",
      "uploadedAt": "2025-01-29T10:00:00.000Z"
    },
    "sellerResponse": {
      "evidence": ["https://example.com/packaging-proof.jpg"],
      "proposal": "I will provide a full refund and replacement product within 3 days.",
      "respondedAt": "2025-01-29T11:00:00.000Z"
    },
    "status": "open",
    "buyerAccepted": false,
    "adminRuling": {
      "decision": null,
      "notes": null,
      "ruledAt": null,
      "adminId": null
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T11:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Invalid dispute ID format
- `401`: Not authenticated
- `403`: Not authorized (not buyer) or "Dispute not found or access denied"
- `404`: Dispute not found

---

## 🟢 SELLER DISPUTES ENDPOINTS (Farmer/Supplier)

### 3. Get All Seller Disputes
**Endpoint**: `GET /api/v1/order/disputes`

**Description**: Seller (farmer/supplier) retrieves all disputes where they are the seller, with optional filtering and pagination.

**Authorization**: Farmer or Supplier only

**Query Parameters**:
- `status` (optional): Filter by status - `"open"` | `"pending_admin_review"` | `"closed"`
- `disputeType` (optional): Filter by type - `"non_delivery"` | `"product_fault"` | `"wrong_item"` | `"other"`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request**:
```
GET /api/v1/order/disputes?status=open&page=1&limit=10
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "disputes": [
    {
      "_id": "692b148b3d3116503dc6f961",
      "orderId": {
        "_id": "69293fdf4fbb23e04c7dc009",
        "orderStatus": "delivered",
        "customerId": {
          "_id": "69293fdf4fbb23e04c7dc009",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "1234567890"
        },
        "products": [
          {
            "_id": "product_item_id",
            "productId": {
              "_id": "product_id",
              "name": "Organic Tomatoes",
              "price": 100,
              "images": ["url1", "url2"]
            },
            "farmerId": {
              "_id": "farmer_id",
              "name": "Farmer Smith",
              "email": "farmer@example.com"
            },
            "quantity": 2,
            "price": 100,
            "status": "delivered"
          }
        ],
        "totalPrice": 200,
        "dispute_status": "open",
        "payment_status": "pending",
        "createdAt": "2025-01-29T08:00:00.000Z"
      },
      "buyerId": {
        "_id": "69293fdf4fbb23e04c7dc009",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
      },
      "sellerId": "69293fe24fbb23e04c7dc00f",
      "sellerRole": "farmer",
      "disputeType": "product_fault",
      "reason": "Product was damaged during delivery",
      "buyerProof": {
        "images": ["https://example.com/damaged-product.jpg"],
        "description": "Product received in damaged condition",
        "uploadedAt": "2025-01-29T10:00:00.000Z"
      },
      "sellerResponse": {
        "evidence": [],
        "proposal": null,
        "respondedAt": null
      },
      "status": "open",
      "buyerAccepted": false,
      "adminRuling": {
        "decision": null,
        "notes": null,
        "ruledAt": null,
        "adminId": null
      },
      "createdAt": "2025-01-29T10:00:00.000Z",
      "updatedAt": "2025-01-29T10:00:00.000Z"
    }
  ]
}
```

---

### 4. Get Seller Dispute by ID
**Endpoint**: `GET /api/v1/order/dispute/:disputeId`

**Description**: Seller retrieves detailed information about a specific dispute where they are the seller.

**Authorization**: Farmer or Supplier only

**URL Parameters**:
- `disputeId` (required): Dispute ID (must be valid 24-character MongoDB ObjectId)

**Example Request**:
```
GET /api/v1/order/dispute/692b148b3d3116503dc6f961
```

**Response** (200 OK):
```json
{
  "success": true,
  "dispute": {
    "_id": "692b148b3d3116503dc6f961",
    "orderId": {
      "_id": "69293fdf4fbb23e04c7dc009",
      "orderStatus": "delivered",
      "customerId": {
        "_id": "69293fdf4fbb23e04c7dc009",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "address": "123 Main St"
      },
      "products": [
        {
          "_id": "product_item_id",
          "productId": {
            "_id": "product_id",
            "name": "Organic Tomatoes",
            "price": 100,
            "images": ["url1", "url2"]
          },
          "farmerId": {
            "_id": "farmer_id",
            "name": "Farmer Smith",
            "email": "farmer@example.com",
            "phone": "0987654321"
          },
          "quantity": 2,
          "price": 100,
          "status": "delivered"
        }
      ],
      "totalPrice": 200,
      "shippingAddress": {
        "street": "123 Main St",
        "city": "City",
        "zipCode": "12345",
        "phoneNumber": "1234567890"
      },
      "dispute_status": "open",
      "payment_status": "pending",
      "createdAt": "2025-01-29T08:00:00.000Z"
    },
    "buyerId": {
      "_id": "69293fdf4fbb23e04c7dc009",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "1234567890",
      "address": "123 Main St"
    },
    "sellerId": "69293fe24fbb23e04c7dc00f",
    "sellerRole": "farmer",
    "disputeType": "product_fault",
    "reason": "Product was damaged during delivery",
    "buyerProof": {
      "images": ["https://example.com/damaged-product.jpg"],
      "description": "Product received in damaged condition",
      "uploadedAt": "2025-01-29T10:00:00.000Z"
    },
    "sellerResponse": {
      "evidence": [],
      "proposal": null,
      "respondedAt": null
    },
    "status": "open",
    "buyerAccepted": false,
    "adminRuling": {
      "decision": null,
      "notes": null,
      "ruledAt": null,
      "adminId": null
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Invalid dispute ID format
- `401`: Not authenticated
- `403`: Not authorized (not seller) or "Dispute not found or access denied"
- `404`: Dispute not found

---

## 🔴 ADMIN ORDER STATUS UPDATE ENDPOINT

### 5. Admin Change Order Status
**Endpoint**: `PUT /api/v1/admin/orders/:orderId/status`

**Description**: Admin can override and change the status of any order. This bypasses normal order workflow restrictions. Customer is notified of the status change.

**Authorization**: Admin only

**URL Parameters**:
- `orderId` (required): Order ID (must be valid MongoDB ObjectId)

**Request Body**:
```json
{
  "status": "delivered",  // Required: New order status
  "reason": "Admin override due to shipping delay"  // Optional: Reason for status change
}
```

**Valid Status Values**:
- For `OrderMultiVendor`: `"processing"`, `"confirmed"`, `"shipped"`, `"delivered"`, `"received"`, `"cancelled"`
- For `Order` (old model): `"pending"`, `"processing"`, `"shipped"`, `"delivered"`, `"received"`, `"canceled"`

**Example Request**:
```json
PUT /api/v1/admin/orders/692b605f913be2c38bcfe308/status
{
  "status": "delivered",
  "reason": "Admin override: Order was delivered but status was not updated by seller"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Order status changed successfully",
  "order": {
    "_id": "692b605f913be2c38bcfe308",
    "orderStatus": "delivered",
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
        "status": "delivered"
      }
    ],
    "totalPrice": 200,
    "payment_status": "pending",
    "dispute_status": "none",
    "shippedAt": "2025-01-29T10:00:00.000Z",
    "deliveredAt": "2025-01-29T12:00:00.000Z",
    "createdAt": "2025-01-29T08:00:00.000Z",
    "updatedAt": "2025-01-29T12:00:00.000Z"
  }
}
```

**Error Responses**:

1. **400 Bad Request - Status required**:
```json
{
  "success": false,
  "message": "Status is required"
}
```

2. **400 Bad Request - Invalid status**:
```json
{
  "success": false,
  "message": "Invalid status. Valid statuses: processing, confirmed, shipped, delivered, received, cancelled"
}
```

3. **404 Not Found - Order not found**:
```json
{
  "success": false,
  "message": "Order not found"
}
```

4. **401 Unauthorized - Not authenticated**:
```json
{
  "success": false,
  "message": "Login First"
}
```

5. **403 Forbidden - Not admin**:
```json
{
  "success": false,
  "message": "Only admin can access this endpoint"
}
```

---

## 📋 WHAT HAPPENS WHEN ADMIN CHANGES ORDER STATUS

1. **Order Status Update**:
   - Order status is updated to the new value
   - Timestamps are automatically set:
     - If status is `"shipped"`: `shippedAt` is set
     - If status is `"delivered"`: `deliveredAt` is set
     - If status is `"received"`: `receivedAt` is set

2. **Order History Logged**:
   - Status change is logged in `OrderHistory` collection
   - Log includes:
     - Who made the change (admin ID and name)
     - Old status
     - New status
     - Reason (if provided)
     - Timestamp

3. **Audit Log Created**:
   - Admin action is logged in `AuditLog` collection
   - Log includes:
     - Admin ID and name
     - Action type: `"order_status_changed"`
     - Entity type: `"order"`
     - Entity ID
     - Details: old status, new status, reason

4. **Customer Notification**:
   - Customer (buyer/farmer) receives:
     - Email notification
     - In-app notification
     - Notification type: `"order_status_changed"`
     - Priority: `"high"`
     - Message includes the new status and reason (if provided)

---

## ⚠️ IMPORTANT NOTES

### For Disputes:
1. **Buyer Endpoints**:
   - Only buyers and farmers (as buyers) can access
   - Returns disputes where `buyerId` matches authenticated user
   - Includes full order details and seller information

2. **Seller Endpoints**:
   - Only farmers and suppliers can access
   - Returns disputes where `sellerId` and `sellerRole` match authenticated user
   - Includes full order details and buyer information

3. **Order Information**:
   - All dispute responses include fully populated `orderId` with:
     - Customer information
     - Product details
     - Seller information (farmer/supplier)
     - Order status and payment status
     - Shipping address

### For Admin Order Status Update:
1. **Admin Override**:
   - Admin can change order status regardless of current status
   - No workflow restrictions apply
   - Can bypass normal order flow

2. **Status Validation**:
   - Status must be valid for the order model type
   - Different models have slightly different valid statuses

3. **Automatic Timestamps**:
   - System automatically sets relevant timestamps based on status
   - No need to manually set `shippedAt`, `deliveredAt`, or `receivedAt`

4. **Notifications**:
   - Customer always receives notification of status change
   - Notification includes reason if provided

---

## 📝 FRONTEND IMPLEMENTATION EXAMPLES

### Get Buyer Disputes:
```javascript
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";

// Get all buyer disputes
const getBuyerDisputes = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.disputeType) params.append("disputeType", filters.disputeType);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await axios.get(
      `${API_BASE}/order/disputes/buyer?${params.toString()}`,
      { withCredentials: true }
    );

    return response.data.disputes;
  } catch (error) {
    console.error("Error fetching disputes:", error);
    throw error;
  }
};
```

### Get Seller Disputes:
```javascript
// Get all seller disputes (farmer/supplier)
const getSellerDisputes = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.disputeType) params.append("disputeType", filters.disputeType);
    if (filters.page) params.append("page", filters.page);
    if (filters.limit) params.append("limit", filters.limit);

    const response = await axios.get(
      `${API_BASE}/order/disputes?${params.toString()}`,
      { withCredentials: true }
    );

    return response.data.disputes;
  } catch (error) {
    console.error("Error fetching disputes:", error);
    throw error;
  }
};
```

### Admin Update Order Status:
```javascript
// Admin change order status
const adminChangeOrderStatus = async (orderId, status, reason = null) => {
  try {
    const response = await axios.put(
      `${API_BASE}/admin/orders/${orderId}/status`,
      {
        status,
        reason
      },
      { withCredentials: true }
    );

    if (response.data.success) {
      console.log("Order status updated:", response.data.order);
      return response.data.order;
    }
  } catch (error) {
    console.error("Error updating order status:", error.response?.data?.message);
    throw error;
  }
};
```

---

## 🔗 RELATED ENDPOINTS

### Disputes:
- **Create Dispute**: `POST /api/v1/order/dispute/:orderId`
- **Respond to Dispute** (Seller): `PUT /api/v1/order/dispute/:disputeId/respond`
- **Resolve Dispute** (Buyer): `PUT /api/v1/order/dispute/:disputeId/resolve`
- **Admin Ruling**: `PUT /api/v1/order/dispute/:disputeId/admin-ruling`

### Orders:
- **Get Order Details**: `GET /api/v1/order/item/:orderId`
- **Get All Orders**: `GET /api/v1/order/user-orders`
- **Admin Get All Orders**: `GET /api/v1/admin/orders`
- **Admin Get Order by ID**: `GET /api/v1/admin/orders/:orderId`

---

## ✅ TESTING CHECKLIST

### Disputes:
- [ ] Buyer can get all their disputes
- [ ] Buyer can get specific dispute by ID
- [ ] Seller (farmer) can get all their disputes
- [ ] Seller (supplier) can get all their disputes
- [ ] Seller can get specific dispute by ID
- [ ] Disputes include full order information
- [ ] Disputes include buyer/seller information
- [ ] Filtering by status works
- [ ] Filtering by disputeType works
- [ ] Pagination works correctly

### Admin Order Status:
- [ ] Admin can change order status
- [ ] Status validation works
- [ ] Timestamps are set automatically
- [ ] Order history is logged
- [ ] Audit log is created
- [ ] Customer receives notification
- [ ] Reason is included in notification (if provided)
- [ ] Cannot change status if not admin

