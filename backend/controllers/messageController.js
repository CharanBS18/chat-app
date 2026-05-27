const Message = require("../models/Message");
const User = require("../models/User");

const getMessages = (req, res) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (!User.findById(userId))
      return res.status(404).json({ message: "User not found" });

    const messages = Message.findBetween(myId, userId);
    Message.markRead(userId, myId);

    // Populate sender/receiver names
    const populated = messages.map((m) => ({
      ...m,
      sender: User.safe(User.findById(m.sender)),
      receiver: User.safe(User.findById(m.receiver)),
    }));

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendMessage = (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    const myId = req.user._id;

    if (!content?.trim())
      return res.status(400).json({ message: "Message content is required" });

    const message = Message.create({ sender: myId, receiver: userId, content: content.trim() });
    res.status(201).json({
      ...message,
      sender: User.safe(User.findById(myId)),
      receiver: User.safe(User.findById(userId)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMessages, sendMessage };
