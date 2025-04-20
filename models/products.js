import mongoose from "mongoose";
const schema = mongoose.Schema({
    tiltle:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String,
        required:true,
        maxlength:100,
    },
    price:{
        type:Number,
        required:true,
        min:0,
    },
    unit:{
        type:String,
        required:true,
    },
    quantity:{
        type:Number,
        required:true,
        min:0,
    },isAvailable:{
        type:Boolean,
        default:true,
    },
});
export const products=mongoose.model("Products",schema);