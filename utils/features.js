import jwt from "jsonwebtoken";
// In your sendCookie function
export const sendCookie = (user, role, res, message, statusCode = 200) => {
  const token = jwt.sign(
    { _id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  const isProduction = process.env.NODE_ENV === "production";

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 2 * 60 * 60 * 1000,
    })
  .json({
    success: true,
    message,
    token,
  });

};
export const successMessage=(res,message,statusCode=200)=>{
    res.status(statusCode).json({
        success:true,
        message,
    });
};

// Helper function to handle product quantity becoming zero
export const handleZeroQuantity = async (productDoc) => {
    if (productDoc.quantity <= 0) {
        // Option 1: Set isAvailable to false (keeps product data)
        productDoc.isAvailable = false;
        await productDoc.save();
        
        // Option 2: Delete the product (uncomment if preferred)
        // await productDoc.deleteOne();
    }
};

