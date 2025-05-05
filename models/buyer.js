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
      },
      otp: {
        type: String,
        default: null,
      },
      otpExpiry: {
        type: Date,
        default: null,
      },
      },{
        timestamps:true,
      });
export const buyer = mongoose.model("Buyer", schema);

