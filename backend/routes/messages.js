const express = require("express");
const router = express.Router();
const { getMessages, sendMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

// GET  /api/messages/:userId — fetch chat history
router.get("/:userId", protect, getMessages);

// POST /api/messages/:userId — send message (REST fallback)
router.post("/:userId", protect, sendMessage);

module.exports = router;
