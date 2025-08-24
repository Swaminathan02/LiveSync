export const socketHandlers = (io) => {
  const userNames = new Map();
  const roomUsers = new Map(); // Track users in each room

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join-room", (roomId, userId, initialName) => {
      socket.roomId = roomId;
      socket.userId = userId;
      
      // Store username
      userNames.set(userId, initialName);
      
      // Track room users
      if (!roomUsers.has(roomId)) {
        roomUsers.set(roomId, new Set());
      }
      roomUsers.get(roomId).add(userId);
      
      socket.join(roomId);
      
      console.log(`User ${initialName} (${userId}) joined room: ${roomId}`);
      
      // Notify others in the room about new user
      socket.broadcast.to(roomId).emit("user-connected", userId, initialName);
      
      // Send welcome message to the room
      io.to(roomId).emit("createMessage", {
        username: "System",
        text: `${initialName} joined the room`,
        type: "system"
      });
    });

    socket.on("update-username", (newName) => {
      const userId = socket.userId;
      if (!userId) return;
      
      const oldName = userNames.get(userId);
      userNames.set(userId, newName);
      const roomId = socket.roomId;
      
      console.log(`Username updated: ${userId} from ${oldName} to ${newName}`);
      
      // Notify all users in the room about the name change
      io.to(roomId).emit("username-updated", { userId, newName, oldName });
      
      // Send system message about name change
      io.to(roomId).emit("createMessage", {
        username: "System",
        text: `${oldName} changed their name to ${newName}`,
        type: "system"
      });
    });

    socket.on("message", (msg) => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      
      if (!roomId || !userId) {
        console.log("No room or user ID found for message");
        return;
      }
      
      const username = userNames.get(userId) || msg.username || "Anonymous";
      
      console.log(`Message from ${username} in room ${roomId}: ${msg.text}`);
      
      // Broadcast message to all users in the room
      io.to(roomId).emit("createMessage", {
        username: username,
        text: msg.text,
        userId: userId,
        timestamp: new Date().toLocaleTimeString()
      });
    });

    socket.on("start-screen-share", () => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      const username = userNames.get(userId) || "Unknown";
      
      console.log(`${username} started screen sharing in room ${roomId}`);
      
      socket.broadcast.to(roomId).emit("screen-share-started", socket.id);
      
      // Send system message
      io.to(roomId).emit("createMessage", {
        username: "System",
        text: `${username} is sharing their screen`,
        type: "system"
      });
    });

    socket.on("stop-screen-share", () => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      const username = userNames.get(userId) || "Unknown";
      
      console.log(`${username} stopped screen sharing in room ${roomId}`);
      
      socket.broadcast.to(roomId).emit("screen-share-stopped", socket.id);
      
      // Send system message
      io.to(roomId).emit("createMessage", {
        username: "System",
        text: `${username} stopped sharing their screen`,
        type: "system"
      });
    });

    socket.on("disconnect", () => {
      if (socket.roomId && socket.userId) {
        const roomId = socket.roomId;
        const userId = socket.userId;
        const username = userNames.get(userId) || "Unknown";
        
        console.log(`User ${username} (${userId}) disconnected from room: ${roomId}`);
        
        // Remove user from room tracking
        if (roomUsers.has(roomId)) {
          roomUsers.get(roomId).delete(userId);
          if (roomUsers.get(roomId).size === 0) {
            roomUsers.delete(roomId);
          }
        }
        
        // Notify others about disconnection
        socket.broadcast.to(roomId).emit("user-disconnected", userId);
        
        // Send leave message
        socket.broadcast.to(roomId).emit("createMessage", {
          username: "System",
          text: `${username} left the room`,
          type: "system"
        });
        
        // Clean up username storage
        userNames.delete(userId);
      }
    });

    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Optional: Log room statistics periodically
  setInterval(() => {
    const totalRooms = roomUsers.size;
    const totalUsers = Array.from(roomUsers.values()).reduce((sum, users) => sum + users.size, 0);
    if (totalUsers > 0) {
      console.log(`Active rooms: ${totalRooms}, Total users: ${totalUsers}`);
    }
  }, 60000); // Log every minute
};