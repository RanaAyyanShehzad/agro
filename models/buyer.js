import mongoose from "mongoose"
const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        sparse: true,
        unique: true,
        lowercase: true,
      },
      password: {
        type: String,
        required: true,
        select:false,
      },
      phone: {
        type: String,
        sparse: true,
        trim:true,
      },
      address: {
        type: String,
        required: true,
      },
      img:{
        type:String, 
      },verified:{
        type:Boolean,
        default:false,
      },
      otp: {
        type: String,
        default: null,
      },
      otpExpiry: {
        type: Date,
        default: null,
      },failedLoginAtempt:{
        type:Number,
        default:0,
      },      lockUntil:{
        type:Date,
      },
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
      },
      isSuspended: {
        type: Boolean,
        default: false
      },
      suspendedUntil: {
        type: Date,
        default: null
      },
      suspensionReason: {
        type: String,
        maxlength: 500
      }
      },{
        timestamps:true,
      });
export const buyer = mongoose.model("Buyer", schema);

