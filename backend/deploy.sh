#!/bin/bash

# Cloudflare Worker Deployment Quick Start

set -e

echo "🚀 Cloudflare Worker Deployment Setup"
echo "======================================"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "✅ Wrangler installed"
echo ""

# Check if authenticated
echo "🔐 Checking Cloudflare authentication..."
if wrangler whoami > /dev/null 2>&1; then
    echo "✅ Already authenticated with Cloudflare"
else
    echo "⚠️  Not authenticated. Running login..."
    wrangler login
fi

echo ""
echo "📋 Current Configuration:"
echo "------------------------"
echo "Worker Name: chat-app-api"
echo "Entry Point: worker.js"
echo "Router: itty-router"
echo ""

echo "🚀 Deployment Options:"
echo "1. Local Development: npm run dev:worker"
echo "2. Deploy to Cloudflare: npm run deploy"
echo "3. Deploy to Production: npm run deploy:prod"
echo ""

echo "📝 Next Steps:"
echo "1. Update wrangler.toml with your Cloudflare Account ID"
echo "2. Set JWT_SECRET: wrangler secret put JWT_SECRET"
echo "3. Run: npm run deploy"
echo ""

echo "✨ Done! Your Worker is ready to deploy."
