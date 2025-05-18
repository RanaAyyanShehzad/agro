import jwt from "jsonwebtoken";
// In your sendCookie function
export const sendCookie = (user, role, res, message, statusCode = 200) => {
  const token = jwt.sign(
    { _id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: "60m" }
  );

  res
  .status(statusCode)
  .cookie("token", token, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === "Development" ? "Lax" : "None", // 🔥 "None" is required for cross-origin
    secure: process.env.NODE_ENV === "Development" ? false : true,     // 🔥 Must be true when using https
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

