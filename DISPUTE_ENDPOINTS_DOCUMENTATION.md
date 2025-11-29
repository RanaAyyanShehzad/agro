# DISPUTE ENDPOINTS DOCUMENTATION

## Base URLs
- **Order Routes**: `/api/v1/order`
- **Admin Routes**: `/api/v1/admin`

All endpoints require authentication (JWT token in cookies).

---

## 🔵 BUYER ENDPOINTS

### 1. Create Dispute
**Endpoint**: `POST /api/v1/order/dispute/:orderId`

**Description**: Buyer creates a dispute for an order that is shipped, delivered, or received (within time limit).

**Authorization**: Buyer or Farmer (buyer role)

**Request Body**:
```json
{
  "disputeType": "non_delivery" | "product_fault" | "wrong_item" | "other",
  "reason": "String (required, max 1000 chars)",
  "proofOfFault": {
    "images": ["url1", "url2"],  // Array of image URLs
    "description": "String (optional, max 2000 chars)"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Dispute created successfully",
  "dispute": {
    "_id": "dispute_id",
    "orderId": "order_id",
    "buyerId": "buyer_id",
    "sellerId": "seller_id",
    "sellerRole": "farmer" | "supplier",
    "disputeType": "non_delivery" | "product_fault" | "wrong_item" | "other",
    "reason": "Dispute reason",
    "buyerProof": {
      "images": ["url1", "url2"],
      "description": "Proof description",
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
- `400`: Order not in valid status, dispute already exists, time limit exceeded
- `403`: Not authorized (not buyer or order doesn't belong to buyer)
- `404`: Order not found

---

### 2. Resolve Dispute (Accept/Reject Seller's Proposal)
**Endpoint**: `PUT /api/v1/order/dispute/:disputeId/resolve`

**Description**: Buyer accepts or rejects seller's proposal. If rejected, dispute escalates to admin.

**Authorization**: Buyer or Farmer (buyer role)

**Request Body**:
```json
{
  "action": "accept" | "reject"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dispute resolved successfully" | "Dispute escalated to admin successfully",
  "dispute": {
    "_id": "dispute_id",
    "orderId": {
      "_id": "order_id",
      "orderStatus": "delivered" | "received",
      "customerId": {
        "_id": "customer_id",
        "name": "Customer Name",
        "email": "customer@email.com",
        "phone": "1234567890"
      },
      "products": [...],
      "dispute_status": "closed" | "pending_admin_review",
      "payment_status": "complete" | "pending",
      ...
    },
    "buyerId": {
      "_id": "buyer_id",
      "name": "Buyer Name",
      "email": "buyer@email.com",
      "phone": "1234567890"
    },
    "sellerId": {
      "_id": "seller_id",
      "name": "Seller Name",
      "email": "seller@email.com",
      "phone": "1234567890"
    },
    "status": "closed" | "pending_admin_review",
    "buyerAccepted": true | false,
    "resolvedAt": "2025-01-29T10:00:00.000Z",
    "sellerResponse": {
      "evidence": ["url1", "url2"],
      "proposal": "Seller's proposal text",
      "respondedAt": "2025-01-29T09:00:00.000Z"
    },
    ...
  }
}
```

**Error Responses**:
- `400`: Dispute not open, seller hasn't responded, invalid action
- `403`: Not authorized (not buyer or dispute doesn't belong to buyer)
- `404`: Dispute not found

---

## 🟢 SELLER ENDPOINTS

### 3. Respond to Dispute
**Endpoint**: `PUT /api/v1/order/dispute/:disputeId/respond`

**Description**: Seller responds to a dispute with evidence and a proposal.

**Authorization**: Farmer or Supplier (seller role)

**Request Body**:
```json
{
  "evidence": ["url1", "url2"],  // Array of image/document URLs (required, at least 1)
  "proposal": "String (required, max 2000 chars)"  // Seller's resolution proposal
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dispute response submitted successfully",
  "dispute": {
    "_id": "dispute_id",
    "orderId": {
      "_id": "order_id",
      "orderStatus": "delivered" | "received",
      "customerId": {...},
      "products": [...],
      ...
    },
    "buyerId": {...},
    "sellerId": {...},
    "status": "open",
    "sellerResponse": {
      "evidence": ["url1", "url2"],
      "proposal": "Seller's proposal text",
      "respondedAt": "2025-01-29T10:00:00.000Z"
    },
    ...
  }
}
```

**Error Responses**:
- `400`: Dispute not open, evidence/proposal missing, invalid format
- `403`: Not authorized (not seller or dispute doesn't belong to seller)
- `404`: Dispute not found

---

## 🔴 ADMIN ENDPOINTS

### 4. Get All Disputes
**Endpoint**: `GET /api/v1/admin/disputes`

**Description**: Admin retrieves all disputes with optional filtering and pagination.

**Authorization**: Admin only

**Query Parameters**:
- `status` (optional): Filter by status - `"open"` | `"pending_admin_review"` | `"closed"`
- `disputeType` (optional): Filter by type - `"non_delivery"` | `"product_fault"` | `"wrong_item"` | `"other"`
- `startDate` (optional): Filter disputes created after this date (ISO format)
- `endDate` (optional): Filter disputes created before this date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request**:
```
GET /api/v1/admin/disputes?status=open&page=1&limit=20
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 2,
  "total": 15,
  "page": 1,
  "totalPages": 1,
  "disputes": [
    {
      "_id": "dispute_id",
      "orderId": {
        "_id": "order_id",
        "orderStatus": "delivered",
        "customerId": {
          "_id": "customer_id",
          "name": "Customer Name",
          "email": "customer@email.com",
          "phone": "1234567890"
        },
        "products": [
          {
            "_id": "product_item_id",
            "productId": {
              "_id": "product_id",
              "name": "Product Name",
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
        "createdAt": "2025-01-29T08:00:00.000Z",
        ...
      },
      "buyerId": {
        "_id": "buyer_id",
        "name": "Buyer Name",
        "email": "buyer@email.com",
        "phone": "1234567890"
      },
      "sellerId": {
        "_id": "seller_id",
        "name": "Seller Name",
        "email": "seller@email.com",
        "phone": "1234567890"
      },
      "sellerRole": "farmer" | "supplier",
      "disputeType": "product_fault",
      "reason": "Product was damaged",
      "buyerProof": {
        "images": ["url1", "url2"],
        "description": "Product received damaged",
        "uploadedAt": "2025-01-29T09:00:00.000Z"
      },
      "sellerResponse": {
        "evidence": ["url1"],
        "proposal": "Will provide replacement",
        "respondedAt": "2025-01-29T10:00:00.000Z"
      },
      "status": "open" | "pending_admin_review" | "closed",
      "buyerAccepted": false,
      "adminRuling": {
        "decision": null | "buyer_win" | "seller_win",
        "notes": null | "Admin notes",
        "ruledAt": null | "2025-01-29T11:00:00.000Z",
        "adminId": null | {
          "_id": "admin_id",
          "name": "Admin Name",
          "email": "admin@email.com"
        }
      },
      "resolvedAt": null | "2025-01-29T11:00:00.000Z",
      "createdAt": "2025-01-29T09:00:00.000Z",
      "updatedAt": "2025-01-29T10:00:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Not authorized (not admin)

---

### 5. Get Dispute by ID
**Endpoint**: `GET /api/v1/admin/disputes/:disputeId`

**Description**: Admin retrieves detailed information about a specific dispute.

**Authorization**: Admin only

**Response** (200 OK):
```json
{
  "success": true,
  "dispute": {
    "_id": "dispute_id",
    "orderId": {
      "_id": "order_id",
      "orderStatus": "delivered",
      "customerId": {
        "_id": "customer_id",
        "name": "Customer Name",
        "email": "customer@email.com",
        "phone": "1234567890",
        "address": "Customer Address"
      },
      "products": [
        {
          "_id": "product_item_id",
          "productId": {
            "_id": "product_id",
            "name": "Product Name",
            "price": 100,
            "images": ["url1", "url2"]
          },
          "farmerId": {
            "_id": "farmer_id",
            "name": "Farmer Name",
            "email": "farmer@email.com",
            "phone": "1234567890"
          } | null,
          "supplierId": {
            "_id": "supplier_id",
            "name": "Supplier Name",
            "email": "supplier@email.com",
            "phone": "1234567890"
          } | null,
          "quantity": 2,
          "price": 100,
          "status": "delivered"
        }
      ],
      "totalPrice": 200,
      "shippingAddress": {...},
      "dispute_status": "open",
      "payment_status": "pending",
      "proofOfDelivery": {...},
      "proofOfFault": {...},
      "createdAt": "2025-01-29T08:00:00.000Z",
      ...
    },
    "buyerId": {
      "_id": "buyer_id",
      "name": "Buyer Name",
      "email": "buyer@email.com",
      "phone": "1234567890",
      "address": "Buyer Address"
    },
    "sellerId": {
      "_id": "seller_id",
      "name": "Seller Name",
      "email": "seller@email.com",
      "phone": "1234567890",
      "address": "Seller Address"
    },
    "sellerRole": "farmer" | "supplier",
    "disputeType": "product_fault",
    "reason": "Product was damaged",
    "buyerProof": {
      "images": ["url1", "url2"],
      "description": "Product received damaged",
      "uploadedAt": "2025-01-29T09:00:00.000Z"
    },
    "sellerResponse": {
      "evidence": ["url1"],
      "proposal": "Will provide replacement",
      "respondedAt": "2025-01-29T10:00:00.000Z"
    },
    "status": "pending_admin_review",
    "buyerAccepted": false,
    "adminRuling": {
      "decision": null | "buyer_win" | "seller_win",
      "notes": null | "Admin notes",
      "ruledAt": null | "2025-01-29T11:00:00.000Z",
      "adminId": null | {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@email.com"
      }
    },
    "resolvedAt": null | "2025-01-29T11:00:00.000Z",
    "createdAt": "2025-01-29T09:00:00.000Z",
    "updatedAt": "2025-01-29T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `404`: Dispute not found

---

### 6. Admin Ruling on Dispute
**Endpoint**: `PUT /api/v1/order/dispute/:disputeId/admin-ruling`

**Description**: Admin makes final binding decision on a dispute that is pending admin review.

**Authorization**: Admin only

**Request Body**:
```json
{
  "decision": "buyer_win" | "seller_win",  // Required
  "notes": "String (optional, max 2000 chars)"  // Admin's notes on the decision
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Dispute resolved by admin successfully",
  "dispute": {
    "_id": "dispute_id",
    "orderId": {
      "_id": "order_id",
      "orderStatus": "delivered",
      "dispute_status": "closed",
      "payment_status": "refunded" | "complete",  // "refunded" if buyer_win, "complete" if seller_win
      "paymentInfo": {
        "status": "refunded" | "completed"
      },
      ...
    },
    "buyerId": {...},
    "sellerId": {...},
    "status": "closed",
    "adminRuling": {
      "decision": "buyer_win" | "seller_win",
      "notes": "Admin's decision notes",
      "ruledAt": "2025-01-29T11:00:00.000Z",
      "adminId": {
        "_id": "admin_id",
        "name": "Admin Name",
        "email": "admin@email.com"
      }
    },
    "resolvedAt": "2025-01-29T11:00:00.000Z",
    ...
  }
}
```

**Error Responses**:
- `400`: Invalid decision, dispute not pending admin review
- `401`: Not authenticated
- `403`: Not authorized (not admin)
- `404`: Dispute not found

---

## 📋 DISPUTE STATUS FLOW

```
1. Buyer creates dispute
   └─> Status: "open"
   └─> Order dispute_status: "open"
   └─> Order payment_status: "pending"

2. Seller responds (within time limit)
   └─> Status: "open" (remains)
   └─> Seller response added

3. Buyer accepts seller's proposal
   └─> Status: "closed"
   └─> Order dispute_status: "closed"
   └─> Order payment_status: "complete"

4. Buyer rejects seller's proposal
   └─> Status: "pending_admin_review"
   └─> Order dispute_status: "pending_admin_review"

5. Seller doesn't respond (auto-escalation)
   └─> Status: "pending_admin_review" (after configured hours)
   └─> Order dispute_status: "pending_admin_review"

6. Admin makes ruling
   └─> Status: "closed"
   └─> Order dispute_status: "closed"
   └─> Order payment_status: "refunded" (if buyer_win) | "complete" (if seller_win)
```

---

## ⚙️ CONFIGURATION

Dispute workflow uses these SystemConfig values:
- `DISPUTE_RESPONSE_HOURS`: Hours for seller to respond before auto-escalation (default: 48)
- `DELIVERED_TO_RECEIVED_MINUTES`: Time window for buyer to confirm receipt and open disputes (default: 1440 = 24 hours)

---

## 🔔 NOTIFICATIONS

All dispute actions trigger notifications and emails:
- **Dispute Created**: Seller receives notification/email
- **Seller Responded**: Buyer receives notification/email
- **Buyer Accepted/Rejected**: Seller receives notification/email
- **Dispute Escalated**: Admin receives notification/email
- **Admin Ruling**: Both buyer and seller receive notification/email

---

## 📝 NOTES

1. **Time Limits**:
   - Buyer can open dispute when order is "shipped", "delivered", or "received" (within time limit for "received")
   - Seller must respond within `DISPUTE_RESPONSE_HOURS` or dispute auto-escalates
   - Buyer can open dispute after "received" status within `DELIVERED_TO_RECEIVED_MINUTES`

2. **Order Status Restrictions**:
   - Order status cannot be updated while dispute is "open" or "pending_admin_review"
   - Buyer cannot confirm receipt while dispute is open

3. **Payment Status**:
   - Payment status remains "pending" while dispute is open
   - Payment status updates based on dispute resolution (complete/refunded)

4. **Multiple Disputes**:
   - Only one dispute can exist per order
   - Cannot create new dispute if one already exists

