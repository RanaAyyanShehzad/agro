# Complete Dispute Notification System - Examples & Testing Guide

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                   DISPUTE NOTIFICATION SYSTEM                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PHASE 1: DISPUTE CREATION                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Buyer initiates dispute                                      │ │
│  │ ↓                                                             │ │
│  │ System looks up: Product owner from Products.upLoadedBy      │ │
│  │ ↓                                                             │ │
│  │ NOTIFICATIONS SENT:                                          │ │
│  │ 1. Product Owner (Farmer/Supplier) - PRIORITY: HIGH         │ │
│  │ 2. Buyer (Confirmation) - PRIORITY: MEDIUM                  │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  PHASE 2: SELLER RESPONSE                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Product Owner responds with proposal + evidence              │ │
│  │ Dispute status: open → seller_responded                     │ │
│  │ ↓                                                             │ │
│  │ NOTIFICATIONS SENT:                                          │ │
│  │ 1. Buyer - PRIORITY: MEDIUM                                 │ │
│  │    Message: "Seller responded... please review proposal"    │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  PHASE 3: BUYER DECISION                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Option A: ACCEPT PROPOSAL                                    │ │
│  │           ↓                                                   │ │
│  │           Dispute closed (seller_responded → closed)         │ │
│  │           ↓                                                   │ │
│  │           NOTIFICATIONS:                                     │ │
│  │           1. Seller - Dispute accepted                       │ │
│  │           2. Buyer - Confirmation                            │ │
│  │                                                               │ │
│  │ Option B: REJECT PROPOSAL                                    │ │
│  │           ↓                                                   │ │
│  │           Escalate to admin (seller_responded → pending_...) │ │
│  │           ↓                                                   │ │
│  │           NOTIFICATIONS:                                     │ │
│  │           1. All Admins - PRIORITY: HIGH                    │ │
│  │           2. Buyer - Confirmation                            │ │
│  │           3. Seller - Notification of escalation             │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  PHASE 4: ADMIN REVIEW & DECISION                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Admin reviews evidence and makes ruling                       │ │
│  │ Decision: buyer_win OR seller_win                            │ │
│  │ Dispute status: pending_admin_review → closed               │ │
│  │ ↓                                                             │ │
│  │ NOTIFICATIONS SENT:                                          │ │
│  │ 1. Buyer - Decision + compensation details (if won)          │ │
│  │ 2. Seller - Decision + refund/penalty (if lost)             │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## API Endpoints & Payloads

