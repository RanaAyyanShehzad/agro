import jwt from "jsonwebtoken";

export const checkAuth = (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({
      authenticated: true,
      role: decoded.role,
      userId: decoded._id,
    });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
};
