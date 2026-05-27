const express = require("express");
const router = express.Router();
const { getUsers, getMe } = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// GET /api/users — all users except current
router.get("/", protect, getUsers);

// GET /api/users/me — current user profile
router.get("/me", protect, getMe);

module.exports = router;
