import jwt from "jsonwebtoken";
// In your sendCookie function
export const sendCookie = (user, role, res, message, statusCode = 200) => {
  const token = jwt.sign(
    { _id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: "60m" }
  );

  const isProduction = process.env.NODE_ENV === "production";

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1 * 60 * 60 * 1000,
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

