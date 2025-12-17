# SELLER DISPUTE RESPONSE & NOTIFICATIONS ENDPOINTS

## Base URLs
- **Order Routes**: `/api/v1/order`
- **Notification Routes**: `/api/notifications`

All endpoints require authentication (JWT token in cookies).

---

## 📋 WHERE TO GET disputeId AND orderId

### For Sellers:

**Get All Disputes** (Recommended):
```
GET /api/v1/order/disputes
```
- Returns all disputes where seller is involved
- Each dispute object contains:
  - `_id` → This is the **disputeId**
  - `orderId` → This is the **orderId** (populated with order details)

**Get Specific Dispute**:
```
GET /api/v1/order/dispute/:disputeId
```
- Use disputeId from the disputes list
- Returns full dispute details with populated orderId

**From Notifications**:
- Notification `relatedId` field contains the disputeId
- Notification `relatedType` will be `"dispute"`

### Example Usage:

```javascript
// Step 1: Get all disputes
const response = await axios.get(
  `${API_BASE}/order/disputes`,
  { withCredentials: true }
);

// Response: { success: true, disputes: [...] }
// Each dispute has: { _id: "disputeId", orderId: {...} }

// Step 2: Use disputeId to respond
const disputeId = response.data.disputes[0]._id;
await axios.put(
  `${API_BASE}/order/dispute/${disputeId}/respond`,
  { evidence: [...], proposal: "..." },
  { withCredentials: true }
);
```

---

---

## 🟢 SELLER DISPUTE RESPONSE ENDPOINT

### Respond to Dispute
**Endpoint**: `PUT /api/v1/order/dispute/:disputeId/respond`

**Description**: Seller (farmer/supplier) responds to a dispute opened by a buyer with evidence and a resolution proposal.

**Authorization**: Farmer or Supplier only

**URL Parameters**:
- `disputeId` (required): Dispute ID (must be valid 24-character MongoDB ObjectId)

**Request Body**:
```json
{
  "evidence": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/document.pdf"
  ],  // Required: Array of image/document URLs (at least 1 item)
  "proposal": "I will provide a full refund and replacement product within 3 days."  // Required: String (max 2000 chars) - Seller's resolution proposal
}
```

