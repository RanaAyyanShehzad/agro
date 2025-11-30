# Order Status Management System

## Overview
This document describes the complete order status management system with proper flow, validations, and dispute handling.

---

## Order Status Flow

### Main Flow
```
pending → confirmed → processing → shipped → delivered → received
```

### Alternative Flow (Rejection)
```
pending → cancelled (if seller rejects)
```

### Status Transitions

| Current Status | Allowed Next Status | Description |
|----------------|---------------------|-------------|
| `pending` | `confirmed`, `cancelled` | Order placed, waiting for seller |
| `confirmed` | `processing`, `cancelled` | Seller accepted order |
| `processing` | `shipped`, `cancelled` | Seller preparing order |
| `shipped` | `delivered` | Order shipped to buyer |
| `delivered` | `received` | Buyer must confirm receipt |
| `received` | - | Order completed (final status) |
| `cancelled` | - | Order cancelled (final status) |
| `rejected` | - | Product rejected (final status) |

**Important**: Status transitions are **one-way only**. Once an order reaches `delivered` or `received`, it cannot be reversed.

---

## Order Lifecycle

### 1. Order Placement (Buyer)
- **Endpoint**: `POST /api/v1/order/create`
- **Initial Status**: `pending`
- **Action**: Buyer places order from cart
- **Product Quantity**: Deducted from inventory

### 2. Seller Acceptance/Rejection

#### Accept Order
- **Endpoint**: `PUT /api/v1/order/accept/:orderId`
- **Required**: `estimatedDeliveryDate` (Date) in request body
- **Status Change**: `pending` → `confirmed`
- **Requirements**:
  - Seller must provide estimated delivery date (must be in future)
  - Estimated delivery date is stored at product level
- **Request Body**:
  ```json
  {
    "estimatedDeliveryDate": "2025-12-15T10:00:00.000Z"
  }
  ```

#### Reject Order
- **Endpoint**: `PUT /api/v1/order/reject/:orderId`
- **Required**: `reason` (String) in request body
- **Status Change**: `pending` → `cancelled`
- **Action**: Product quantity is restored to inventory

### 3. Status Updates by Seller

#### Change to Processing
- **Endpoint**: `PUT /api/v1/order/:orderId/product/:productId/status`
- **Request Body**: `{ "status": "processing" }`
- **Status Change**: `confirmed` → `processing`
- **Validation**: Must be in `confirmed` status

#### Change to Shipped
- **Endpoint**: `PUT /api/v1/order/:orderId/product/:productId/status`
- **Request Body**: `{ "status": "shipped" }`
- **Status Change**: `processing` → `shipped`
- **Validation**: Must be in `processing` status
- **Action**: Sets `shippedAt` timestamp

#### Change to Delivered
- **Endpoint**: `PUT /api/v1/order/:orderId/product/:productId/status`
- **Request Body**: `{ "status": "delivered" }`
- **Status Change**: `shipped` → `delivered`
- **Validation**: 
  - Must be in `shipped` status
  - Must wait minimum time after shipping (configured in `SHIPPED_TO_DELIVERED_MINUTES`)
- **Action**: Sets `deliveredAt` timestamp, notifies buyer

### 4. Buyer Confirmation

#### Confirm Receipt
- **Endpoint**: `PUT /api/v1/order/confirm-receipt/:orderId`
- **Status Change**: `delivered` → `received`
- **Validation**: 
  - Order must be in `delivered` status
  - No open disputes
- **Action**: 
  - Updates all product statuses to `received`
  - Sets `receivedAt` timestamp
  - Updates payment status to `complete`
  - Notifies seller

#### Auto-Confirmation
- **Job**: `jobs/orderAutoConfirmation.js`
- **Trigger**: Runs periodically (cron job)
- **Action**: Automatically confirms orders in `delivered` status after configured time (`AUTO_CONFIRM_MINUTES`)
- **Result**: Status changes to `received` automatically

---

## Status Transition Validation

### Prevented Actions

1. **Status Reversals**: Once an order reaches `delivered` or `received`, it cannot go back to previous statuses
   - ❌ `delivered` → `shipped` (not allowed)
   - ❌ `received` → `delivered` (not allowed)
   - ❌ `received` → `shipped` (not allowed)

2. **Invalid Transitions**: Only allowed transitions are permitted
   - ❌ `pending` → `shipped` (must go through `confirmed` and `processing`)
   - ❌ `confirmed` → `delivered` (must go through `processing` and `shipped`)

