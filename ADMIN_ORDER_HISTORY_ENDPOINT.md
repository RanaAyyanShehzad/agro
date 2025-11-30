# Admin Order History Endpoint Documentation

## Overview
This endpoint allows admins to retrieve the complete status change history for any order, showing who changed the status, when it was changed (in Pakistan time), and what the change was.

---

## Endpoint Details

### **Get Order Status History**
**Endpoint**: `GET /api/v1/admin/orders/:orderId/history`

**Method**: `GET`

**Authentication**: Required (Admin only)

**Authorization**: Admin role required

---

## Request Parameters

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | String (ObjectId) | Yes | The ID of the order to get history for |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | `1` | Page number for pagination |
| `limit` | Number | No | `50` | Number of records per page |

---

## Request Example

```http
GET /api/v1/admin/orders/692b8616451683a03425cf93/history?page=1&limit=50
Authorization: Bearer <admin_jwt_token>
```

---

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "page": 1,
  "totalPages": 1,
  "history": [
    {
      "_id": "692b8701451683a03425d01a",
      "orderId": "692b8616451683a03425cf93",
      "orderType": "multivendor",
      "changedBy": {
        "userId": "69293ea84fbb23e04c7dbfdf",
        "role": "farmer",
        "name": "John Farmer"
      },
      "changeType": "status",
      "oldValue": "pending",
      "newValue": "confirmed",
      "reason": null,
      "notes": "Order accepted by seller",
      "changedAt": "2025-11-29 23:49:27 PKT",
      "changedAtISO": "2025-11-29T18:49:27.000Z",
      "timestamp": "2025-11-29T18:49:27.000Z"
    },
    {
      "_id": "692b8701451683a03425d01b",
      "orderId": "692b8616451683a03425cf93",
      "orderType": "multivendor",
      "changedBy": {
        "userId": "69293ea84fbb23e04c7dbfdf",
        "role": "farmer",
        "name": "John Farmer"
      },
      "changeType": "status",
      "oldValue": "confirmed",
      "newValue": "processing",
      "reason": null,
      "notes": null,
      "changedAt": "2025-11-29 23:50:15 PKT",
      "changedAtISO": "2025-11-29T18:50:15.000Z",
      "timestamp": "2025-11-29T18:50:15.000Z"
    },
    {
      "_id": "692b8701451683a03425d01c",
      "orderId": "692b8616451683a03425cf93",
      "orderType": "multivendor",
      "changedBy": {
        "userId": "69293ea84fbb23e04c7dbfdf",
        "role": "farmer",
        "name": "John Farmer"
      },
      "changeType": "shipped",
      "oldValue": "processing",
      "newValue": "shipped",
      "reason": null,
      "notes": "Order shipped via courier",
      "changedAt": "2025-11-30 10:30:45 PKT",
      "changedAtISO": "2025-11-30T05:30:45.000Z",
      "timestamp": "2025-11-30T05:30:45.000Z"
    },
    {
      "_id": "692b8701451683a03425d01d",
      "orderId": "692b8616451683a03425cf93",
      "orderType": "multivendor",
      "changedBy": {
        "userId": "69293ea84fbb23e04c7dbfdf",
        "role": "farmer",
        "name": "John Farmer"
      },
      "changeType": "delivered",
      "oldValue": "shipped",
      "newValue": "delivered",
      "reason": null,
      "notes": null,
      "changedAt": "2025-11-30 14:20:10 PKT",
      "changedAtISO": "2025-11-30T09:20:10.000Z",
      "timestamp": "2025-11-30T09:20:10.000Z"
    },
    {
      "_id": "692b8701451683a03425d01e",
      "orderId": "692b8616451683a03425cf93",
      "orderType": "multivendor",
      "changedBy": {
        "userId": "69293fdf4fbb23e04c7dc009",
        "role": "buyer",
        "name": "Ahmed Buyer"
      },
      "changeType": "received",
      "oldValue": "delivered",
      "newValue": "received",
      "reason": null,
      "notes": null,
      "changedAt": "2025-11-30 16:45:30 PKT",
      "changedAtISO": "2025-11-30T11:45:30.000Z",
      "timestamp": "2025-11-30T11:45:30.000Z"
    }
  ]
}
```

---

## Response Fields

### Main Response
| Field | Type | Description |
|-------|------|-------------|
| `success` | Boolean | Indicates if the request was successful |
| `count` | Number | Number of history entries in current page |
| `total` | Number | Total number of history entries for this order |
| `page` | Number | Current page number |
| `totalPages` | Number | Total number of pages |

### History Entry Fields
| Field | Type | Description |
|-------|------|-------------|
| `_id` | String (ObjectId) | History entry ID |
| `orderId` | String (ObjectId) | Order ID this history belongs to |
| `orderType` | String | Type of order: `"old"` or `"multivendor"` |
| `changedBy` | Object | Information about who made the change |
| `changedBy.userId` | String (ObjectId) | ID of the user who made the change |
| `changedBy.role` | String | Role of the user: `"buyer"`, `"farmer"`, `"supplier"`, or `"admin"` |
| `changedBy.name` | String | Name of the user (or "System" if automated) |
| `changeType` | String | Type of change: `"status"`, `"payment_status"`, `"dispute_status"`, `"accepted"`, `"rejected"`, `"shipped"`, `"delivered"`, `"received"`, `"cancelled"` |
| `oldValue` | Mixed | Previous value before the change |
| `newValue` | Mixed | New value after the change |
| `reason` | String \| null | Reason for the change (if provided) |
| `notes` | String \| null | Additional notes about the change |
| `changedAt` | String | Formatted timestamp in Pakistan time (PKT) - Format: `"YYYY-MM-DD HH:mm:ss PKT"` |
| `changedAtISO` | String | ISO timestamp string (UTC) |
| `timestamp` | String | ISO timestamp (UTC) - same as `changedAtISO` |

---

## Time Format

All timestamps are displayed in **Pakistan Standard Time (PKT)**, which is **UTC+5**.

- **`changedAt`**: Human-readable format in PKT (e.g., `"2025-11-30 14:20:10 PKT"`)
- **`changedAtISO`** and **`timestamp`**: ISO 8601 format in UTC (e.g., `"2025-11-30T09:20:10.000Z"`)

---

## Change Types

The `changeType` field can have the following values:

| Change Type | Description |
|-------------|-------------|
| `status` | General order status change |
| `payment_status` | Payment status change (pending, complete, refunded, cancelled) |
| `dispute_status` | Dispute status change (none, open, pending_admin_review, closed) |
| `accepted` | Order/product accepted by seller |
| `rejected` | Order/product rejected by seller |
| `shipped` | Order/product marked as shipped |
| `delivered` | Order/product marked as delivered |
| `received` | Order/product confirmed as received by buyer |
| `cancelled` | Order/product cancelled |

---

## Who Can Make Changes

The `changedBy.role` field indicates who made the change:

| Role | Description |
|------|-------------|
| `buyer` | Buyer changed the status (e.g., confirmed receipt) |
| `farmer` | Farmer changed the status (e.g., accepted, shipped, delivered) |
| `supplier` | Supplier changed the status (e.g., accepted, shipped, delivered) |
| `admin` | Admin manually changed the status |
| `System` | Automated system change (e.g., auto-confirmation after timeout) |

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Login First"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Admin only."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Order not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Usage Examples

### Example 1: Get First Page of Order History
```javascript
const response = await fetch('/api/v1/admin/orders/692b8616451683a03425cf93/history', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.history); // Array of history entries
```

### Example 2: Get History with Pagination
```javascript
const response = await fetch('/api/v1/admin/orders/692b8616451683a03425cf93/history?page=2&limit=20', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(`Page ${data.page} of ${data.totalPages}`);
console.log(`Showing ${data.count} of ${data.total} entries`);
```

### Example 3: Display History in Frontend
```javascript
// Display order history with Pakistan time
data.history.forEach(entry => {
  console.log(`${entry.changedBy.name} (${entry.changedBy.role})`);
  console.log(`Changed ${entry.changeType} from "${entry.oldValue}" to "${entry.newValue}"`);
  console.log(`Time: ${entry.changedAt}`); // Already in PKT
  if (entry.notes) {
    console.log(`Notes: ${entry.notes}`);
  }
});
```

---

## Notes

1. **Time Display**: All times are automatically converted to Pakistan Standard Time (PKT = UTC+5) for easy reading.

2. **Pagination**: Use `page` and `limit` query parameters to paginate through large history logs.

3. **Order**: History entries are sorted by creation time in descending order (newest first).

4. **Complete Audit Trail**: This endpoint provides a complete audit trail of all status changes, including:
   - Who made the change (user ID, role, name)
   - When the change was made (PKT time)
   - What changed (old value → new value)
   - Why the change was made (reason/notes)

5. **System Changes**: Automated system changes (e.g., auto-confirmation) will show `"System"` as the name in `changedBy.name`.

6. **Both Order Types**: Works for both old `Order` model and new `OrderMultiVendor` model orders.

---

## Related Endpoints

- **Get All Orders (Admin)**: `GET /api/v1/admin/orders`
- **Get Order by ID (Admin)**: `GET /api/v1/admin/orders/:orderId`
- **Update Order Status (Admin)**: `PUT /api/v1/admin/orders/:orderId/status`
- **Get All Disputes (Admin)**: `GET /api/v1/admin/disputes`
- **Get Dispute by ID (Admin)**: `GET /api/v1/admin/disputes/:disputeId`

---

## Admin Dispute Ruling Visibility

When an admin makes a ruling on a dispute, both the buyer and seller will receive:

1. **In-App Notification**: 
   - Type: `dispute_admin_ruling`
   - Title: "Dispute Resolution"
   - Message: Includes the decision and admin notes
   - Related ID: Dispute ID

2. **Email Notification**: 
   - Subject: "Dispute Resolution"
   - Content: Detailed resolution information including decision and notes

Both parties can view the admin ruling in their dispute details:
- **Buyer**: `GET /api/v1/order/dispute/buyer/:disputeId`
- **Seller**: `GET /api/v1/order/dispute/:disputeId`

The `adminRuling` object in the dispute response includes:
```json
{
  "adminRuling": {
    "decision": "buyer_win" | "seller_win",
    "notes": "Admin's ruling notes",
    "ruledAt": "2025-11-30T11:45:30.000Z",
    "adminId": "692a204a5d00d647f56db09e"
  }
}
```

---

## Summary

This endpoint provides admins with a complete audit trail of all order status changes, showing:
- ✅ Who changed the status (user role and name)
- ✅ When it was changed (in Pakistan time - PKT)
- ✅ What changed (old value → new value)
- ✅ Why it changed (reason/notes if provided)
- ✅ Complete pagination support
- ✅ Works for both old and new order models

All times are automatically converted to Pakistan Standard Time (PKT = UTC+5) for easy reading and compliance with local time requirements.

