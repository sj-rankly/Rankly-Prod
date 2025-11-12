#!/bin/bash

# Rankly Local Development Startup Script
# This script starts both backend and frontend with clear error messages

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Rankly Local Development${NC}"
echo "=========================================="
echo ""

# Check if environment files exist
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env not found!${NC}"
    echo "Please create backend/.env with your configuration"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ Error: .env.local not found!${NC}"
    echo "Please create .env.local with NEXT_PUBLIC_API_URL=http://localhost:5000/api"
    exit 1
fi

# Check if ports are available
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 5000 is already in use${NC}"
    echo "Killing process on port 5000..."
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use${NC}"
    echo "Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit
}

trap cleanup INT TERM

# Start backend
echo -e "${BLUE}🔧 Starting backend server...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start!${NC}"
    echo "Check backend.log for errors:"
    tail -20 backend.log
    exit 1
fi

# Test backend health
echo "Testing backend health..."
sleep 2
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on http://localhost:5000${NC}"
else
    echo -e "${YELLOW}⚠️  Backend might still be starting...${NC}"
    echo "Check backend.log for details"
fi

# Start frontend
echo ""
echo -e "${BLUE}🎨 Starting frontend server...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 5

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend failed to start!${NC}"
    echo "Check frontend.log for errors:"
    tail -20 frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Both servers are starting!${NC}"
echo ""
echo "📊 Backend:  http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "  - Backend:  tail -f backend.log"
echo "  - Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

