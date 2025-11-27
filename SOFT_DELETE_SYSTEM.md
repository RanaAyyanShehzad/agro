# Soft Delete System Documentation

## Overview

This system implements soft delete functionality for user accounts (farmer, buyer, supplier) and products in a multi-vendor marketplace. Soft delete ensures data integrity by marking records as deleted rather than permanently removing them from the database.

## Key Features

1. **Soft Delete for User Accounts**: Accounts are marked as deleted but remain in the database
2. **Soft Delete for Products**: Products are marked as deleted but remain in orders
3. **Active Order Protection**: Products with active orders cannot be deleted
4. **Cascade Soft Delete**: When a farmer/supplier deletes their account, all their products are soft-deleted
5. **Order Integrity**: Orders continue to work even after products or users are deleted

---

## Model Updates

### User Models (Farmer, Buyer, Supplier)

All three user models now include:

```javascript
{
  isAccountDeleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}
```

### Product Model

The product model now includes:

```javascript
{
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}
```

---

## API Endpoints

### 1. DELETE /api/farmers/delete

**Description:** Soft delete a farmer account and all their products.

**Authentication:** Required (Farmer only)

**Request:** 
- Method: `DELETE`
- Headers: `Cookie: token=<jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully. All your products have been removed."
}
```

**Behavior:**
- Sets `farmer.isAccountDeleted = true`
- Sets `farmer.isActive = false`
- Sets `farmer.deletedAt = current_date`
- Soft deletes all farmer's products:
  - `isActive = false`
  - `isDeleted = true`
  - `isAvailable = false`
  - `deletedAt = current_date`
- Sends confirmation email
- Clears authentication cookie

**Error Cases:**
- 400: Account already deleted
- 401: Not authenticated
- 403: Not a farmer
- 404: Farmer not found

---

### 2. DELETE /api/buyers/delete

**Description:** Soft delete a buyer account.

**Authentication:** Required (Buyer only)

**Request:**
- Method: `DELETE`
- Headers: `Cookie: token=<jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

**Behavior:**
- Sets `buyer.isAccountDeleted = true`
- Sets `buyer.isActive = false`
- Sets `buyer.deletedAt = current_date`
- Sends confirmation email
- Clears authentication cookie

**Error Cases:**
- 400: Account already deleted
- 401: Not authenticated
- 403: Not a buyer
- 404: Buyer not found

---

### 3. DELETE /api/suppliers/delete

**Description:** Soft delete a supplier account and all their products.

**Authentication:** Required (Supplier only)

**Request:**
- Method: `DELETE`
- Headers: `Cookie: token=<jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "Profile deleted successfully. All your products have been removed."
}
```

**Behavior:**
- Sets `supplier.isAccountDeleted = true`
- Sets `supplier.isActive = false`
- Sets `supplier.deletedAt = current_date`
- Soft deletes all supplier's products:
  - `isActive = false`
  - `isDeleted = true`
  - `isAvailable = false`
  - `deletedAt = current_date`
- Sends confirmation email
- Clears authentication cookie

**Error Cases:**
- 400: Account already deleted
- 401: Not authenticated
- 403: Not a supplier
- 404: Supplier not found

---

### 4. DELETE /api/products/delete/:id

**Description:** Soft delete a product (with active order check).

**Authentication:** Required

**Authorization:** Only the product owner (farmer/supplier) can delete

**Request:**
- Method: `DELETE`
- Headers: `Cookie: token=<jwt_token>`
- Params: `id` - Product ID

**Response (Success):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Response (Error - Active Orders):**
```json
{
  "success": false,
  "message": "Cannot delete. Product has 2 active order(s) with status \"processing\", \"confirmed\", or \"shipped\"."
}
```

**Behavior:**
1. Validates product exists and user is owner
2. Checks for active orders with statuses: `["processing", "confirmed", "shipped"]`
3. If active orders exist → **Blocks deletion** and returns error
4. If no active orders → **Allows soft delete**:
   - Sets `isActive = false`
   - Sets `isDeleted = true`
   - Sets `isAvailable = false`
   - Sets `deletedAt = current_date`

**Error Cases:**
- 400: Product already deleted OR has active orders
- 401: Not authenticated
- 403: Not the product owner
- 404: Product not found

---

## Helper Functions

### checkActiveOrders(productId)

**Location:** `utils/softDeleteHelpers.js`

**Description:** Checks if a product has active orders.

**Parameters:**
- `productId` (String): Product ID to check

**Returns:**
```javascript
{
  hasActiveOrders: Boolean,
  count: Number,
  orders: Array  // Only if hasActiveOrders is true
}
```

**Active Order Statuses:**
- `"processing"`
- `"confirmed"`
- `"shipped"`

**Usage:**
```javascript
import { checkActiveOrders } from "../utils/softDeleteHelpers.js";

const { hasActiveOrders, count } = await checkActiveOrders(productId);
if (hasActiveOrders) {
  // Block deletion
}
```

---

## Query Filters

### Products

All product listing queries now exclude soft-deleted products:

```javascript
// Get all active products
product.find({ 
  isDeleted: false, 
  isActive: true 
});

