import express from "express";
import http from "http";
import { v4 as uuid } from "uuid";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"; // Add this import
import connectDB from "./database/db.js";
import router from "./routes/auth-routes.js";
import homerouter from "./routes/user-routes.js";

dotenv.config();
import { socketHandlers } from "./socket/socket-handlers.js";

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

const PORT = process.env.PORT || 3030;

connectDB();

app.use(express.json());
app.use(express.static("public"));
app.use("/peerjs", peerServer);
app.use("/api/auth", router);
app.set("view engine", "ejs");

app.use("/api", homerouter);

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// Middleware to extract user info from JWT token or session
const getUserInfo = (req, res, next) => {
  try {
    // Check for JWT token in cookies or Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1] ||
      req.query.token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userInfo = {
        username: decoded.username || decoded.name || decoded.user?.username,
        userId: decoded.userId || decoded.id || decoded.user?.id,
        email: decoded.email || decoded.user?.email,
      };
      console.log("User info from token:", req.userInfo);
    }
  } catch (error) {
    console.log("JWT verification failed:", error.message);
    req.userInfo = null;
  }
  next();
};

app.get("/dashboard", getUserInfo, (req, res) => {
  // Pass user info to dashboard
  res.render("dashboard", {
    userInfo: req.userInfo,
  });
});

app.get("/create-room", getUserInfo, (req, res) => {
  const roomId = uuid();

  // Priority: URL query > user session > default
  const username = req.query.username || req.userInfo?.username || "Anonymous";

  console.log(`Creating room ${roomId} for user: ${username}`);
  res.redirect(`/${roomId}?username=${encodeURIComponent(username)}`);
});

app.get("/join-room", getUserInfo, (req, res) => {
  const { roomId } = req.query;

  if (!roomId || roomId.trim() === "") {
    return res.status(400).send("Room ID is required");
  }

  // Priority: URL query > user session > default
  const username = req.query.username || req.userInfo?.username || "Anonymous";

  console.log(`User ${username} joining room: ${roomId}`);
  res.redirect(`/${roomId}?username=${encodeURIComponent(username)}`);
});

app.get("/:room", getUserInfo, (req, res) => {
  const roomId = req.params.room;

  // Priority: URL query > user session > default
  const username = req.query.username || req.userInfo?.username || "Anonymous";

  console.log(`Rendering room ${roomId} for user: ${username}`);

  res.render("room", {
    roomId: roomId,
    username: username,
    userInfo: req.userInfo,
  });
});

app.get("/debug-user", getUserInfo, (req, res) => {
  res.json({
    cookies: req.cookies,
    userInfo: req.userInfo,
    query: req.query,
    headers: {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    },
  });
});

// Also add this to see what's being passed to room
app.get("/debug-room/:room", getUserInfo, (req, res) => {
  res.json({
    roomId: req.params.room,
    query: req.query,
    userInfo: req.userInfo,
    finalUsername: req.query.username || req.userInfo?.username || "Anonymous",
  });
});

// Initialize socket handlers
socketHandlers(io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).send("Something went wrong!");
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).send("Page not found");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
