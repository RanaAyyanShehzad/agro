# Payment Status Management

## Overview
This document describes how payment status is managed based on order status and payment method.

---

## Payment Methods

The system supports two payment methods:
1. **Cash on Delivery** (`"cash-on-delivery"`)
2. **Online Payment** (`"easypaisa"` or `"jazzcash"`)

---

## Payment Status Values

| Status | Description |
|--------|-------------|
| `pending` | Payment is pending (initial state) |
| `complete` | Payment is completed |
| `refunded` | Payment was refunded (for cancelled orders with online payment) |
| `cancelled` | Payment was cancelled (for cancelled orders with cash-on-delivery) |

---

## Payment Status Flow

### 1. Order Creation
- **Initial Status**: `payment_status = "pending"` and `paymentInfo.status = "pending"`
- **Note**: For online payments, if payment gateway confirms payment, `paymentInfo.status` should be updated to `"completed"` at this stage (handled by payment gateway integration)

### 2. Order Cancellation

When an order is cancelled, payment status is updated based on payment method:

#### Cash on Delivery
- **Payment Status**: `"cancelled"`
- **Reason**: No payment was made, so it's simply cancelled

#### Online Payment (easypaisa/jazzcash)
- **Payment Status**: `"refunded"`
- **Reason**: Payment was already made, so it needs to be refunded

**Implementation Locations**:
- `controllers/orderMultiVendor.js` - `cancelOrder()`
- `controllers/orderWorkflow.js` - `rejectOrder()` (when all products rejected)
- `controllers/order.js` - `cancelOrder()` (old Order model)

### 3. Order Received (Buyer Confirms)

When buyer confirms receipt of delivered order:
- **Payment Status**: `"complete"` (for both payment methods)
- **Payment Info Status**: `"completed"`
- **Paid At**: Set to current timestamp

**Implementation Location**:
- `controllers/orderManagement.js` - `confirmOrderReceipt()`

**Note**: 
- For **cash-on-delivery**: Payment is collected when order is delivered, so it's marked as complete when buyer confirms
- For **online payment**: Payment should already be complete (paid upfront), but this ensures it's marked as complete

### 4. Auto-Confirmation

When order is auto-confirmed after timeout:
- **Payment Status**: `"complete"`
- **Payment Info Status**: `"completed"`
- **Paid At**: Set to current timestamp

**Implementation Location**:
- `jobs/orderAutoConfirmation.js` - `startOrderAutoConfirmation()`

### 5. Dispute Resolution

#### Buyer Accepts Seller's Proposal
- **Payment Status**: `"complete"`
- **Payment Info Status**: `"completed"`

#### Admin Ruling
- **If Buyer Wins**: 
  - **Payment Status**: `"refunded"`
  - **Payment Info Status**: `"refunded"`
- **If Seller Wins**:
  - **Payment Status**: `"complete"`
  - **Payment Info Status**: `"completed"`

**Implementation Location**:
- `controllers/orderManagement.js` - `resolveDispute()` and `adminRulingOnDispute()`

---

## Payment Status Update Logic

### Code Pattern

```javascript
// When cancelling order
if (order.paymentInfo) {
  const paymentMethod = order.paymentInfo.method;
  
  if (paymentMethod === "cash-on-delivery") {
    order.payment_status = "cancelled";
    order.paymentInfo.status = "cancelled";
  } else {
    // easypaisa or jazzcash - payment was made, needs refund
    order.payment_status = "refunded";
    order.paymentInfo.status = "refunded";
  }
} else {
  // Fallback if paymentInfo doesn't exist
  order.payment_status = "cancelled";
}
```

### When Order is Received

```javascript
// Mark payment as complete when buyer confirms receipt
order.payment_status = "complete";
if (order.paymentInfo) {
  order.paymentInfo.status = "completed";
  if (!order.paymentInfo.paidAt) {
    order.paymentInfo.paidAt = new Date();
  }
}
```

---

## Payment Status by Order Status

| Order Status | Cash on Delivery | Online Payment |
|-------------|------------------|----------------|
| `pending` | `pending` | `pending` (or `completed` if payment confirmed) |
| `confirmed` | `pending` | `pending` (or `completed` if payment confirmed) |
| `processing` | `pending` | `pending` (or `completed` if payment confirmed) |
| `shipped` | `pending` | `pending` (or `completed` if payment confirmed) |
| `delivered` | `pending` | `pending` (or `completed` if payment confirmed) |
| `received` | `complete` | `complete` |
| `cancelled` | `cancelled` | `refunded` |

---

## Important Notes

1. **Online Payment Integration**: 
   - When integrating with payment gateway (easypaisa/jazzcash), update `paymentInfo.status` to `"completed"` when payment is confirmed
   - This should happen during order creation or immediately after

2. **Cash on Delivery**:
   - Payment remains `pending` until buyer confirms receipt
   - Once confirmed, payment is marked as `complete`

3. **Refunds**:
   - Only applicable for online payments when order is cancelled
   - Cash-on-delivery orders don't need refunds (no payment was made)

4. **Dispute Resolution**:
   - If buyer wins dispute, payment is refunded (for online payments)
   - If seller wins, payment is marked as complete

---

## Testing Checklist

- [ ] Order created with cash-on-delivery → payment_status = "pending"
- [ ] Order created with online payment → payment_status = "pending" (or "completed" if payment confirmed)
- [ ] Order cancelled (cash-on-delivery) → payment_status = "cancelled"
- [ ] Order cancelled (online payment) → payment_status = "refunded"
- [ ] Order received (buyer confirms) → payment_status = "complete"
- [ ] Order auto-confirmed → payment_status = "complete"
- [ ] Dispute resolved (buyer accepts) → payment_status = "complete"
- [ ] Dispute admin ruling (buyer wins) → payment_status = "refunded"
- [ ] Dispute admin ruling (seller wins) → payment_status = "complete"

---

## Summary

Payment status is automatically managed based on:
- **Order status** (pending, confirmed, processing, shipped, delivered, received, cancelled)
- **Payment method** (cash-on-delivery vs online payment)
- **Dispute resolution** (if applicable)

The system ensures:
- ✅ Cash-on-delivery orders are marked as "cancelled" when cancelled (no payment made)
- ✅ Online payment orders are marked as "refunded" when cancelled (payment needs refund)
- ✅ Payment is marked as "complete" when order is received (for both methods)
- ✅ Payment status is properly updated during dispute resolution

