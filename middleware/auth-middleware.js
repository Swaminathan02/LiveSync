import jwt from "jsonwebtoken";

const authMiddle = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Authorization Header:", authHeader);
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access Denided, Token is Invalid",
    });
  }
  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log(decodedToken);
    req.userInfo = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Access Denided, Please login again",
    });
  }
};
export default authMiddle;
