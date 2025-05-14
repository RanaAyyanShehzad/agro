import jwt from "jsonwebtoken";
// In your sendCookie function
export const sendCookie = (user, role, res, message, statusCode = 200) => {
  const token = jwt.sign(
    { _id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'Development' ? "Lax" : "none",
      secure: process.env.NODE_ENV === 'Development' ? false : true,
    })
    .json({
      success: true,
      message,
      token // Also send token in response body
    });
};
export const successMessage=(res,message,statusCode=200)=>{
    res.status(statusCode).json({
        success:true,
        message,
    });
};

