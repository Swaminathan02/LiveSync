import jwt from "jsonwebtoken";

// optionalAuth: if a valid token exists (cookie/header/query) set req.userInfo, otherwise leave null.
export const optionalAuth = (req, res, next) => {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.split(" ")[1] ||
    req.query.token;

  if (!token) {
    req.userInfo = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;
    const decoded = jwt.verify(token, secret);
    req.userInfo = decoded;
  } catch (err) {
    req.userInfo = null;
  }
  next();
};

// requireAuth: enforce authentication. For API calls (paths starting with /api or requests that expect JSON) respond with 401 JSON.
// For normal browser requests, redirect to login page '/'.
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

// default export for backward compatibility
export default requireAuth;
