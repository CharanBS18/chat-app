const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");

const onlineUsers = new Map(); // userId -> socketId

const initSocket = (io) => {
  // Authenticate socket connections with JWT
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id;
    console.log(`🔌 ${socket.user.name} connected`);

    onlineUsers.set(userId, socket.id);
    User.update(userId, { isOnline: true, lastSeen: new Date().toISOString() });
    io.emit("user_online", { userId, onlineUsers: Array.from(onlineUsers.keys()) });

    socket.on("send_message", ({ receiverId, content }) => {
      if (!receiverId || !content?.trim()) return;

      const message = Message.create({
        sender: userId,
        receiver: receiverId,
        content: content.trim(),
      });

      const populated = {
        ...message,
        sender: User.safe(User.findById(userId)),
        receiver: User.safe(User.findById(receiverId)),
      };

      // Send to receiver if online
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit("receive_message", populated);

      // Echo back to sender
      socket.emit("receive_message", populated);
    });

    socket.on("typing", ({ receiverId }) => {
      const s = onlineUsers.get(receiverId);
      if (s) io.to(s).emit("user_typing", { userId });
    });

    socket.on("stop_typing", ({ receiverId }) => {
      const s = onlineUsers.get(receiverId);
      if (s) io.to(s).emit("user_stop_typing", { userId });
    });

    socket.on("disconnect", () => {
      console.log(`🔴 ${socket.user.name} disconnected`);
      onlineUsers.delete(userId);
      User.update(userId, { isOnline: false, lastSeen: new Date().toISOString() });
      io.emit("user_offline", { userId, onlineUsers: Array.from(onlineUsers.keys()) });
    });
  });
};

module.exports = { initSocket, onlineUsers };