3. **Dispute Blocking**: Cannot update status while dispute is open
   - ❌ Status update when `dispute_status === "open"` or `"pending_admin_review"`

4. **Time Restrictions**: 
   - ❌ Cannot mark as `delivered` immediately after `shipped` (must wait minimum time)
   - ❌ Cannot confirm receipt if order is not `delivered`

---

## Dispute Flow

### When Can Disputes Be Created?

#### 1. Shipped Status (Past Estimated Time)
- **Condition**: Order is `shipped` and estimated delivery date has passed
- **Allowed Dispute Types**: `non_delivery`, `product_fault`, `wrong_item`, `other`
- **Validation**: 
  - Checks if current date > `expected_delivery_date`
  - If no estimated date, allows after 7 days from shipping

#### 2. Delivered Status (Buyer Didn't Receive)
- **Condition**: Order is `delivered` but buyer didn't receive it
- **Allowed Dispute Types**: `non_delivery`, `product_fault`, `wrong_item`, `other`
- **Validation**: No time restriction - buyer can dispute immediately

#### 3. Received Status (Within Time Window)
- **Condition**: Order is `received` and within dispute window
- **Allowed Dispute Types**: `product_fault`, `wrong_item`, `other`
- **Validation**: 
  - Must be within `DELIVERED_TO_RECEIVED_MINUTES` after confirmation
  - Default: 24 hours (1440 minutes)

### Dispute Status Flow

```
created (open) → pending_admin_review → closed
```

1. **Created/Open**: Buyer creates dispute, status = `"open"`
2. **Pending Admin Review**: 
   - Seller doesn't respond within time → auto-escalated
   - Or seller responds but buyer doesn't accept → escalated
3. **Closed**: 
   - Resolved by seller and buyer
   - Or admin makes final ruling

### Dispute Restrictions

- **Cannot update order status** while dispute is open or pending admin review
- **Cannot confirm receipt** while dispute is open
- **Only one dispute** per order at a time

---

## System Configuration

All time-based configurations are in **minutes** for easier testing:

| Config Key | Default | Description |
|------------|---------|-------------|
| `SHIPPED_TO_DELIVERED_MINUTES` | 10 | Minimum minutes after shipping before seller can mark as delivered |
| `DELIVERED_TO_RECEIVED_MINUTES` | 10 | Minutes after delivery before auto-confirming (also used for dispute window) |
| `AUTO_CONFIRM_MINUTES` | 10 | Minutes after delivery to auto-confirm order |
| `DISPUTE_RESPONSE_MINUTES` | 10 | Minutes for seller to respond to dispute before auto-escalation |

**Note**: Default values are set to 10 minutes for testing. In production, these should be:
- `SHIPPED_TO_DELIVERED_MINUTES`: 60-120 minutes (1-2 hours)
- `DELIVERED_TO_RECEIVED_MINUTES`: 1440 minutes (24 hours)
- `AUTO_CONFIRM_MINUTES`: 1440 minutes (24 hours)
- `DISPUTE_RESPONSE_MINUTES`: 2880 minutes (48 hours)

---

## API Endpoints Summary

### Order Management
- `POST /api/v1/order/create` - Create order (status: `pending`)
- `PUT /api/v1/order/accept/:orderId` - Accept order (status: `pending` → `confirmed`)
- `PUT /api/v1/order/reject/:orderId` - Reject order (status: `pending` → `cancelled`)
- `PUT /api/v1/order/:orderId/product/:productId/status` - Update product status
- `PUT /api/v1/order/confirm-receipt/:orderId` - Confirm receipt (status: `delivered` → `received`)

### Dispute Management
- `POST /api/v1/order/dispute` - Create dispute
- `PUT /api/v1/order/dispute/:disputeId/respond` - Seller responds to dispute
- `PUT /api/v1/order/dispute/:disputeId/resolve` - Resolve dispute (seller/buyer)
- `PUT /api/v1/order/dispute/:disputeId/admin-ruling` - Admin makes final ruling

---

## Status Update Rules

### Seller Can Update Status:
- ✅ `confirmed` → `processing`
- ✅ `processing` → `shipped`
- ✅ `shipped` → `delivered` (after minimum time)