### 1. Create Dispute
**Endpoint:** `POST /api/v1/order/dispute/:orderId`

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "disputeType": "product_fault",
  "reason": "Product arrived damaged and not usable",
  "proofOfFault": {
    "images": [
      "https://example.com/damage1.jpg",
      "https://example.com/damage2.jpg"
    ],
    "description": "Visible cracks on the packaging and damage to the product inside"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Dispute created successfully",
  "dispute": {
    "_id": "507f1f77bcf86cd799439012",
    "orderId": {
      "_id": "507f1f77bcf86cd799439001",
      "orderNumber": "ORD-2024-12345",
      "status": "delivered"
    },
    "buyerId": {
      "_id": "507f1f77bcf86cd799439002",
      "name": "Ahmed Khan",
      "email": "ahmed@example.com"
    },
    "sellerId": {
      "_id": "507f1f77bcf86cd799439003",
      "name": "Green Farm Produce",
      "email": "farm@example.com"
    },
    "sellerRole": "farmer",
    "productId": "507f1f77bcf86cd799439011",
    "productOwnerId": "507f1f77bcf86cd799439003",
    "productOwnerRole": "farmer",
    "disputeType": "product_fault",
    "reason": "Product arrived damaged and not usable",
    "status": "open",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Notifications Triggered:**
```
[DISPUTE] Product owner (farmer) 507f1f77bcf86cd799439003 notified about dispute 507f1f77bcf86cd799439012
[DISPUTE] Buyer (buyer) 507f1f77bcf86cd799439002 notified about dispute creation for order 507f1f77bcf86cd799439001
```

### 2. Seller Responds to Dispute
**Endpoint:** `PUT /api/v1/order/dispute/:disputeId/respond`

**Request Body:**
```json
{
  "proposal": "We will replace the product immediately with proper packaging",
  "evidence": [
    "https://example.com/invoice.pdf",
    "https://example.com/shipping-record.pdf"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Response submitted successfully",
  "dispute": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "seller_responded",
    "sellerResponse": {
      "proposal": "We will replace the product immediately with proper packaging",
      "evidence": [
        "https://example.com/invoice.pdf",
        "https://example.com/shipping-record.pdf"
      ],
      "respondedAt": "2024-01-15T14:00:00Z"
    }
  }
}
```

**Notifications Triggered:**
```
Buyer receives: "Seller Responded to Dispute"
Message: "The seller has responded to your dispute... Please review their proposal."
```

### 3. Buyer Accept/Reject Proposal
**Endpoint:** `PUT /api/v1/order/dispute/:disputeId/resolve`

**Request Body - Accept:**
```json
{
  "action": "accept"
}
```

**Request Body - Reject:**
```json
{
  "action": "reject",
  "reason": "Replacement is not acceptable. Product quality is consistently poor."
}
```

**Response (200) - Accept:**
```json
{
  "success": true,
  "message": "Dispute accepted and closed",
  "dispute": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "closed",
    "buyerAccepted": true,
    "resolvedAt": "2024-01-15T15:00:00Z"
  }
}
```

**Notifications Triggered (Accept):**
```
1. Seller: "Dispute Accepted"
   Message: "The buyer has accepted your proposal. Dispute resolved."
2. Buyer: "Dispute Resolved"
   Message: "You have accepted the seller's proposal. Dispute closed."
```

**Notifications Triggered (Reject):**
```
1. All Admins: "Dispute Escalated to Admin Review" (HIGH PRIORITY)
   Message: "A dispute requires your review and decision..."
2. Buyer: "Dispute Escalated"
   Message: "Your dispute has been escalated to admin review."
3. Seller: "Dispute Escalated"
   Message: "Your dispute response was not accepted. Admin will make a decision..."
```

### 4. Admin Make Ruling
**Endpoint:** `PUT /api/v1/order/dispute/:disputeId/admin-ruling`

**Request Body - Buyer Win:**
```json
{
  "decision": "buyer_win",
  "notes": "Product damage confirmed. Seller responsible for quality assurance.",
  "compensation": {
    "type": "refund",
    "amount": 500,
    "currency": "PKR",
    "details": "Full refund for damaged product"
  }
}
```

**Request Body - Seller Win:**
```json
{
  "decision": "seller_win",
  "notes": "Evidence suggests shipping damage, not manufacturing defect. Seller not responsible.",
  "compensation": {
    "type": "none",
    "details": "Dispute closed without compensation"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ruling submitted successfully",
  "dispute": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "closed",
    "adminRuling": {
      "decision": "buyer_win",
      "notes": "Product damage confirmed...",
      "compensation": {
        "type": "refund",
        "amount": 500,
        "currency": "PKR"
      },
      "ruledAt": "2024-01-16T10:00:00Z",
      "adminId": "507f1f77bcf86cd799439004"
    },
    "resolvedAt": "2024-01-16T10:00:00Z"
  }
}
```

**Notifications Triggered (Buyer Win):**
```
1. Buyer: "Dispute Decision: You Won"
   Message: "Admin decision in your favor. Refund of PKR 500 will be processed within 5 business days."
   Email: Includes compensation details and processing timeline

2. Seller: "Dispute Decision: You Lost"
   Message: "Admin decision favored the buyer. Refund of PKR 500 is required."
   Email: Includes compensation details and refund timeline
```

**Notifications Triggered (Seller Win):**
```
1. Buyer: "Dispute Decision: You Lost"
   Message: "Admin decision favored the seller. Dispute closed."
   Email: Includes admin reasoning

2. Seller: "Dispute Decision: You Won"
   Message: "Admin decision in your favor. Dispute closed."
   Email: Confirmation of decision
```

### 5. Manual Admin Notification
**Endpoint:** `POST /api/v1/admin/disputes/:disputeId/notify`

**Request Body:**
```json
{
  "recipientRole": "buyer",
  "title": "Additional Evidence Needed",
  "message": "We need additional photographic evidence of the damage. Please upload clear photos of the damage.",
  "sendEmail": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "notification": {
    "_id": "507f1f77bcf86cd799439005",
    "userId": "507f1f77bcf86cd799439002",
    "type": "dispute_manual_notification",
    "title": "Additional Evidence Needed",
    "message": "We need additional photographic evidence...",
    "createdAt": "2024-01-16T11:00:00Z"
  }
}
```

## Database Record Examples

### Notification Records
```javascript
// In Notification Collection
{
  "_id": ObjectId("507f1f77bcf86cd799439005"),
  "userId": ObjectId("507f1f77bcf86cd799439003"),  // Farmer/Supplier
  "userRole": "farmer",
  "type": "dispute_created",
  "title": "New Dispute Created",
  "message": "A dispute has been created for order #ORD-2024-12345 regarding a product. Please respond to resolve it.",
  "priority": "high",
  "relatedId": ObjectId("507f1f77bcf86cd799439012"),
  "relatedType": "dispute",
  "actionUrl": "/disputes/507f1f77bcf86cd799439012",
  "emailSent": true,
  "emailSentAt": "2024-01-15T10:31:00Z",
  "read": false,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Dispute Record
```javascript
// In Dispute Collection
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "orderId": ObjectId("507f1f77bcf86cd799439001"),
  "buyerId": ObjectId("507f1f77bcf86cd799439002"),
  "sellerId": ObjectId("507f1f77bcf86cd799439003"),
  "sellerRole": "farmer",
  "buyerRole": "buyer",
  "productId": ObjectId("507f1f77bcf86cd799439011"),
  "productOwnerId": ObjectId("507f1f77bcf86cd799439003"),
  "productOwnerRole": "farmer",
  "disputeType": "product_fault",
  "reason": "Product arrived damaged...",
  "status": "seller_responded",
  "buyerProof": {
    "images": ["url1", "url2"],
    "description": "Visible cracks...",
    "uploadedAt": "2024-01-15T10:30:00Z"
  },
  "sellerResponse": {
    "evidence": ["pdf1", "pdf2"],
    "proposal": "We will replace...",
    "respondedAt": "2024-01-15T14:00:00Z"
  },
  "buyerAccepted": false,
  "adminRuling": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:00:00Z"
}
```

## Testing Scenarios

### Scenario 1: Single Vendor (Order Seller = Product Owner)
```
Farmer A uploads Product X
Farmer A (as seller) lists order
Buyer B purchases Product X
Buyer B creates dispute for Product X

Expected Notifications:
✓ Farmer A notified (product owner = order seller)
✓ Buyer B notified (confirmation)
```

### Scenario 2: Multi-Vendor (Different Product Owners)
```
Farmer A uploads Product X
Farmer B uploads Product Y  
Buyer C purchases both products in one order
Farmer B listed as order.sellerId
Buyer C creates dispute for Product X

Expected Notifications:
✓ Farmer A notified (actual product owner)
✓ Buyer C notified (confirmation)
✗ Farmer B NOT notified (not owner of disputed product)
```

### Scenario 3: Product Owner Lookup Failure
```
Product ID invalid or missing from database
Buyer creates dispute

Expected Behavior:
✓ Dispute created successfully
✓ System falls back to order.sellerId
✓ order.sellerId notified instead
✓ Error logged: "[DISPUTE ERROR] Failed to lookup product owner"
```

### Scenario 4: Notification System Failure
```
Email service down during dispute creation
Buyer creates dispute

Expected Behavior:
✓ Dispute created successfully
✓ DB notification created
✓ Email sending fails gracefully
✓ Error logged: "[DISPUTE ERROR] Failed to send product owner notification"
✓ Admin can manually resend via manual notification endpoint
```

## Monitoring & Debugging

### Log Patterns to Monitor
```
[DISPUTE] Product owner (farmer) 507f1f77bcf86cd799439003 notified about dispute...
[DISPUTE] Buyer (buyer) 507f1f77bcf86cd799439002 notified about dispute creation...
[DISPUTE ERROR] Failed to lookup product owner: [ERROR_DETAILS]
[DISPUTE ERROR] Failed to send product owner notification: [ERROR_DETAILS]
```

### Database Queries for Debugging

**Find all disputes for a product owner:**
```javascript
db.disputes.find({ productOwnerId: ObjectId("507f1f77bcf86cd799439003") })
```

**Find all notifications sent to a seller about disputes:**
```javascript
db.notifications.find({
  userId: ObjectId("507f1f77bcf86cd799439003"),
  type: "dispute_created"
})
```

**Check notification delivery status:**
```javascript
db.notifications.find({
  relatedType: "dispute",
  emailSent: true,
  emailSentAt: { $exists: true }
}).count()
```

## Success Metrics

1. **Notification Delivery Rate:** 99%+ of disputes result in product owner notification
2. **Email Delivery Rate:** 95%+ of notifications sent via email are delivered
3. **Response Time:** Average seller response within 24 hours
4. **Resolution Rate:** 80%+ of disputes resolved without admin intervention
5. **Admin Escalation Rate:** <20% of disputes escalated to admin
6. **Customer Satisfaction:** 4.5+/5.0 rating for dispute resolution process
