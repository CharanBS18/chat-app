# Cloudflare Worker Backend Deployment Guide

## Overview

This backend has been converted from Express.js to a Cloudflare Worker. It provides a serverless REST API for your chat application without needing Socket.io (real-time updates are handled via polling on the frontend).

## Features

✅ **Auth Endpoints**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

✅ **User Endpoints**
- `GET /api/users` - List all users
- `GET /api/users/me` - Get current user profile

✅ **Message Endpoints**
- `GET /api/messages/:userId` - Get messages with specific user
- `POST /api/messages/:userId` - Send message to user

✅ **Health Check**
- `GET /api/health` - API status

## In-Memory Storage

Messages and users are stored in-memory. For production persistence, upgrade to Cloudflare KV or D1 database.

## Setup & Deployment

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install Wrangler CLI

```bash
npm install -g wrangler
# or
npm install --save-dev wrangler
```

### 3. Authenticate with Cloudflare

```bash
wrangler login
```

This will open a browser to authenticate your Cloudflare account.

### 4. Configure wrangler.toml

Update `wrangler.toml` with:
- Your Cloudflare account ID
- Your domain (if using custom domain)
- Change JWT_SECRET to a secure value

### 5. Deploy to Cloudflare Workers

```bash
# Development (testing)
wrangler dev

# Production deployment
wrangler publish

# Or with environment
wrangler publish --env production
```

### 6. Update Frontend API URL

Update your frontend `.env` file:

```env
VITE_API_URL=https://your-worker-name.workers.dev/api
VITE_SOCKET_URL=https://your-worker-name.workers.dev
```

## API Endpoints

### Authentication

**Register**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "",
  "isOnline": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "token": "jwt-token"
}
```

### Messages

**Get Messages with User**
```bash
GET /api/messages/userId
Authorization: Bearer {token}
```

**Send Message**
```bash
POST /api/messages/userId
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "Hello!"
}
```

## Upgrading Storage

### Option 1: Cloudflare KV (Recommended for small-medium apps)

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "DB"
id = "your-kv-id"
preview_id = "your-preview-id"
```

Update worker.js to use KV instead of in-memory storage.

### Option 2: Cloudflare D1 (SQLite database)

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "chat-db"
database_id = "your-db-id"
```

## Environment Variables

Create a `.env.local` file for local development:

```
JWT_SECRET=your-secret-key
```

For production, set via Cloudflare dashboard or:

```bash
wrangler secret put JWT_SECRET
```

## Troubleshooting

**CORS Issues**
- Ensure CORS headers are set correctly in worker.js
- Check browser console for actual error messages

**Authentication Fails**
- Verify JWT_SECRET is the same on client and server
- Check token format in Authorization header

**Messages Not Persisting**
- In-memory storage is lost on worker restart
- Use Cloudflare KV or D1 for persistence

## Next Steps

1. Upgrade to Cloudflare KV for persistent storage
2. Add file upload support via Cloudflare R2
3. Set up custom domain routing
4. Enable rate limiting on auth endpoints
5. Add user presence tracking via KV

## Files Changed

- `worker.js` - Main Worker handler (new)
- `wrangler.toml` - Cloudflare configuration (new)
- `package.json` - Updated dependencies

## Support

For issues with Cloudflare Workers:
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [itty-router](https://itty.dev/)
