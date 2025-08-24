import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registeruser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const oldUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (oldUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashpass = await bcrypt.hash(password, salt);
    const newUser = new User({
      username,
      email,
      password: hashpass,
    });
    await newUser.save();
    if (newUser) {
      // Generate JWT token for the new user
      const accessToken = jwt.sign(
        {
          userId: newUser._id,
          username: newUser.username,
          email: newUser.email,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "2h" }
      );
      // Set cookie with JWT token
      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.status(201).json({
        success: true,
        message: "Registration Successfull",
        accessToken,
      });
    } else {
      return res.status(401).json({
        success: true,
        message: "Registration UnSuccessfull",
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      messgae: "Internal Server Error at Registration",
    });
  }
};
export const loginuser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const findUser = await User.findOne({ $or: [{ username }, { email }] });
    if (!findUser) {
      return res.status(400).json({
        success: false,
        message: "User Doesn't exists",
      });
    }
    const passwordmatch = await bcrypt.compare(password, findUser.password);
    if (!passwordmatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid Credientials",
      });
    }
    const accessToken = jwt.sign(
      {
        userId: findUser._id,
        username: findUser.username,
        email: findUser.email,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "2h" }
    );
    // Set cookie with JWT token
    res.cookie("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.status(201).json({
      success: true,
      message: "Login Successfull",
      accessToken,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      messgae: "Internal Server Error at Login",
    });
  }
};
