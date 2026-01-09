# Dispute Notification Flow - Complete Implementation

## Overview
The dispute resolution system now includes comprehensive notifications for all parties involved in a dispute lifecycle:
- **Buyer** (customer making the claim)
- **Product Owner** (Farmer/Supplier who listed the product)
- **Seller** (Order seller, which may differ from product owner in multi-vendor orders)
- **Admin** (if dispute escalates)

## Key Implementation Details

### 1. Dispute Creation (`POST /api/v1/order/dispute/:orderId`)

**Notifications Sent:**
1. **Product Owner Notification** (NEW)
   - The farmer/supplier who uploaded the disputed product
   - Role: Automatically detected from `Products.upLoadedBy.role`
   - Message: "A dispute has been created for order..."
   - Priority: High
   - Email: Enabled

2. **Buyer Confirmation Notification**
   - Sent to the dispute creator
   - Role: Automatically detected from `Order.userRole` (can be "buyer" or "farmer")
   - Message: "Your dispute for order #XX has been submitted..."
   - Priority: Medium
   - Email: Enabled

**Database Changes:**
- New fields in `Dispute` model:
  ```javascript
  productId: ObjectId,              // Product being disputed
  productOwnerId: ObjectId,         // ID of product uploader
  productOwnerRole: String,         // "farmer" or "supplier"
  ```

**Code Location:** `controllers/order.js` - `createDispute()` function (~lines 2055-2145)

### 2. Seller Response (`PUT /api/v1/order/dispute/:disputeId/respond`)

**Workflow:**
1. Seller responds with proposal + evidence
2. Dispute status changes: `"open"` → `"seller_responded"`
3. Order dispute status remains: `"open"` (buyer still deciding)

**Notifications Sent:**
1. **Buyer Notification**
   - Title: "Seller Responded to Dispute"
   - Message: "The seller has responded to your dispute... Please review their proposal."
   - Priority: Medium
   - Email: Enabled

**Code Location:** `controllers/order.js` - `respondToDispute()` function (~line 2390)

### 3. Buyer Resolution (`PUT /api/v1/order/dispute/:disputeId/resolve`)

**Two Outcomes:**

#### A. Buyer Accepts Proposal
- Dispute status: `"seller_responded"` → `"closed"`
- No admin involvement
- Order dispute status: `"closed"`

**Notifications Sent:**
- Seller notification: "Dispute accepted"
- Buyer confirmation: "Dispute resolved"

#### B. Buyer Rejects Proposal
- Dispute status: `"seller_responded"` → `"pending_admin_review"`
- Escalates to admin
- Order dispute status: `"pending_admin_review"`

**Notifications Sent:**
1. **All Admins Notification**
   - Title: "Dispute Escalated to Admin Review"
   - Message: "A dispute requires your review and decision..."
   - Priority: High
   - Email: Enabled

2. **Buyer Confirmation**
   - Message: "Your dispute has been escalated to admin..."

3. **Seller Notification**
   - Message: "Your dispute response was not accepted. Admin will make a decision..."

**Code Location:** `controllers/order.js` - `resolveDispute()` function (~line 2555)

### 4. Admin Ruling (`PUT /api/v1/order/dispute/:disputeId/admin-ruling`)

**Workflow:**
1. Admin reviews evidence from both sides
2. Admin makes decision: `"buyer_win"` or `"seller_win"`
3. Dispute status: `"pending_admin_review"` → `"closed"`

**Notifications Sent:**
1. **Buyer Notification**
   - If `buyer_win`: "Admin decision in your favor. Refund/compensation will be processed."
   - If `seller_win`: "Admin decision favored the seller. Dispute closed."

2. **Seller Notification**
   - If `buyer_win`: "Admin decision favored the buyer. Refund/compensation required."
   - If `seller_win`: "Admin decision in your favor. Dispute closed."

**Code Location:** `controllers/order.js` - `adminRuling()` function (~line 2440)

### 5. Manual Notification (Admin Override)

**Endpoint:** `POST /api/v1/admin/disputes/:disputeId/notify`

**Functionality:**
- Admins can send custom notifications to any party
- Allows manual case-by-case communication
- Useful for requesting additional evidence or clarifications

**Frontend Implementation:**
- Button in `AdminDisputeManagement.jsx`
- Modal for composing custom title/message
- Recipient targeting option

**Code Location:** `controllers/admin.js` - `notifyDispute()` function

## Notification Utility Integration

**File:** `utils/notifications.js`

