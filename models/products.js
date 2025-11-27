import mongoose from "mongoose";
const uploadeerschema=mongoose.Schema({
    userID:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
       },
       role:{
        type:String,
        required:true,
       },uploaderName:{
        type:String,
        trim:true,
       }  
},{ _id: false });
const schema = mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
    },
    description:{
        type:String,
        required:true,
        maxlength:500,
    },
    price:{
        type:Number,
        required:true,
        min:0,
    },
    unit:{
        type:String,
        required:true,
    },quantity:{
        type:Number,
        required:true,
        min:0,
    },category:{
        type:String,
        trim:true,
    },    isAvailable:{
        type:Boolean,
        default:true,
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    },
    images:{
        type:[String],
        required:true,
    },
    upLoadedBy:{
       type:uploadeerschema,
       required:true,  
    },
    
});
export const product=mongoose.model("Products",schema);