// Get products for farmers (excluding deleted)
product.find({
  isAvailable: true,
  isDeleted: false,
  isActive: true,
  "upLoadedBy.userID": { $ne: userId }
});
```

**Exception:** Product owners can see their own deleted products in "My Products" view.

### Cart

Cart operations check for deleted products:

```javascript
if (productDoc.isDeleted || !productDoc.isActive) {
  return next(new ErrorHandler("Product is not available", 400));
}
```

---

## Order Model Impact

### Important Notes

1. **Orders maintain product snapshots**: Even if a product is deleted, orders retain:
   - Product ID reference
   - Product name (from order creation)
   - Product price (at time of order)
   - Quantity ordered

2. **Soft-deleted products in orders**: 
   - Order `productId` may reference a deleted product
   - Orders remain fully functional
   - Product details are preserved in order history

3. **No cascade delete**: Deleting a product does NOT affect existing orders containing that product.

---

## Data Flow

### Farmer/Supplier Account Deletion

```
1. User requests account deletion
   ↓
2. Validate user exists and not already deleted
   ↓
3. Mark user account as deleted
   - isAccountDeleted = true
   - isActive = false
   - deletedAt = now
   ↓
4. Find all user's products
   ↓
5. Soft delete all products
   - isActive = false
   - isDeleted = true
   - isAvailable = false
   - deletedAt = now
   ↓
6. Send confirmation email
   ↓
7. Clear authentication cookie
   ↓
8. Return success response
```

### Product Deletion

```
1. User requests product deletion
   ↓
2. Validate product exists and user is owner
   ↓
3. Check for active orders
   ↓
4a. If active orders exist:
    → Return error (block deletion)
   ↓
4b. If no active orders:
    → Soft delete product
    - isActive = false
    - isDeleted = true
    - isAvailable = false
    - deletedAt = now
   ↓
5. Return success response
```

---

## Security Considerations

1. **Authorization**: Only product owners can delete their products
2. **Account Ownership**: Users can only delete their own accounts
3. **Active Order Protection**: Products with active orders cannot be deleted
4. **Data Integrity**: Soft delete preserves order history and references

---

## Database Queries

### Find Active Products
```javascript
product.find({ 
  isDeleted: false, 
  isActive: true,
  isAvailable: true
});
```

### Find Deleted Products (Admin/Owner)
```javascript
product.find({ 
  isDeleted: true 
});
```

### Find Active Users
```javascript
farmer.find({ 
  isAccountDeleted: false, 
  isActive: true 
});
```

### Find Deleted Users (Admin)
```javascript
farmer.find({ 
  isAccountDeleted: true 
});
```

---

## Testing Scenarios

### Test Case 1: Delete Product with Active Orders
1. Create product
2. Create order with product (status: "processing")
3. Attempt to delete product
4. **Expected**: Error - "Cannot delete. Product has active orders."

### Test Case 2: Delete Product without Active Orders
1. Create product
2. Create order with product (status: "delivered")
3. Attempt to delete product
4. **Expected**: Success - Product soft-deleted

### Test Case 3: Delete Farmer Account
1. Create farmer with products
2. Delete farmer account
3. **Expected**: 
   - Farmer account soft-deleted
   - All farmer's products soft-deleted
   - Orders remain intact

### Test Case 4: View Deleted Product
1. Delete a product
2. Non-owner attempts to view product
3. **Expected**: Error - "Product not found"
4. Owner attempts to view product
5. **Expected**: Success - Product details shown

---

## Migration Notes

If you have existing data:

1. **Add new fields to existing records:**
```javascript
// For users
db.farmers.updateMany(
  { isAccountDeleted: { $exists: false } },
  { $set: { isAccountDeleted: false, isActive: true, deletedAt: null } }
);

// For products
db.products.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isActive: true, isDeleted: false, deletedAt: null } }
);
```

2. **Update queries**: All product/user queries should filter by `isDeleted: false` and `isActive: true`

---

## Files Modified

1. **Models:**
   - `models/farmer.js` - Added soft delete fields
   - `models/buyer.js` - Added soft delete fields
   - `models/supplier.js` - Added soft delete fields
   - `models/products.js` - Added soft delete fields
   - `models/orderMultiVendor.js` - Added comments about soft-deleted products

2. **Controllers:**
   - `controllers/farmer.js` - Updated `deleteProfile()`
   - `controllers/buyer.js` - Updated `deleteProfile()`
   - `controllers/supplier.js` - Updated `deleteProfile()`
   - `controllers/products.js` - Updated `deleteProduct()` and queries
   - `controllers/cart.js` - Added deleted product check

3. **Utils:**
   - `utils/softDeleteHelpers.js` - New file with helper functions

4. **Routes:**
   - Routes already exist, no changes needed

---

## Best Practices

1. **Always check `isDeleted` and `isActive`** when querying products/users
2. **Preserve order data** - Never delete products that are in orders
3. **Use soft delete** for audit trails and data recovery
4. **Filter deleted items** in public-facing queries
5. **Allow owners/admins** to view deleted items for their own records

---

## Future Enhancements

1. **Restore functionality**: Allow admins to restore deleted accounts/products
2. **Permanent delete**: Add admin function to permanently delete after X days
3. **Deletion reason**: Track why items were deleted
4. **Bulk operations**: Allow admins to bulk delete/restore