**Function Signature:**
```javascript
createNotification(userId, userRole, type, title, message, options)
```

**Features:**
- Automatic DB notification creation
- Automatic email sending via `sendEmail`
- Support for related IDs and action URLs
- Priority levels: "low", "medium", "high"

**Supported Roles:**
- "buyer"
- "farmer"
- "supplier"
- "admin"

## Dispute Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISPUTE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CREATE DISPUTE                                                  │
│  ↓                                                                │
│  Status: "open"                                                  │
│  Notifications → Product Owner, Buyer                           │
│  ↓                                                                │
│  SELLER RESPONDS                                                 │
│  ↓                                                                │
│  Status: "seller_responded"                                      │
│  Notification → Buyer (proposal received)                        │
│  ↓                                                                │
│  BUYER DECISION                                                  │
│  ├─ ACCEPT PROPOSAL                                              │
│  │  Status: "closed"                                             │
│  │  Notifications → Seller, Buyer                               │
│  │  END                                                          │
│  │                                                                │
│  └─ REJECT PROPOSAL                                              │
│     Status: "pending_admin_review"                               │
│     Notifications → All Admins, Buyer, Seller                   │
│     ↓                                                              │
│     ADMIN REVIEW                                                 │
│     ↓                                                              │
│     Status: "closed"                                             │
│     Notifications → Buyer, Seller (ruling + decision)           │
│     END                                                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Email Template Examples

### 1. Dispute Created (Product Owner)
```
Subject: New Dispute Created - Order #[ORDER_ID]

Dear [PRODUCT_OWNER_NAME],

A dispute has been created for order #[ORDER_ID] regarding one of your products.

Dispute Details:
- Dispute Type: [TYPE]
- Reason: [REASON]
- Buyer Proof: [IMAGES/DESCRIPTION]

Please respond with your evidence and proposal within 48 hours.

[ACTION_LINK]
```

### 2. Seller Response (Buyer)
```
Subject: Seller Response to Your Dispute - Order #[ORDER_ID]

Dear [BUYER_NAME],

The seller has responded to your dispute for order #[ORDER_ID].

Seller's Proposal:
[PROPOSAL]

Supporting Evidence: [IMAGES/DOCUMENTS]

You can now accept or reject this proposal. If rejected, your dispute will be escalated to admin review.

[ACTION_LINK]
```

### 3. Dispute Escalated (Admin)
```
Subject: URGENT - Dispute Requires Admin Review - Order #[ORDER_ID]

Dear Admin,

A dispute has been escalated to admin review and requires your decision.

Order: #[ORDER_ID]
Buyer vs Seller: [BUYER_NAME] vs [SELLER_NAME]
Dispute Type: [TYPE]

Review the evidence and make a ruling.

[ACTION_LINK]
```

### 4. Admin Ruling (Both Parties)
```
Subject: Dispute Decision - Order #[ORDER_ID]

Dear [PARTY_NAME],

The admin has made a decision on your dispute.

Decision: [BUYER_WIN / SELLER_WIN]
Reason: [ADMIN_NOTES]

[If BUYER_WIN: Refund/compensation details]
[If SELLER_WIN: Dispute closed confirmation]

[ACTION_LINK]
```

## Testing Checklist

- [ ] Create dispute → verify product owner notification sent
- [ ] Create dispute → verify buyer confirmation notification sent
- [ ] Seller responds → verify buyer notified with proposal
- [ ] Buyer accepts → verify dispute closes, seller & buyer notified
- [ ] Buyer rejects → verify all admins notified
- [ ] Admin rules → verify both parties notified with decision
- [ ] Admin manual notify → verify custom message sent to target

## Known Limitations & Future Enhancements

1. **Multi-Product Disputes**: Currently handles single product per dispute
2. **Batch Notifications**: Can optimize to batch admin notifications if multiple disputes escalate
3. **Notification Preferences**: Consider adding user preferences for notification channels
4. **Audit Trail**: Log all notification events for compliance
5. **Scheduled Reminders**: Auto-reminders if seller doesn't respond within 48 hours

## Troubleshooting

**Product Owner Not Being Notified:**
- Check: Is `Products.upLoadedBy` correctly populated?
- Check: Does product owner exist in database?
- Check: Email service configuration in `utils/notifications.js`

**Email Not Delivered:**
- Check: Email provider credentials in `config.env`
- Check: Email address is valid in user profile
- Check: Check email service logs/queue

**Notification Not Appearing in DB:**
- Check: `Notification` model has records
- Check: User role matches expected values
- Check: No errors in controller console logs
