# Order Status Flow & Dispute Handling

## Complete Order Status Flow

### Status Sequence:
```
pending → confirmed → processing → shipped → out_for_delivery → delivered → received
```

### Detailed Status Flow:

1. **pending** (Initial Status)
   - Order is created by buyer
   - Waiting for seller to accept/reject
   - **Action**: Seller can accept (→ confirmed) or reject (→ canceled)

2. **confirmed** (After Seller Accepts)
   - Seller has accepted the order
   - Order is being prepared
   - **Action**: Seller can update to "processing"

3. **processing** (Order Being Prepared)
   - Seller is preparing the order
   - Products are being packaged
   - **Action**: Seller can update to "shipped"

4. **shipped** (Order Dispatched)
   - Order has been shipped
   - `expected_delivery_date` is automatically set (default: 7 days from shipped date)
   - `shippedAt` timestamp is set
   - **Action**: Seller can mark as "out_for_delivery"
   - **Dispute**: Buyer can create dispute if expected delivery date has expired

5. **out_for_delivery** (On the Way)
   - Order is out for delivery with vehicle and rider details
   - `trackingId` is generated (if not already set)
   - `outForDeliveryAt` timestamp is set
   - Vehicle and rider information is stored
   - **Action**: Buyer can confirm delivery (→ delivered)
   - **Dispute**: Buyer can create dispute for non-delivery

6. **delivered** (Buyer Confirmed Delivery)
   - Buyer has confirmed receiving the order
   - `deliveredAt` timestamp is set
   - **Action**: Buyer can confirm receipt (→ received)
   - **Dispute**: Buyer can still create dispute for product faults/issues

7. **received** (Final Status)
   - Buyer has confirmed receipt
   - Payment is completed
   - `receivedAt` timestamp is set
   - `payment_status` is set to "complete"
   - **Action**: No further actions (order complete)
   - **Dispute**: Buyer can still create dispute for product quality/faults

### Status Transitions (Who Can Do What):

| From Status | To Status | Who Can Do | Notes |
|------------|-----------|------------|-------|
| pending | confirmed | Seller | Seller accepts order |
| pending | canceled | Seller | Seller rejects order |
| confirmed | processing | Seller | Seller starts processing |
| confirmed | canceled | Seller | Seller cancels |
| processing | shipped | Seller | Seller ships order |
| processing | canceled | Seller | Seller cancels |
| shipped | out_for_delivery | Seller | Seller marks with vehicle/rider details |
| shipped | canceled | Seller | Seller cancels |
| out_for_delivery | delivered | **Buyer Only** | Buyer confirms delivery |
| delivered | received | **Buyer Only** | Buyer confirms receipt & completes payment |
| Any | canceled | Buyer | Buyer can cancel before delivery |

**Important**: Sellers CANNOT directly mark orders as "delivered" or "received". Only buyers can confirm delivery and receipt.

## Dispute Creation Rules

### When Can Disputes Be Created?

Disputes can be created in the following scenarios:

1. **After Order is "shipped" AND Expected Delivery Date Expired**
   - Order status must be "shipped"
   - `expected_delivery_date` must be set
   - Current date must be after `expected_delivery_date` (with 1 day buffer)
   - **Reason**: Non-delivery after expected date

2. **After Order is "out_for_delivery"**
   - Order status must be "out_for_delivery"
   - Buyer can dispute non-delivery
   - **Reason**: Order not received despite being out for delivery

3. **After Order is "delivered"**
   - Order status must be "delivered"
   - Buyer confirmed delivery but can dispute product issues
   - **Reason**: Product fault, wrong item, or other issues

4. **After Order is "received"**
   - Order status must be "received"
   - Buyer can still dispute product quality/faults
   - **Reason**: Product quality issues discovered after receipt

### Dispute Types:

- **non_delivery**: Order not received
- **product_fault**: Product is damaged or faulty
- **wrong_item**: Wrong product received
- **other**: Other issues

### Dispute Status Flow:

```
open → pending_admin_review → closed
```

1. **open**: Dispute created by buyer, waiting for seller response
2. **pending_admin_review**: Seller responded, waiting for buyer acceptance or admin ruling
3. **closed**: Dispute resolved (buyer accepted seller's proposal OR admin made ruling)

### Dispute Workflow:

1. **Buyer Creates Dispute**
   - Buyer creates dispute with type, reason, and proof (images)
   - Order `dispute_status` is set to "open"
   - Seller is notified

2. **Seller Responds**
   - Seller provides evidence and resolution proposal
   - Dispute status changes to "pending_admin_review"
   - Buyer is notified

3. **Buyer Accepts/Rejects Seller's Proposal**
   - If buyer accepts: Dispute is closed, order dispute_status is "closed"
   - If buyer rejects: Dispute remains "pending_admin_review" for admin intervention

4. **Admin Ruling** (if buyer rejects or escalates)
   - Admin reviews dispute and makes decision (buyer_win or seller_win)
   - Dispute is closed
   - Both parties are notified

### Important Notes:

- **Disputes Block Status Updates**: While a dispute is open or pending admin review, order status cannot be updated
- **Disputes Can Be Created After Delivery**: Buyers can create disputes even after confirming delivery/receipt for product quality issues
- **Expected Delivery Date**: Automatically set to 7 days from shipped date if not provided by seller
- **Tracking ID**: Generated when order is marked as "out_for_delivery" (if not already set)

## Order Status Restrictions During Disputes:

- Orders with `dispute_status` = "open" or "pending_admin_review" cannot have their status updated
- This prevents status changes while disputes are being resolved
- Once dispute is closed, normal status flow resumes

