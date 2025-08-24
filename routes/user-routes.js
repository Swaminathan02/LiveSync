import express from "express";
import authMiddle from "../middleware/auth-middleware.js";
const router = express.Router();

router.get("/welcome", authMiddle, (req, res) => {
  res.render("home", {
    user: req.userInfo,
  });
});

export default router;
