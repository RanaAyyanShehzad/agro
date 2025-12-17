# SELLER & BUYER GET DISPUTES ENDPOINTS

## Base URL
- **Order Routes**: `/api/v1/order`

All endpoints require authentication (JWT token in cookies).

---

## 🟢 SELLER DISPUTE ENDPOINTS (Farmer/Supplier)

### 1. Get All Seller Disputes
**Endpoint**: `GET /api/v1/order/disputes`

**Description**: Seller (farmer/supplier) retrieves all disputes where they are the seller, with optional filtering and pagination.

**Authorization**: Farmer or Supplier only

**Query Parameters**:
- `status` (optional): Filter by status - `"open"` | `"pending_admin_review"` | `"closed"`
- `disputeType` (optional): Filter by type - `"non_delivery"` | `"product_fault"` | `"wrong_item"` | `"other"`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Example Request 1 - Get All Disputes**:
```
GET /api/v1/order/disputes
```

**Example Request 2 - Get Open Disputes Only**:
```
GET /api/v1/order/disputes?status=open
```

**Example Request 3 - Get Disputes with Pagination**:
```
GET /api/v1/order/disputes?page=1&limit=10
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

**Error Responses**:
- `401`: Not authenticated
- `403`: Not authorized (not seller)

---

### 2. Get Dispute by ID (Seller)
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
- `403`: Not authorized (not seller)
- `404`: Dispute not found or access denied (seller doesn't own this dispute)

---

## 🔵 BUYER DISPUTE ENDPOINTS (Buyer/Farmer as Buyer)

### 3. Get All Buyer Disputes
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
GET /api/v1/order/disputes/buyer?status=open
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
        "customerId": {...},
        "products": [...],
        "totalPrice": 200,
        "dispute_status": "open",
        "payment_status": "pending"
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
      "reason": "Product was damaged",
      "status": "open",
      "sellerResponse": {
        "evidence": [],
        "proposal": null,
        "respondedAt": null
      },
      ...
    }
  ]
}
```

---

### 4. Get Dispute by ID (Buyer)
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
    "orderId": {...},
    "buyerId": "69293fdf4fbb23e04c7dc009",
    "sellerId": {...},
    "sellerRole": "farmer",
    "disputeType": "product_fault",
    "reason": "Product was damaged",
    "buyerProof": {...},
    "sellerResponse": {...},
    "status": "open",
    ...
  }
}
```

**Error Responses**:
- `400`: Invalid dispute ID format
- `401`: Not authenticated
- `403`: Not authorized (not buyer)
- `404`: Dispute not found or access denied

---

## 📋 WHERE TO GET disputeId AND orderId

### For Sellers (Farmers/Suppliers):

1. **Get disputeId from disputes list**:
   ```
   GET /api/v1/order/disputes
   ```
   - Response contains array of disputes
   - Each dispute has `_id` field - this is the `disputeId`
   - Each dispute has `orderId` field (populated with order details)

2. **Get specific dispute with orderId**:
   ```
   GET /api/v1/order/dispute/:disputeId
   ```
   - Use `disputeId` from the disputes list
   - Response contains full dispute with populated `orderId`

3. **From notifications**:
   - When seller receives notification about dispute
   - Notification has `relatedId` field - this is the `disputeId`
   - Notification has `relatedType: "dispute"`

### For Buyers:

1. **Get disputeId from disputes list**:
   ```
   GET /api/v1/order/disputes/buyer
   ```
   - Response contains array of disputes created by buyer
   - Each dispute has `_id` field - this is the `disputeId`
   - Each dispute has `orderId` field (populated with order details)

2. **Get specific dispute with orderId**:
   ```
   GET /api/v1/order/dispute/buyer/:disputeId
   ```
   - Use `disputeId` from the disputes list
   - Response contains full dispute with populated `orderId`

3. **From notifications**:
   - When buyer receives notification about dispute
   - Notification has `relatedId` field - this is the `disputeId`
   - Notification has `relatedType: "dispute"`

### Example Frontend Flow for Seller:

```javascript
// Step 1: Get all disputes for seller
const response = await axios.get(
  `${API_BASE}/order/disputes`,
  { withCredentials: true }
);

