import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(" ")[1] ||
    req.query.token;

  const isApi =
    req.originalUrl?.startsWith("/api") ||
    req.xhr ||
    (req.headers.accept || "").includes("application/json");

  if (!token) {
    if (isApi) {
      return res
        .status(401)
        .json({ success: false, message: "Access Denied, Token is invalid" });
    }
    return res.redirect("/");
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, secret);
    req.userInfo = decoded;
    return next();
  } catch (err) {
    if (isApi) {
      return res
        .status(401)
        .json({ success: false, message: "Access Denied, Please login again" });
    }
    return res.redirect("/");
  }
};

export default requireAuth;
