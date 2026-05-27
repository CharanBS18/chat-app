// db.js — zero-setup JSON file database (replaces MongoDB)
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data.json");

// Initialize empty DB if it doesn't exist
const DEFAULT = { users: [], messages: [] };

function read() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT, null, 2));
    return { ...DEFAULT };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { ...DEFAULT };
  }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const db = {
  // ── Users ──────────────────────────────────────────
  users: {
    findAll: () => read().users,

    findById: (id) => read().users.find((u) => u._id === id) || null,

    findByEmail: (email) =>
      read().users.find((u) => u.email === email.toLowerCase()) || null,

    create: (userData) => {
      const data = read();
      const user = {
        _id: require("uuid").v4(),
        ...userData,
        email: userData.email.toLowerCase(),
        isOnline: false,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      write(data);
      return user;
    },

    update: (id, updates) => {
      const data = read();
      const idx = data.users.findIndex((u) => u._id === id);
      if (idx === -1) return null;
      data.users[idx] = { ...data.users[idx], ...updates };
      write(data);
      return data.users[idx];
    },
  },

  // ── Messages ───────────────────────────────────────
  messages: {
    findBetween: (userA, userB) => {
      const data = read();
      return data.messages
        .filter(
          (m) =>
            (m.sender === userA && m.receiver === userB) ||
            (m.sender === userB && m.receiver === userA)
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    create: (msgData) => {
      const data = read();
      const message = {
        _id: require("uuid").v4(),
        ...msgData,
        read: false,
        createdAt: new Date().toISOString(),
      };
      data.messages.push(message);
      write(data);
      return message;
    },

    markRead: (senderId, receiverId) => {
      const data = read();
      data.messages = data.messages.map((m) =>
        m.sender === senderId && m.receiver === receiverId && !m.read
          ? { ...m, read: true }
          : m
      );
      write(data);
    },
  },
};

module.exports = db;