// Response contains:
// {
//   success: true,
//   disputes: [
//     {
//       _id: "692b148b3d3116503dc6f961",  // <-- This is disputeId
//       orderId: {
//         _id: "69293fdf4fbb23e04c7dc009",  // <-- This is orderId
//         ...
//       },
//       ...
//     }
//   ]
// }

// Step 2: Use disputeId to respond to dispute
const disputeId = response.data.disputes[0]._id;
const orderId = response.data.disputes[0].orderId._id;

// Step 3: Respond to dispute
await axios.put(
  `${API_BASE}/order/dispute/${disputeId}/respond`,
  {
    evidence: ["url1", "url2"],
    proposal: "Resolution proposal"
  },
  { withCredentials: true }
);
```

### Example Frontend Flow for Buyer:

```javascript
// Step 1: Get all disputes for buyer
const response = await axios.get(
  `${API_BASE}/order/disputes/buyer`,
  { withCredentials: true }
);

// Response contains disputes with disputeId and orderId

// Step 2: Use disputeId to resolve dispute
const disputeId = response.data.disputes[0]._id;

// Step 3: Accept or reject seller's proposal
await axios.put(
  `${API_BASE}/order/dispute/${disputeId}/resolve`,
  {
    action: "accept" // or "reject"
  },
  { withCredentials: true }
);
```

---

## 🔄 COMPLETE DISPUTE WORKFLOW

### Seller Workflow:

1. **Buyer creates dispute** → Seller receives notification
2. **Seller gets disputes list**:
   ```
   GET /api/v1/order/disputes
   ```
   - Returns all disputes where seller is involved
   - Each dispute has `_id` (disputeId) and `orderId`

3. **Seller views dispute details**:
   ```
   GET /api/v1/order/dispute/:disputeId
   ```
   - Get full dispute details with order information

4. **Seller responds to dispute**:
   ```
   PUT /api/v1/order/dispute/:disputeId/respond
   ```
   - Use `disputeId` from step 2 or 3
   - Submit evidence and proposal

### Buyer Workflow:

1. **Buyer creates dispute**:
   ```
   POST /api/v1/order/dispute/:orderId
   ```
   - Creates dispute and returns dispute object with `_id` (disputeId)

2. **Buyer gets disputes list**:
   ```
   GET /api/v1/order/disputes/buyer
   ```
   - Returns all disputes created by buyer
   - Each dispute has `_id` (disputeId) and `orderId`

3. **Buyer views dispute details**:
   ```
   GET /api/v1/order/dispute/buyer/:disputeId
   ```
   - Get full dispute details with seller response

4. **Buyer resolves dispute**:
   ```
   PUT /api/v1/order/dispute/:disputeId/resolve
   ```
   - Use `disputeId` from step 1 or 2
   - Accept or reject seller's proposal

---

## 📝 NOTES

1. **disputeId**:
   - Always comes from the dispute object `_id` field
   - Can be obtained from:
     - Disputes list endpoint (`GET /api/v1/order/disputes`)
     - Specific dispute endpoint (`GET /api/v1/order/dispute/:disputeId`)
     - Notification `relatedId` field (if notification type is "dispute")

2. **orderId**:
   - Always comes from the dispute's `orderId` field
   - Is automatically populated in dispute responses
   - Can be accessed as `dispute.orderId._id` or `dispute.orderId` (if not populated)

3. **Frontend Simplification**:
   - No need to fetch order separately to get disputeId
   - No need to use admin endpoints
   - Simply use `GET /api/v1/order/disputes` to get all disputes with disputeId and orderId

4. **Security**:
   - Sellers can only see disputes where they are the seller
   - Sellers can only respond to disputes they own
   - All endpoints validate seller ownership

