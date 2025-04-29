import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: [true, "Buyer ID is required"]
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, "Product ID is required"]
      },
      name: {
        type: String,
        required: [true, "Product name is required"]
      },
      price: {
        type: Number,
        required: [true, "Product price is required"]
      },
      quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Minimum quantity should be 1"]
      },
      supplier: {
        type: Object,
        required: [true, "Supplier information is required"],
        userID: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        role: {
          type: String,
          required: true
        },
        name: String
      }
    }
  ],
  totalPrice: {
    type: Number,
    required: [true, "Total price is required"],
    min: [0, "Total price cannot be negative"]
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  shippingAddress: {
    street: {
      type: String,
      required: [true, "Street address is required"]
    },
    city: {
      type: String,
      required: [true, "City is required"]
    },
    state: {
      type: String,
      required: [true, "State is required"]
    },
    postalCode: {
      type: String,
      required: [true, "Postal code is required"]
    },
    country: {
      type: String,
      default: "Pakistan"
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank transfer', 'credit card', 'mobile payment'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  trackingNumber: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexing for better query performance
orderSchema.index({ buyerId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "products.supplier.userID": 1 });

// Virtual to populate buyer information
orderSchema.virtual('buyer', {
  ref: 'Buyer',
  localField: 'buyerId',
  foreignField: '_id',
  justOne: true
});

// Generate a tracking number pre-save
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    const timestamp = new Date().getTime().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.trackingNumber = `FC-${timestamp}-${random}`;
  }
  next();
});

// Ensure virtuals are included in JSON output
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

export const Order = mongoose.model("Order", orderSchema);