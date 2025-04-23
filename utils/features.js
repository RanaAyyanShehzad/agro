import jwt from "jsonwebtoken";

export const sendCookie = (user, role, res, message, statusCode = 200) => {
  const token = jwt.sign(
    { _id: user._id, role },
    process.env.JWT_SECRET,
    { expiresIn: "10m" } // Better practice than using maxAge manually
  );

  res
    .status(statusCode)
    .cookie("token", token, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "strict", // Prevent CSRF (optional but recommended)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
    })
    .json({
      success: true,
      message,
    });
};
export const successMessage=(res,message,statusCode=200)=>{
    res.status(statusCode).json({
        success:true,
        message,
    });
};