**Example Request**:
```json
PUT /api/v1/order/dispute/692b148b3d3116503dc6f961/respond
{
  "evidence": [
    "https://storage.example.com/proof/delivery-receipt.jpg",
    "https://storage.example.com/proof/packaging-photo.jpg"
  ],
  "proposal": "I understand the issue. I will provide a full refund of $100 and send a replacement product free of charge. The replacement will be shipped within 2 business days."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dispute response submitted successfully",
  "dispute": {
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
      "evidence": [
        "https://storage.example.com/proof/delivery-receipt.jpg",
        "https://storage.example.com/proof/packaging-photo.jpg"
      ],
      "proposal": "I understand the issue. I will provide a full refund of $100 and send a replacement product free of charge. The replacement will be shipped within 2 business days.",
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
- `400`: 
  - Invalid dispute ID format
  - Dispute not open for response
  - Evidence missing or empty array
  - Proposal missing or empty
- `401`: Not authenticated
- `403`: 
  - Not authorized (not seller)
  - Dispute does not belong to seller
- `404`: Dispute not found

**Validation Rules**:
- `evidence` must be an array with at least 1 URL string
- `proposal` must be a non-empty string (max 2000 characters)
- Dispute must be in `"open"` status
- Seller must own the dispute (sellerId and sellerRole must match)

**Notes**:
- Buyer receives email notification when seller responds
- Buyer receives in-app notification
- Dispute remains in `"open"` status after seller response
- Buyer can then accept or reject the proposal

---

## 🔔 NOTIFICATION ENDPOINTS

### 1. Get All Notifications
**Endpoint**: `GET /api/notifications`

**Description**: Retrieve all notifications for the authenticated user with optional filtering and pagination.

**Authorization**: All authenticated users (buyer, farmer, supplier, admin)

**Query Parameters**:
- `isRead` (optional): Filter by read status - `"true"` | `"false"` (as string)
- `limit` (optional): Number of notifications per page (default: 50)
- `page` (optional): Page number (default: 1)

**Example Request 1 - Get All Notifications**:
```
GET /api/notifications
```

**Example Request 2 - Get Unread Notifications Only**:
```
GET /api/notifications?isRead=false
```

**Example Request 3 - Get Read Notifications with Pagination**:
```
GET /api/notifications?isRead=true&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notification_id_1",
        "userId": "69293fdf4fbb23e04c7dc009",
        "userRole": "buyer",
        "type": "order_shipped",
        "title": "Order Shipped",
        "message": "Your order #69293fdf4fbb23e04c7dc009 has been shipped and is on its way.",
        "relatedId": "order_id",
        "relatedType": "order",
        "actionUrl": "/orders/order_id",
        "isRead": false,
        "priority": "medium",
        "createdAt": "2025-01-29T10:00:00.000Z",
        "readAt": null
      },
      {
        "_id": "notification_id_2",
        "userId": "69293fdf4fbb23e04c7dc009",
        "userRole": "buyer",
        "type": "dispute_opened",
        "title": "Dispute Opened",
        "message": "A dispute has been opened for order #order_id. Please respond within 10 minutes.",
        "relatedId": "dispute_id",
        "relatedType": "dispute",
        "actionUrl": "/disputes/dispute_id",
        "isRead": true,
        "priority": "high",
        "createdAt": "2025-01-29T09:00:00.000Z",
        "readAt": "2025-01-29T09:05:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalNotifications": 125,
      "unreadCount": 45,
      "hasMore": true
    }
  }
}
```

**Notification Types**:
- `order_placed`: New order received
- `order_accepted`: Order accepted by seller
- `order_rejected`: Order rejected by seller
- `order_shipped`: Order has been shipped
- `order_delivered`: Order has been delivered
- `order_received`: Order confirmed as received
- `dispute_opened`: Dispute opened by buyer
- `dispute_response`: Seller responded to dispute
- `dispute_escalated`: Dispute escalated to admin
- `dispute_resolved`: Dispute resolved
- `account_suspended`: Account suspended
- `account_activated`: Account activated

**Priority Levels**:
- `low`: General notifications
- `medium`: Important notifications (order updates)
- `high`: Urgent notifications (disputes, account issues)

**Error Responses**:
- `401`: Not authenticated

---

### 2. Mark Notification as Read
**Endpoint**: `PATCH /api/notifications/:notificationId/read`

**Description**: Mark a specific notification as read.

**Authorization**: All authenticated users

**URL Parameters**:
- `notificationId` (required): Notification ID

**Request Body**: None

**Example Request**:
```
PATCH /api/notifications/692b148b3d3116503dc6f961/read
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": {
    "_id": "692b148b3d3116503dc6f961",
    "userId": "69293fdf4fbb23e04c7dc009",
    "userRole": "buyer",
    "type": "order_shipped",
    "title": "Order Shipped",
    "message": "Your order #69293fdf4fbb23e04c7dc009 has been shipped.",
    "relatedId": "order_id",
    "relatedType": "order",
    "actionUrl": "/orders/order_id",
    "isRead": true,
    "priority": "medium",
    "createdAt": "2025-01-29T10:00:00.000Z",
    "readAt": "2025-01-29T11:00:00.000Z"
  }
}
```

**Error Responses**:
- `401`: Not authenticated
- `404`: Notification not found or access denied (user doesn't own the notification)

---

### 3. Mark All Notifications as Read
**Endpoint**: `PATCH /api/notifications/read-all`

**Description**: Mark all unread notifications for the authenticated user as read.

**Authorization**: All authenticated users

**Request Body**: None

**Example Request**:
```
PATCH /api/notifications/read-all
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "data": {
    "modifiedCount": 15
  }
}
```

**Error Responses**:
- `401`: Not authenticated

---

### 4. Delete Notification
**Endpoint**: `DELETE /api/notifications/:notificationId`

**Description**: Delete a specific notification.

**Authorization**: All authenticated users

**URL Parameters**:
- `notificationId` (required): Notification ID

**Request Body**: None

**Example Request**:
```
DELETE /api/notifications/692b148b3d3116503dc6f961
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

**Error Responses**:
- `401`: Not authenticated
- `404`: Notification not found or access denied (user doesn't own the notification)

---

## 📋 SUMMARY

### Seller Dispute Response
| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/v1/order/dispute/:disputeId/respond` | Seller responds to dispute |

### Notification Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications (with filters) |
| PATCH | `/api/notifications/:notificationId/read` | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:notificationId` | Delete notification |

---

## 🔔 NOTES

1. **Dispute Response**:
   - Seller must respond within configured time (default: 10 minutes)
   - If seller doesn't respond, dispute auto-escalates to admin
   - Evidence must be at least 1 URL (can be images or documents)
   - Proposal is required and should clearly state the resolution offer

2. **Notifications**:
   - Notifications are role-specific (users only see their own notifications)
   - Unread count is included in pagination response
   - Notifications can be filtered by read status
   - Deleting a notification permanently removes it

3. **Authentication**:
   - All endpoints require valid JWT token in cookies
   - User role is automatically determined from token
   - Users can only access their own notifications

