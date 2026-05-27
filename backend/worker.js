// ============================================
// In-Memory Storage (for demo/development)
// ============================================
let STORAGE = {
  users: [],
  messages: [],
};

const STORAGE_KEY = 'chatapp:data';

async function loadStorage(env) {
  if (!env?.CHAT_STORE) return;

  const stored = await env.CHAT_STORE.get(STORAGE_KEY, 'json');
  if (stored && Array.isArray(stored.users) && Array.isArray(stored.messages)) {
    STORAGE = stored;
  }
}

async function saveStorage(env) {
  if (!env?.CHAT_STORE) return;

  await env.CHAT_STORE.put(STORAGE_KEY, JSON.stringify(STORAGE));
}

// ============================================
// Utility: UUID Generation
// ============================================
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// Utility: JWT Token Operations
// ============================================
async function generateToken(id, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ id, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 604800 }));
  const signature = btoa(`${header}.${payload}.${secret}`);
  return `${header}.${payload}.${signature}`;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ============================================
// Utility: Password Hashing (Simple mock)
// ============================================
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

function normalizeName(name = '') {
  return name.trim().replace(/\s+/g, ' ');
}

// ============================================
// User Operations
// ============================================
const UserOps = {
  findById: (id) => STORAGE.users.find(u => u._id === id) || null,
  findByEmail: (email) => STORAGE.users.find(u => u.email === email.toLowerCase()) || null,
  findByName: (name) => {
    const normalized = normalizeName(name).toLowerCase();
    return STORAGE.users.find(u => normalizeName(u.name).toLowerCase() === normalized) || null;
  },
  findAll: () => STORAGE.users,
  
  async create(userData) {
    const hashedPassword = await hashPassword(userData.password);
    const user = {
      _id: generateUUID(),
      name: normalizeName(userData.name),
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      avatar: userData.avatar || '',
      isOnline: false,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    STORAGE.users.push(user);
    return user;
  },

  update: (id, updates) => {
    const user = STORAGE.users.find(u => u._id === id);
    if (user) {
      Object.assign(user, updates);
    }
    return user;
  },

  safe: (user) => {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  },
};

// ============================================
// Message Operations
// ============================================
const MessageOps = {
  findBetween: (userA, userB) => {
    return STORAGE.messages.filter(
      m => (m.sender === userA && m.receiver === userB) || (m.sender === userB && m.receiver === userA)
    );
  },

  create: (data) => {
    const message = {
      _id: generateUUID(),
      sender: data.sender,
      receiver: data.receiver,
      content: data.content,
      read: false,
      createdAt: new Date().toISOString(),
    };
    STORAGE.messages.push(message);
    return message;
  },

  markRead: (senderId, receiverId) => {
    STORAGE.messages.forEach(m => {
      if (m.sender === senderId && m.receiver === receiverId && !m.read) {
        m.read = true;
      }
    });
  },
};

// ============================================
// Router Setup
// ============================================
function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({ method, pattern, handler });
  }

  function matchPath(pattern, pathname) {
    if (pattern === '*') return {};

    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i += 1) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  async function handle(request, env, ctx) {
    const url = new URL(request.url);

    for (const route of routes) {
      if (route.method !== request.method && route.method !== 'ALL') continue;

      const params = matchPath(route.pattern, url.pathname);
      if (!params) continue;

      request.params = params;
      return route.handler(request, env, ctx);
    }

    return new Response('Not found', { status: 404 });
  }

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    options: (pattern, handler) => add('OPTIONS', pattern, handler),
    all: (pattern, handler) => add('ALL', pattern, handler),
    handle,
  };
}

const router = createRouter();

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS requests
router.options('*', () => new Response(null, { headers: corsHeaders }));

// ============================================
// Middleware: Token Verification
// ============================================
async function verifyAuth(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { error: 'Not authorized, no token', user: null };
  }

  const token = auth.split(' ')[1];
  const decoded = await verifyToken(token, env.JWT_SECRET || 'your-secret-key');
  
  if (!decoded) {
    return { error: 'Not authorized, token failed', user: null };
  }

  const user = UserOps.findById(decoded.id);
  if (!user) {
    return { error: 'User not found', user: null };
  }

  return { error: null, user };
}

// ============================================
// Routes: Auth
// ============================================

