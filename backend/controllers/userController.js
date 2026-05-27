const User = require("../models/User");

const getUsers = (req, res) => {
  try {
    const all = User.findAll();
    const others = all
      .filter((u) => u._id !== req.user._id)
      .map(User.safe)
      .sort((a, b) => b.isOnline - a.isOnline || a.name.localeCompare(b.name));
    res.json(others);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMe = (req, res) => {
  try {
    const user = User.findById(req.user._id);
    res.json(User.safe(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getUsers, getMe };
