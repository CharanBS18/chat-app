# Migration Guide: Express to Cloudflare Worker

## What Changed

### ❌ Removed
- Express.js server
- Socket.io real-time connections
- File system database (db.js)
- Local JSON file storage
- Node.js specific modules (fs, path, bcryptjs, etc.)

### ✅ Added
- Cloudflare Worker with itty-router
- In-memory storage (STORAGE object)
- Simplified JWT token generation using Web Crypto API
- Simple password hashing with SHA-256
- CORS headers built into all responses

## Key Differences

### 1. Server Setup

**Before (Express):**
```javascript
const express = require("express");
const app = express();
const server = http.createServer(app);
server.listen(5000);
```

**After (Worker):**
```javascript
export default {
  fetch: router.handle,
};
```

### 2. Request/Response Handling

**Before (Express):**
```javascript
app.post("/api/auth/register", (req, res) => {
  res.json({ data });
});
```

**After (Worker):**
```javascript
router.post('/api/auth/register', async (request, env) => {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 3. Environment Variables

**Before:**
```javascript
require("dotenv").config();
const secret = process.env.JWT_SECRET;
```

**After:**
```javascript
// Access via env parameter
export default {
  fetch: async (request, env) => {
    const secret = env.JWT_SECRET;
  }
};
```

### 4. Database

**Before (File-based):**
```javascript
const db = require("./db");
const users = db.users.findAll();
```

**After (In-memory):**
```javascript
const users = STORAGE.users;
```

### 5. Password Hashing

**Before:**
```javascript
const bcrypt = require("bcryptjs");
const hashed = await bcrypt.hash(password, salt);
```

**After:**
```javascript
async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  // ... convert to hex string
}
```

## Frontend Changes

The frontend API calls remain the same! No changes needed in your React code.

### Update `.env` File

```env
# Change from localhost:5001 to your Worker URL
VITE_API_URL=https://your-worker-name.workers.dev/api
VITE_SOCKET_URL=https://your-worker-name.workers.dev
```

## Deployment Paths

### Option 1: Local Development
```bash
npm run dev:worker  # Runs wrangler dev
```

### Option 2: Cloudflare Pages + Workers
```bash
# Deploy frontend to Pages
wrangler pages deploy frontend/dist

# Deploy backend Worker
wrangler publish
```

### Option 3: Full Cloudflare Deployment
1. Push code to GitHub
2. Connect repo to Cloudflare Pages
3. Set build command: `cd frontend && npm run build`
4. Set output directory: `frontend/dist`
5. Create Worker from dashboard
6. Deploy Worker code manually or via GitHub Actions

## Storage Options

### Current: In-Memory (Good for dev/testing)
- ✅ No setup needed
- ✅ Fast
- ❌ Data lost on restart
- ❌ Single instance only

### Upgrade Path 1: Cloudflare KV
```toml
[[kv_namespaces]]
binding = "DB"
id = "your-kv-id"
```

### Upgrade Path 2: Cloudflare D1 (SQLite)
```toml
[[d1_databases]]
binding = "DB"
database_name = "chat-db"
```

### Upgrade Path 3: External Database
- Use Supabase PostgreSQL
- Use MongoDB Atlas
- Use any REST API backend

## Testing

### Test Endpoints Locally

```bash
# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"User","email":"test@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Get users (need Bearer token)
curl http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Performance Considerations

- **Cold starts**: Cloudflare Workers have ~5-50ms cold start
- **Execution time**: Limited to 30 seconds CPU time per request
- **Memory**: 128MB per execution context
- **Storage**: Use KV for data <1MB, D1 for structured data

## Limitations vs Express

| Feature | Express | Worker |
|---------|---------|--------|
| Real-time (WebSocket) | ✅ | ⚠️ (via Durable Objects) |
| File uploads | ✅ | ✅ (via R2) |
| Background jobs | ✅ | ⚠️ (via Queues) |
| Database access | ✅ | ✅ (KV, D1, R2) |
| Duration | No limit | 30s CPU |
| Scaling | Manual | Automatic |

## Rollback Plan

If you need to go back to Express:
1. Keep original server.js and package.json
2. Switch API URL in frontend .env
3. Run `npm start` instead of `wrangler publish`

## Next Steps

1. ✅ Current: In-memory storage works for demo
2. ⬜ Add Cloudflare KV for persistence
3. ⬜ Set up custom domain routing
4. ⬜ Add rate limiting
5. ⬜ Monitor with Cloudflare Analytics

---

**Questions?** Check:
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [itty-router Docs](https://itty.dev/)
- Original `server.js` for Express implementation reference
