#!/bin/bash

# Start both backend and frontend servers
# This script will start both and keep them running

set -e

echo "🚀 Starting Rankly Development Servers"
echo "========================================"
echo ""

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
npm run dev > ../backend-output.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "   Backend PID: $BACKEND_PID"
echo "   Waiting for backend to start..."
sleep 8

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    echo "Backend output:"
    cat backend-output.log
    exit 1
fi

# Test backend health
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:5000"
else
    echo "⚠️  Backend might still be starting..."
    echo "Check backend-output.log for details"
fi

# Start frontend in background
echo ""
echo "🎨 Starting frontend server..."
npm run dev > frontend-output.log 2>&1 &
FRONTEND_PID=$!

echo "   Frontend PID: $FRONTEND_PID"
echo "   Waiting for frontend to start..."
sleep 10

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start!"
    echo "Frontend output:"
    cat frontend-output.log
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
echo "📝 Logs:"
echo "   Backend:  tail -f backend-output.log"
echo "   Frontend: tail -f frontend-output.log"
echo ""
echo "🛑 To stop:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   Or: lsof -ti:3000 -ti:5000 | xargs kill -9"
echo ""
echo "Press Ctrl+C to view logs, then kill processes manually"
echo ""

# Wait and show logs
tail -f backend-output.log frontend-output.log