async function handleRegister(request, env) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    const cleanName = normalizeName(name);

    if (!cleanName || !email || !password) {
      return new Response(JSON.stringify({ message: 'All fields are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (cleanName.length < 2) {
      return new Response(JSON.stringify({ message: 'Name must be at least 2 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ message: 'Password must be at least 6 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (UserOps.findByEmail(email)) {
      return new Response(JSON.stringify({ message: 'Email already registered' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (UserOps.findByName(cleanName)) {
      return new Response(JSON.stringify({ message: 'Name already in use. Please use another name.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = await UserOps.create({ name: cleanName, email, password, avatar: '' });
    const token = await generateToken(user._id, env.JWT_SECRET || 'your-secret-key');

    return new Response(JSON.stringify({ ...UserOps.safe(user), token }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleLogin(request, env) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ message: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = UserOps.findByEmail(email);
    if (!user || !(await comparePassword(password, user.password))) {
      return new Response(JSON.stringify({ message: 'Invalid email or password' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await generateToken(user._id, env.JWT_SECRET || 'your-secret-key');

    return new Response(JSON.stringify({ ...UserOps.safe(user), token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// POST /api/auth/register
router.post('/api/auth/register', handleRegister);
router.post('/auth/register', handleRegister);

// POST /api/auth/login
router.post('/api/auth/login', handleLogin);
router.post('/auth/login', handleLogin);

async function handleUsers(request, env) {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const users = UserOps.findAll().map(u => UserOps.safe(u));
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/users
router.get('/api/users', handleUsers);
router.get('/users', handleUsers);

async function handleMe(request, env) {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(UserOps.safe(auth.user)), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/users/me
router.get('/api/users/me', handleMe);
router.get('/users/me', handleMe);

// ============================================
// Routes: Messages
// ============================================

// GET /api/messages/:userId
router.get('/api/messages/:userId', async (request, env) => {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = request.params;
    const myId = auth.user._id;

    if (!UserOps.findById(userId)) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = MessageOps.findBetween(myId, userId);
    MessageOps.markRead(userId, myId);

    const populated = messages.map(m => ({
      ...m,
      sender: UserOps.safe(UserOps.findById(m.sender)),
      receiver: UserOps.safe(UserOps.findById(m.receiver)),
    }));

    return new Response(JSON.stringify(populated), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// POST /api/messages/:userId
router.post('/api/messages/:userId', async (request, env) => {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId } = request.params;
    const body = await request.json();
    const { content } = body;
    const myId = auth.user._id;

    if (!content?.trim()) {
      return new Response(JSON.stringify({ message: 'Message content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = MessageOps.create({ sender: myId, receiver: userId, content: content.trim() });

    return new Response(JSON.stringify({
      ...message,
      sender: UserOps.safe(UserOps.findById(myId)),
      receiver: UserOps.safe(UserOps.findById(userId)),
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// GET /messages?userId=:userId
router.get('/messages', async (request, env) => {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || url.searchParams.get('receiverId');
    const myId = auth.user._id;

    if (!userId) {
      return new Response(JSON.stringify({ message: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!UserOps.findById(userId)) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = MessageOps.findBetween(myId, userId);
    MessageOps.markRead(userId, myId);

    const populated = messages.map(m => ({
      ...m,
      sender: UserOps.safe(UserOps.findById(m.sender)),
      receiver: UserOps.safe(UserOps.findById(m.receiver)),
    }));

    return new Response(JSON.stringify(populated), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// POST /send
router.post('/send', async (request, env) => {
  try {
    const auth = await verifyAuth(request, env);
    if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const userId = body.userId || body.receiverId;
    const content = body.content;
    const myId = auth.user._id;

    if (!userId) {
      return new Response(JSON.stringify({ message: 'Receiver ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!UserOps.findById(userId)) {
      return new Response(JSON.stringify({ message: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!content?.trim()) {
      return new Response(JSON.stringify({ message: 'Message content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const message = MessageOps.create({ sender: myId, receiver: userId, content: content.trim() });

    return new Response(JSON.stringify({
      ...message,
      sender: UserOps.safe(UserOps.findById(myId)),
      receiver: UserOps.safe(UserOps.findById(userId)),
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// Health Check
// ============================================

function healthResponse(env) {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'chat-api',
    storage: env?.CHAT_STORE ? 'kv' : 'memory',
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

router.get('/api/health', (request, env) => {
  return healthResponse(env);
});

router.get('/health', (request, env) => {
  return healthResponse(env);
});

// ============================================
// 404 Handler
// ============================================

router.all('*', () => {
  return new Response(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

// ============================================
// Export Handler
// ============================================

export default {
  async fetch(request, env, ctx) {
    await loadStorage(env);
    const response = await router.handle(request, env, ctx);
    await saveStorage(env);
    return response;
  },
};
