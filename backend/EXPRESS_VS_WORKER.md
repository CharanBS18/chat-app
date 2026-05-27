# Express vs Cloudflare Worker - Code Comparison

## Server Startup

### Express (Old)
```javascript
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Cloudflare Worker (New)
```javascript
export default {
  fetch: router.handle,
};
```

**Difference**: Workers don't have ports; they run on Cloudflare's edge globally.

---

## Routing

### Express (Old)
```javascript
const express = require("express");
const router = express.Router();

router.post("/register", (req, res) => {
  res.json({ data });
});

app.use("/api/auth", router);
```

### Cloudflare Worker (New)
```javascript
import { Router } from 'itty-router';
const router = Router();

router.post('/api/auth/register', (request) => {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Difference**: Workers use `itty-router` and return Response objects instead of using `res.json()`.

---

## Request/Response Handling

### Express (Old)
```javascript
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }
  
  const user = findUser(email);
  res.json(user);
});
```

### Cloudflare Worker (New)
```javascript
router.post('/api/auth/login', async (request) => {
  const body = await request.json();
  const { email, password } = body;
  
  if (!email) {
    return new Response(JSON.stringify({ message: "Email required" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const user = findUser(email);
  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Difference**: 
- Must await `request.json()` to get body
- Must manually create Response objects
- Must set headers explicitly

---

## CORS Handling

### Express (Old)
```javascript
const cors = require("cors");

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
```

### Cloudflare Worker (New)
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

router.options('*', () => new Response(null, { headers: corsHeaders }));

// Include corsHeaders in every response
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});
```

**Difference**: CORS must be added to every response manually.

---

## Environment Variables

### Express (Old)
```javascript
require("dotenv").config();

const secret = process.env.JWT_SECRET;
const port = process.env.PORT || 5000;
```

### Cloudflare Worker (New)
```javascript
// Passed as 'env' parameter in fetch handler
export default {
  fetch: async (request, env) => {
    const secret = env.JWT_SECRET;
    const environment = env.ENVIRONMENT;
  }
};
```

**Difference**: Workers get env via the `env` parameter, not `process.env`.

---

## Password Hashing

### Express (Old)
```javascript
const bcrypt = require("bcryptjs");

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
```

### Cloudflare Worker (New)
```javascript
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function comparePassword(password, hash) {
  const newHash = await hashPassword(password);
  return newHash === hash;
}
```

**Difference**: Workers use Web Crypto API instead of bcryptjs (lighter weight).

---

## JWT Token Generation

### Express (Old)
```javascript
const jwt = require("jsonwebtoken");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
```

### Cloudflare Worker (New)
```javascript
async function generateToken(id, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    id, 
    iat: Math.floor(Date.now() / 1000), 
    exp: Math.floor(Date.now() / 1000) + 604800 
  }));
  const signature = btoa(`${header}.${payload}.${secret}`);
  return `${header}.${payload}.${signature}`;
}
```

**Difference**: Manual JWT creation using Web APIs, no external library.

---

## Token Verification

### Express (Old)
```javascript
const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = findUser(decoded.id);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
};

app.get("/api/users", protect, (req, res) => {
  res.json(req.user);
});
```

### Cloudflare Worker (New)
```javascript
async function verifyAuth(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { error: 'Not authorized' };
  }

  const token = auth.split(' ')[1];
  const decoded = await verifyToken(token, env.JWT_SECRET);
  
  if (!decoded) {
    return { error: 'Token invalid' };
  }

  const user = findUser(decoded.id);
  return { error: null, user };
}

router.get('/api/users', async (request, env) => {
  const auth = await verifyAuth(request, env);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: 401,
      headers: corsHeaders
    });
  }
  
  return new Response(JSON.stringify(auth.user), {
    headers: corsHeaders
  });
});
```

**Difference**: Middleware becomes a function that must be called in each route.

---

## Database Operations

### Express (Old)
```javascript
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data.json");

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data));
}

// Usage
const db = readDB();
db.users.push(newUser);
writeDB(db);
```

### Cloudflare Worker (New)
```javascript
// In-memory storage
let STORAGE = { users: [], messages: [] };

// Usage
STORAGE.users.push(newUser);

// For production, use KV:
// const value = await env.DB.get("users");
// await env.DB.put("users", JSON.stringify(users));
```

**Difference**: Workers can't use file system. Use in-memory or KV/D1.

---

## Error Handling

### Express (Old)
```javascript
app.get("/api/users", (req, res) => {
  try {
    const users = getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
```

### Cloudflare Worker (New)
```javascript
router.get('/api/users', async (request, env) => {
  try {
    const users = getUsers();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
```

**Difference**: Same try-catch logic, just different response format.

---

## 404 Handling

### Express (Old)
```javascript
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});
```

### Cloudflare Worker (New)
```javascript
router.all('*', () => {
  return new Response(JSON.stringify({ message: "Not found" }), {
    status: 404,
    headers: corsHeaders
  });
});
```

---

## Key Differences Summary

| Aspect | Express | Worker |
|--------|---------|--------|
| **Request Format** | `req.body`, `req.params` | `request.json()`, `request.params` |
| **Response Format** | `res.json()`, `res.status()` | `new Response()` with options |
| **Middleware** | `app.use()` | Function-based per route |
| **CORS** | `cors` package | Manual headers |
| **Password Hash** | `bcryptjs` | `crypto.subtle.digest` |
| **JWT** | `jsonwebtoken` | Manual Base64 encoding |
| **Database** | File system (fs) | In-memory or KV/D1 |
| **Environment** | `process.env` | `env` parameter |
| **Async Handling** | Implicit | Explicit `await` |
| **Execution Model** | Long-running server | Stateless request handler |

---

## Migration Checklist

- [x] Remove Express imports
- [x] Replace routing with itty-router
- [x] Convert all res.json() to Response objects
- [x] Add CORS headers to all responses
- [x] Convert middleware to explicit functions
- [x] Replace bcryptjs with Web Crypto
- [x] Replace jsonwebtoken with manual JWT
- [x] Replace fs with in-memory storage
- [x] Convert process.env to env parameter
- [x] Update deployment method (server.listen → wrangler)
- [x] Create wrangler.toml
- [x] Update package.json dependencies

All items completed! ✅
