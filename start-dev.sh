#!/bin/bash

# Rankly Development Server Starter
# This script starts both frontend and backend servers

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Starting Rankly Development Servers"
echo "======================================"
echo ""

# Check if environment files exist
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found. Please run ./setup.sh first"
    exit 1
fi

if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found. Please run ./setup.sh first"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup INT TERM

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo -e "${GREEN}✅ Servers starting...${NC}"
echo ""
echo "📊 Backend:  http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

