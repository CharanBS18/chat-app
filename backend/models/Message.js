// Message helpers using JSON db (no MongoDB)
const db = require("../db");

const Message = {
  findBetween: (userA, userB) => db.messages.findBetween(userA, userB),
  create: (data) => db.messages.create(data),
  markRead: (senderId, receiverId) => db.messages.markRead(senderId, receiverId),
};

module.exports = Message;
