#!/bin/bash

echo "Testing Cloudflare Worker Backend Locally"
echo "=========================================="
echo ""

# Test health check
echo "1. Testing Health Check..."
curl -s http://localhost:5001/api/health | jq . || echo "Error: Backend not running on 5001"
echo ""

# Test registration
echo "2. Testing Registration..."
curl -s -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }' | jq .
echo ""

# Extract token from response and test login
echo "3. Testing Login..."
curl -s -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | jq .
echo ""

echo "=========================================="
echo "Basic tests completed!"
