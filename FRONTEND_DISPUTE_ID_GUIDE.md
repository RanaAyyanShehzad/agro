# FRONTEND GUIDE: How to Get disputeId and orderId

## 🎯 Quick Answer

**For Sellers (Farmers/Suppliers):**
```javascript
// Get all disputes - each dispute has _id (disputeId) and orderId
GET /api/v1/order/disputes

// Response:
{
  success: true,
  disputes: [
    {
      _id: "692b148b3d3116503dc6f961",  // ← This is disputeId
      orderId: {
        _id: "69293fdf4fbb23e04c7dc009",  // ← This is orderId
        ...
      }
    }
  ]
}
```

**For Buyers:**
```javascript
// Get all disputes - each dispute has _id (disputeId) and orderId
GET /api/v1/order/disputes/buyer

// Response: Same structure as seller
```

---

## 📝 SIMPLIFIED FRONTEND CODE

### For Seller Dispute Response Modal:

```javascript
import React, { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "https://agrofarm-vd8i.onrender.com/api/v1";

function DisputeResponseModal({ isOpen, onClose, dispute, onSuccess }) {
  const [evidence, setEvidence] = useState([]);
  const [proposal, setProposal] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disputeId, setDisputeId] = useState(null);

  useEffect(() => {
    if (!isOpen || !dispute) return;

    // dispute._id is the disputeId - it's already in the dispute object!
    if (dispute._id && /^[0-9a-fA-F]{24}$/.test(dispute._id)) {
      setDisputeId(dispute._id);
    } else {
      // If dispute object doesn't have _id, fetch disputes list
      fetchDisputes();
    }
  }, [isOpen, dispute]);

  const fetchDisputes = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/order/disputes`,
        { withCredentials: true }
      );

      if (response.data.success && response.data.disputes?.length > 0) {
        // Find the dispute that matches the orderId
        const orderId = dispute.orderId?._id || dispute.orderId;
        const foundDispute = response.data.disputes.find(
          d => d.orderId?._id === orderId || d.orderId === orderId
        );

        if (foundDispute?._id) {
          setDisputeId(foundDispute._id);
        } else {
          toast.error("Dispute not found. Please refresh the page.");
        }
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
      toast.error("Failed to fetch disputes. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!disputeId) {
      toast.error("Dispute ID not found. Please try again.");
      return;
    }

    if (!proposal.trim() || evidence.length === 0) {
      toast.error("Please provide evidence and proposal");
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.put(
        `${API_BASE}/order/dispute/${disputeId}/respond`,
        {
          evidence,
          proposal: proposal.trim()
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Dispute response submitted successfully");
        onClose();
        setEvidence([]);
        setProposal("");
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit response"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ... rest of component
}
```

---

## 🔄 RECOMMENDED APPROACH

### Option 1: Get disputeId from disputes list (Recommended)

```javascript
// In your disputes page component
useEffect(() => {
  const fetchDisputes = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/order/disputes`,  // For sellers
        // `${API_BASE}/order/disputes/buyer`,  // For buyers
        { withCredentials: true }
      );

      if (response.data.success) {
        setDisputes(response.data.disputes);
        // Each dispute has:
        // - dispute._id → disputeId
        // - dispute.orderId → orderId (populated)
      }
    } catch (error) {
      console.error("Error fetching disputes:", error);
    }
  };

  fetchDisputes();
}, []);

// Then pass the dispute object to modal
<DisputeResponseModal 
  dispute={selectedDispute}  // Contains _id and orderId
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
/>
```

### Option 2: Get disputeId from notification

```javascript
// When notification is clicked
const handleNotificationClick = (notification) => {
  if (notification.relatedType === "dispute") {
    const disputeId = notification.relatedId;  // This is the disputeId
    
    // Fetch dispute details
    fetchDisputeDetails(disputeId);
  }
};

const fetchDisputeDetails = async (disputeId) => {
  try {
    const response = await axios.get(
      `${API_BASE}/order/dispute/${disputeId}`,  // For sellers
      // `${API_BASE}/order/dispute/buyer/${disputeId}`,  // For buyers
      { withCredentials: true }
    );

    if (response.data.success) {
      const dispute = response.data.dispute;
      // dispute._id → disputeId
      // dispute.orderId → orderId
      openDisputeModal(dispute);
    }
  } catch (error) {
    console.error("Error fetching dispute:", error);
  }
};
```

---

## 📋 ENDPOINTS SUMMARY

### Seller Endpoints:
- `GET /api/v1/order/disputes` - Get all seller disputes
- `GET /api/v1/order/dispute/:disputeId` - Get specific dispute
- `PUT /api/v1/order/dispute/:disputeId/respond` - Respond to dispute

### Buyer Endpoints:
- `GET /api/v1/order/disputes/buyer` - Get all buyer disputes
- `GET /api/v1/order/dispute/buyer/:disputeId` - Get specific dispute
- `PUT /api/v1/order/dispute/:disputeId/resolve` - Resolve dispute (accept/reject)

---

## ✅ KEY POINTS

1. **disputeId** = `dispute._id` (always available in dispute object)
2. **orderId** = `dispute.orderId._id` or `dispute.orderId` (populated in responses)
3. **No need to fetch order separately** - orderId is already in dispute response
4. **No need to use admin endpoints** - use seller/buyer specific endpoints
5. **Always validate ObjectId format** before using: `/^[0-9a-fA-F]{24}$/`

---

## 🐛 FIXING YOUR CURRENT CODE

Your current code is trying too hard. Simplify it:

```javascript
// ❌ DON'T DO THIS (your current approach):
// - Fetching order to get dispute_id
// - Using admin endpoints
// - Complex nested checks

// ✅ DO THIS (simplified):
useEffect(() => {
  if (!isOpen || !dispute) return;

  // dispute._id is already the disputeId!
  if (dispute._id && /^[0-9a-fA-F]{24}$/.test(dispute._id)) {
    setDisputeId(dispute._id);
  } else if (dispute.orderId) {
    // If no _id, fetch disputes list and find by orderId
    fetchDisputesByOrderId(dispute.orderId);
  }
}, [isOpen, dispute]);

const fetchDisputesByOrderId = async (orderId) => {
  try {
    const orderIdValue = typeof orderId === "object" ? orderId._id : orderId;
    const response = await axios.get(
      `${API_BASE}/order/disputes`,
      { withCredentials: true }
    );

    const foundDispute = response.data.disputes?.find(
      d => (d.orderId?._id || d.orderId) === orderIdValue
    );

    if (foundDispute?._id) {
      setDisputeId(foundDispute._id);
    } else {
      toast.error("Dispute not found for this order");
    }
  } catch (error) {
    toast.error("Failed to fetch disputes");
  }
};
```

---

## 🎯 BEST PRACTICE

**Always get disputes from the disputes list endpoint, not from order details.**

```javascript
// ✅ CORRECT: Get disputes from disputes endpoint
const disputes = await axios.get(`${API_BASE}/order/disputes`);
// Each dispute has _id (disputeId) and orderId

// ❌ WRONG: Try to get disputeId from order
const order = await axios.get(`${API_BASE}/order/${orderId}`);
// Order doesn't have disputeId field directly
```

