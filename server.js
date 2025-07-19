const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuid } = require("uuid");
const { Server } = require("socket.io");
const io = new Server(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use(express.static("public")); // Serve all files inside the public folder as static assets.
app.use("/peerjs", peerServer);

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/create-room", (req, res) => {
  res.redirect(`/${uuid()}`);
});

app.get("/join-room", (req, res) => {
  const { roomId } = req.query;
  res.redirect(`/${roomId}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userid) => {
    socket.roomId = roomId;
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userid);
  });
  socket.on("message", (msg) => {
    const roomId = socket.roomId;
    io.to(roomId).emit("createMessage", msg);
  });
});

server.listen(3030);
