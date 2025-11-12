#!/bin/bash

# Full startup test - starts both servers and tests them

set -e

echo "🧪 Testing Full Startup"
echo "======================"
echo ""

# Clean up
echo "🧹 Cleaning up..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend
echo "🔧 Starting backend..."
cd backend
npm run dev > ../backend-test.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "   Backend PID: $BACKEND_PID"
echo "   Waiting for backend to start..."
sleep 10

# Check backend
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    echo "Backend logs:"
    cat backend-test.log
    exit 1
fi

# Test backend health
echo "   Testing backend health..."
for i in {1..5}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo "   ✅ Backend is responding"
        curl -s http://localhost:5000/health | jq . 2>/dev/null || curl -s http://localhost:5000/health
        break
    else
        echo "   ⏳ Waiting for backend... ($i/5)"
        sleep 2
    fi
done

# Start frontend
echo ""
echo "🎨 Starting frontend..."
npm run dev > frontend-test.log 2>&1 &
FRONTEND_PID=$!

echo "   Frontend PID: $FRONTEND_PID"
echo "   Waiting for frontend to start..."
sleep 15

# Check frontend
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start!"
    echo "Frontend logs:"
    cat frontend-test.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test frontend
echo "   Testing frontend..."
for i in {1..5}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "   ✅ Frontend is responding"
        echo "   Frontend returns HTML: $(curl -s http://localhost:3000 | head -1 | cut -c1-50)..."
        break
    else
        echo "   ⏳ Waiting for frontend... ($i/5)"
        sleep 3
    fi
done

# Test API connection from frontend perspective
echo ""
echo "🔗 Testing API connection..."
API_RESPONSE=$(curl -s http://localhost:5000/api 2>&1)
if echo "$API_RESPONSE" | grep -q "Rankly"; then
    echo "   ✅ API endpoint is accessible"
else
    echo "   ⚠️  API endpoint response: $API_RESPONSE"
fi

# Check for errors in logs
echo ""
echo "📋 Checking for errors..."
BACKEND_ERRORS=$(grep -i "error\|failed\|❌" backend-test.log | tail -5 || true)
FRONTEND_ERRORS=$(grep -i "error\|failed\|❌" frontend-test.log | tail -5 || true)

if [ -n "$BACKEND_ERRORS" ]; then
    echo "   ⚠️  Backend errors found:"
    echo "$BACKEND_ERRORS" | sed 's/^/      /'
fi

if [ -n "$FRONTEND_ERRORS" ]; then
    echo "   ⚠️  Frontend errors found:"
    echo "$FRONTEND_ERRORS" | sed 's/^/      /'
fi

echo ""
echo "========================================"
echo "✅ Startup Test Complete!"
echo ""
echo "📊 Backend:  http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend-test.log"
echo "   Frontend: tail -f frontend-test.log"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🌐 Open http://localhost:3000 in your browser"
echo ""

# Keep running
echo "Servers are running. Press Ctrl+C to stop..."
wait $BACKEND_PID $FRONTEND_PID

