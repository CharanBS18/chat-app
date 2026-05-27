#!/bin/bash

# Cloudflare Worker Deployment Checklist

echo "================================"
echo "Cloudflare Worker Deployment"
echo "Pre-flight Checklist"
echo "================================"
echo ""

# Counters
PASSED=0
FAILED=0

# Check 1: Node.js
echo -n "✓ Node.js installed... "
if command -v node &> /dev/null; then
    echo "✅ $(node --version)"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Check 2: npm
echo -n "✓ npm installed... "
if command -v npm &> /dev/null; then
    echo "✅ $(npm --version)"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Check 3: Wrangler
echo -n "✓ Wrangler installed... "
if command -v wrangler &> /dev/null; then
    echo "✅ $(wrangler --version)"
    ((PASSED++))
else
    echo "❌ FAILED - Run: npm install -g wrangler"
    ((FAILED++))
fi

# Check 4: Dependencies
echo -n "✓ Backend dependencies... "
if [ -d "backend/node_modules" ]; then
    echo "✅ Found"
    ((PASSED++))
else
    echo "⚠️  MISSING - Run: cd backend && npm install"
fi

# Check 5: Frontend build
echo -n "✓ Frontend build... "
if [ -d "frontend/dist" ]; then
    echo "✅ Found"
    ((PASSED++))
else
    echo "⚠️  MISSING - Run: cd frontend && npm run build"
fi

# Check 6: worker.js
echo -n "✓ worker.js exists... "
if [ -f "backend/worker.js" ]; then
    echo "✅ Found ($(wc -l < backend/worker.js) lines)"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Check 7: wrangler.toml
echo -n "✓ wrangler.toml exists... "
if [ -f "backend/wrangler.toml" ]; then
    echo "✅ Found"
    ((PASSED++))
else
    echo "❌ FAILED"
    ((FAILED++))
fi

# Check 8: Cloudflare auth
echo -n "✓ Cloudflare authenticated... "
if wrangler whoami > /dev/null 2>&1; then
    ACCOUNT=$(wrangler whoami | grep -i account | head -1)
    echo "✅"
    ((PASSED++))
else
    echo "❌ FAILED - Run: wrangler login"
    ((FAILED++))
fi

# Check 9: JWT_SECRET
echo -n "✓ JWT_SECRET configured... "
if grep -q "JWT_SECRET" backend/wrangler.toml; then
    echo "✅ In wrangler.toml"
    ((PASSED++))
else
    echo "⚠️  MISSING - Set in wrangler.toml"
fi

# Check 10: Frontend .env
echo -n "✓ Frontend .env configured... "
if [ -f "frontend/.env" ]; then
    if grep -q "VITE_API_URL" frontend/.env; then
        echo "✅"
        ((PASSED++))
    else
        echo "⚠️  MISSING VITE_API_URL"
    fi
else
    echo "⚠️  MISSING frontend/.env"
fi

echo ""
echo "================================"
echo "Results: ✅ $PASSED | ❌ $FAILED"
echo "================================"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All checks passed!"
    echo ""
    echo "You can now deploy:"
    echo "  1. Development: wrangler dev"
    echo "  2. Production: wrangler publish"
    echo ""
else
    echo "⚠️  Some checks failed. See above for details."
    echo ""
    echo "Common fixes:"
    echo "  • Install wrangler: npm install -g wrangler"
    echo "  • Install dependencies: cd backend && npm install"
    echo "  • Build frontend: cd frontend && npm run build"
    echo "  • Login to Cloudflare: wrangler login"
    echo ""
fi

echo "For more info: cat CLOUDFLARE_WORKER_COMPLETE.md"
