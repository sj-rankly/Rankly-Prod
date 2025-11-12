#!/bin/bash

# SIMPLE STARTUP SCRIPT - Run this and it will start both servers

echo "🚀 Starting Rankly..."
echo ""

# Kill anything existing
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend
echo "Starting backend server..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "Backend PID: $BACKEND_PID"
echo "Backend log: backend.log"
sleep 8

# Check backend
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start! Check backend.log"
    cat backend.log
    exit 1
fi

# Test backend
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:5000"
else
    echo "⚠️  Backend might still be starting..."
fi

# Start frontend
echo ""
echo "Starting frontend server..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend log: frontend.log"
sleep 10

# Check frontend
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start! Check frontend.log"
    cat frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Both servers are running!"
echo ""
echo "📊 Backend:  http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "📝 View logs:"
echo "   tail -f backend.log"
echo "   tail -f frontend.log"
echo ""
echo "🌐 Open this URL in your browser:"
echo "   http://localhost:3000"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   Or: pkill -f 'node.*backend' && pkill -f 'next dev'"
echo ""
echo "========================================"
echo ""
echo "Servers are running in the background."
echo "Check the logs if you see any issues."
echo ""
echo "Press Enter to view backend log (Ctrl+C to exit)..."
read
tail -f backend.log