### Seller Cannot:
- ❌ Update status if dispute is open
- ❌ Reverse status (e.g., `delivered` → `shipped`)
- ❌ Skip statuses (e.g., `confirmed` → `shipped`)
- ❌ Update after `delivered` (buyer must confirm)

### Buyer Can:
- ✅ Confirm receipt when status is `delivered`
- ✅ Create dispute at appropriate times

### Buyer Cannot:
- ❌ Confirm receipt if status is not `delivered`
- ❌ Confirm receipt if dispute is open
- ❌ Update order status (only seller can)

---

## Example Flow

### Successful Order Flow

1. **Buyer places order**
   - Status: `pending`
   - Product quantity deducted

2. **Seller accepts order**
   - Status: `pending` → `confirmed`
   - Estimated delivery date: `2025-12-15`
   - Buyer notified

3. **Seller starts processing**
   - Status: `confirmed` → `processing`
   - Order being prepared

4. **Seller ships order**
   - Status: `processing` → `shipped`
   - `shippedAt`: `2025-12-10 10:00:00`
   - Buyer notified

5. **Seller marks as delivered** (after minimum time)
   - Status: `shipped` → `delivered`
   - `deliveredAt`: `2025-12-12 14:00:00`
   - Buyer notified, must confirm within 24 hours

6. **Buyer confirms receipt**
   - Status: `delivered` → `received`
   - `receivedAt`: `2025-12-12 16:00:00`
   - Payment status: `complete`
   - Seller notified

### Rejected Order Flow

1. **Buyer places order**
   - Status: `pending`

2. **Seller rejects order**
   - Status: `pending` → `cancelled`
   - Reason: "Out of stock"
   - Product quantity restored
   - Buyer notified

### Dispute Flow

1. **Order is delivered** (`delivered` status)
   - Buyer didn't receive order

2. **Buyer creates dispute**
   - Dispute status: `open`
   - Order `dispute_status`: `open`
   - Seller cannot update order status

3. **Seller responds** (within time limit)
   - Dispute status: `open` (waiting for buyer)

4. **Buyer doesn't accept** → Auto-escalated
   - Dispute status: `pending_admin_review`
   - Admin notified

5. **Admin makes ruling**
   - Dispute status: `closed`
   - Order `dispute_status`: `closed`
   - Payment status updated based on ruling
   - Both parties notified

---

## Error Messages

### Status Transition Errors
- `"Cannot change status from "X" to "Y". Allowed transitions: ..."`
- `"Cannot change status. Order is already delivered. Status cannot be reversed."`
- `"Cannot update order status while dispute is open. Please resolve the dispute first."`

### Dispute Errors
- `"Cannot create dispute. Order must be in "shipped", "delivered", or "received" status."`
- `"Cannot create dispute. Estimated delivery date has not passed yet."`
- `"Cannot create dispute. Order was confirmed more than X minutes ago."`

### Confirmation Errors
- `"Cannot confirm receipt. Order status is "X". Order must be in "delivered" status."`
- `"Cannot confirm receipt while dispute is open. Please resolve the dispute first."`

---

## Testing Checklist

- [ ] Order placed with `pending` status
- [ ] Seller accepts order with estimated delivery date
- [ ] Order status changes to `confirmed` after acceptance
- [ ] Seller can change `confirmed` → `processing`
- [ ] Seller can change `processing` → `shipped`
- [ ] Seller cannot mark as `delivered` immediately after `shipped`
- [ ] Seller can mark as `delivered` after minimum time
- [ ] Buyer can confirm receipt when status is `delivered`
- [ ] Order auto-confirms after timeout if buyer doesn't respond
- [ ] Status cannot be reversed (e.g., `delivered` → `shipped`)
- [ ] Dispute can be created at `shipped` (if past estimated time)
- [ ] Dispute can be created at `delivered`
- [ ] Dispute can be created at `received` (within time window)
- [ ] Cannot update status while dispute is open
- [ ] Cannot confirm receipt while dispute is open
- [ ] Seller rejection sets status to `cancelled` and restores quantity

---

## Summary

The order status management system enforces a strict one-way flow:
- **pending** → **confirmed** → **processing** → **shipped** → **delivered** → **received**

With proper validations:
- ✅ Status transitions are validated
- ✅ Status reversals are prevented
- ✅ Disputes block status updates
- ✅ Time restrictions are enforced
- ✅ Buyer confirmation is required
- ✅ Auto-confirmation after timeout

All status changes are logged in `OrderHistory` for audit trail.

