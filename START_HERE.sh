#!/bin/bash

# SIMPLE START SCRIPT - Just run this!

echo "🚀 Starting Rankly..."
echo ""

# Kill anything on the ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 1

echo "Starting Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

sleep 5

echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

sleep 5

echo ""
echo "=========================================="
echo "✅ Servers are starting!"
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop (but servers will keep running)"
echo "To stop servers: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait

