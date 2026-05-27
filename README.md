# ChatFlow — Real-time Chat Application

A full-stack real-time chat application built with React, Node.js, Socket.io, and MongoDB.

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT (JSON Web Tokens) |

## 📁 Project Structure

```
chatapp/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # Register & login logic
│   │   ├── userController.js      # Fetch users
│   │   └── messageController.js   # Fetch & save messages
│   ├── middleware/
│   │   └── auth.js                # JWT verification middleware
│   ├── models/
│   │   ├── User.js                # User schema
│   │   └── Message.js             # Message schema
│   ├── routes/
│   │   ├── auth.js                # /api/auth/*
│   │   ├── users.js               # /api/users/*
│   │   └── messages.js            # /api/messages/*
│   ├── socket/
│   │   └── socketHandler.js       # All Socket.io event handlers
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Entry point
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Avatar.jsx          # Color-coded user avatar
    │   │   ├── ChatWindow.jsx      # Main chat UI + socket events
    │   │   ├── Message.jsx         # Individual message bubble
    │   │   └── Sidebar.jsx         # User list + online status
    │   ├── context/
    │   │   ├── AuthContext.jsx     # Auth state + login/register/logout
    │   │   └── SocketContext.jsx   # Socket.io connection + online users
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Chat.jsx
    │   ├── services/
    │   │   └── api.js              # Axios instance + API helpers
    │   ├── App.jsx                 # Routes
    │   └── main.jsx
    ├── .env.example
    └── vite.config.js
```

## 🚀 Local Setup

### 1. Clone & enter project
```bash
git clone <your-repo>
cd chatapp
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env
# (optional: adjust VITE_API_URL / VITE_SOCKET_URL)
npm install
npm run dev
```

App runs at: http://localhost:5173  
API runs at: http://localhost:5000

---

## 🌐 Deployment

### Backend → Render
1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo, set root directory to `backend`
3. Build command: `npm install`  
   Start command: `npm start`
4. Add environment variables:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a long random string
   - `CLIENT_URL` — your Vercel frontend URL

### Frontend → Vercel
1. Import project on [vercel.com](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variables:
   - `VITE_API_URL` = `https://your-render-url.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://your-render-url.onrender.com`

### Database → MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user and whitelist `0.0.0.0/0` (all IPs) for Render
3. Copy the connection string into your Render environment variables

---

## ⚡ Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Client → Server | User connects with JWT auth |
| `disconnect` | Client → Server | User disconnects |
| `send_message` | Client → Server | Send a message to another user |
| `receive_message` | Server → Client | Receive a message (sender + recipient) |
| `user_online` | Server → All | User came online (with full online list) |
| `user_offline` | Server → All | User went offline (with updated online list) |
| `typing` | Client → Server | User started typing |
| `stop_typing` | Client → Server | User stopped typing |
| `user_typing` | Server → Client | Notify recipient of typing |
| `user_stop_typing` | Server → Client | Notify recipient stopped typing |

---

## 🔑 API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Sign in, get JWT |
| GET | `/api/users` | ✅ | List all other users |
| GET | `/api/users/me` | ✅ | Get current user profile |
| GET | `/api/messages/:userId` | ✅ | Get chat history with user |
| POST | `/api/messages/:userId` | ✅ | Send message (REST fallback) |

---

## 🛡 Security Notes

- Passwords hashed with bcryptjs (salt rounds: 10)
- JWTs expire in 7 days
- Socket.io connections authenticated via JWT middleware
- Password field excluded from all API responses
- Input validated at model level with Mongoose

---

Built for a student portfolio — clean, modular, and production-ready.
# chat-app
