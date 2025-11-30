# Product Status Update Endpoint Fix

## Issue
The frontend was getting a 404 error when trying to update product status:
```
PUT https://agrofarm-vd8i.onrender.com/api/v1/order/:orderId/product/:productId/status 404 (Not Found)
```

## Root Cause
The backend route was defined as **PATCH** but the frontend was calling it with **PUT** method.

## Solution
Updated the route in `routes/orderMultiVendor.js` to use **PUT** instead of **PATCH** to match the frontend implementation.

### Before:
```javascript
router.patch(
  "/order/:orderId/product/:productId/status",
  isProductOwner,
  updateProductStatus
);
```

### After:
```javascript
router.put(
  "/order/:orderId/product/:productId/status",
  isProductOwner,
  updateProductStatus
);
```

## Endpoint Details

**Method:** `PUT`  
**Path:** `/api/v1/order/:orderId/product/:productId/status`  
**Authentication:** Required (JWT token in cookies)  
**Authorization:** Only the farmer/supplier who owns the product can update its status

### Request Body:
```json
{
  "status": "processing"  // One of: processing, shipped, delivered, cancelled
}
```

### Response (Success - 200):
```json
{
  "success": true,
  "message": "Product status updated successfully",
  "order": {
    // Full order object with updated product status
  }
}
```

### Response (Error - 400/403/404):
```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

## Status Transition Rules

The endpoint validates status transitions according to the order workflow:

- `confirmed` → `processing`, `cancelled`
- `processing` → `shipped`, `cancelled`
- `shipped` → `delivered`
- `delivered` → (cannot be changed by seller, buyer must confirm receipt)
- `cancelled` → (final status, cannot be changed)

## Frontend Integration

Your frontend code is already correctly configured:

```javascript
const url = `https://agrofarm-vd8i.onrender.com/api/v1/order/${orderId}/product/${productItemId}/status`;

const response = await fetch(url, {
  method: "PUT",  // ✅ Now matches backend
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
  body: JSON.stringify({ status: newStatus }),
});
```

## Testing

After deploying this fix, the endpoint should work correctly. Test with:

1. **Update to Processing:**
   ```bash
   PUT /api/v1/order/{orderId}/product/{productId}/status
   Body: { "status": "processing" }
   ```

2. **Update to Shipped:**
   ```bash
   PUT /api/v1/order/{orderId}/product/{productId}/status
   Body: { "status": "shipped" }
   ```

3. **Update to Delivered:**
   ```bash
   PUT /api/v1/order/{orderId}/product/{productId}/status
   Body: { "status": "delivered" }
   ```

## Additional Notes

- The endpoint includes comprehensive validation:
  - ✅ Validates status transitions
  - ✅ Checks for open disputes
  - ✅ Verifies user authorization
  - ✅ Enforces time restrictions (e.g., cannot mark delivered immediately after shipped)
  - ✅ Updates order-level status automatically
  - ✅ Sends notifications to customers
  - ✅ Logs status changes

- The route is registered at `/api/v1` in `app.js`, so the full path is:
  `/api/v1/order/:orderId/product/:productId/status`

## Related Endpoints

- **Order-level status update:** `PUT /api/v1/order/update-status/:orderId`
- **Mark order as delivered:** `PUT /api/v1/order/delivered/:orderId`
- **Confirm receipt:** `PUT /api/v1/order/confirm-receipt/:orderId`

