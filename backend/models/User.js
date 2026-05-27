// User helpers using JSON db (no MongoDB)
const bcrypt = require("bcryptjs");
const db = require("../db");

const User = {
  async create({ name, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = db.users.create({ name, email, password: hashed, avatar: "" });
    return user;
  },

  findById: (id) => db.users.findById(id),
  findByEmail: (email) => db.users.findByEmail(email),
  findAll: () => db.users.findAll(),
  update: (id, updates) => db.users.update(id, updates),

  async matchPassword(user, entered) {
    return bcrypt.compare(entered, user.password);
  },

  safe: (user) => {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },
};

module.exports = User;
