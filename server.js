import express from "express";
import http from "http";
import { v4 as uuid } from "uuid";
import { Server } from "socket.io";
import { ExpressPeerServer } from "peer";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import connectDB from "./database/db.js";
import router from "./routes/auth-routes.js";
import homerouter from "./routes/user-routes.js";
import { socketHandlers } from "./socket/socket-handlers.js";
import { requireAuth } from "./middleware/auth-middleware.js";

dotenv.config();

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
app.use(cookieParser());
app.use(express.static("public"));
app.use("/peerjs", peerServer);
app.use("/api/auth", router);
app.set("view engine", "ejs");

app.use("/api", homerouter);

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

// Health routes
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Protected routes: require authentication else redirects to '/'
app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", {
    userInfo: req.userInfo,
  });
});

app.get("/create-room", requireAuth, (req, res) => {
  const roomId = uuid();
  const username = req.query.username || req.userInfo?.username || "Anonymous";
  console.log(`Creating room ${roomId} for user: ${username}`);
  res.redirect(`/${roomId}?username=${encodeURIComponent(username)}`);
});

app.get("/join-room", requireAuth, (req, res) => {
  const { roomId } = req.query;

  if (!roomId || roomId.trim() === "") {
    return res.status(400).send("Room ID is required");
  }

  const username = req.query.username || req.userInfo?.username || "Anonymous";
  console.log(`User ${username} joining room: ${roomId}`);
  res.redirect(`/${roomId}?username=${encodeURIComponent(username)}`);
});

app.get("/:room", requireAuth, (req, res) => {
  const roomId = req.params.room;
  const username = req.query.username || req.userInfo?.username || "Anonymous";

  console.log(`Rendering room ${roomId} for user: ${username}`);

  res.render("room", {
    roomId: roomId,
    username: username,
    userInfo: req.userInfo,
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
