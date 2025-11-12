#!/bin/bash

# Rankly Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Rankly Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please don't run this script as root${NC}"
   exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Navigate to project directory
cd "$(dirname "$0")"

# Check for required environment files
echo -e "${YELLOW}🔍 Checking environment configuration...${NC}"

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    if [ -f "backend/env.example.txt" ]; then
        echo -e "${YELLOW}   Creating backend/.env from env.example.txt...${NC}"
        echo -e "${RED}   ⚠️  IMPORTANT: Edit backend/.env with your production values before continuing!${NC}"
        cp backend/env.example.txt backend/.env
        echo -e "${YELLOW}   Opening backend/.env for editing...${NC}"
        echo -e "${RED}   Please configure all required variables, then run deploy.sh again.${NC}"
        exit 1
    else
        echo -e "${RED}❌ backend/.env not found and no example file available${NC}"
        exit 1
    fi
fi

if [ ! -f ".env.production.local" ]; then
    echo -e "${YELLOW}⚠️  .env.production.local not found${NC}"
    if [ -f "env.production.local.example.txt" ]; then
        echo -e "${YELLOW}   Creating .env.production.local from example...${NC}"
        cp env.production.local.example.txt .env.production.local
        echo -e "${YELLOW}   Please edit .env.production.local with your production API URL${NC}"
    fi
fi

# Validate critical environment variables
echo -e "${YELLOW}🔍 Validating environment variables...${NC}"
cd backend
source .env 2>/dev/null || true

if [ -z "$MONGODB_URI" ] || [[ "$MONGODB_URI" == *"your-"* ]] || [[ "$MONGODB_URI" == *"mongodb://localhost"* ]]; then
    echo -e "${RED}❌ MONGODB_URI is not configured properly in backend/.env${NC}"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET must be at least 32 characters in backend/.env${NC}"
    echo -e "${YELLOW}   Generate one with: openssl rand -base64 32${NC}"
    exit 1
fi

if [ -z "$FRONTEND_URL" ] || [[ "$FRONTEND_URL" != "https://"* ]]; then
    echo -e "${RED}❌ FRONTEND_URL must be set and start with https:// in backend/.env${NC}"
    exit 1
fi

if [ -z "$OPENROUTER_API_KEY" ] || [[ "$OPENROUTER_API_KEY" == *"your-"* ]]; then
    echo -e "${RED}❌ OPENROUTER_API_KEY is not configured in backend/.env${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✅ Environment variables validated${NC}"
echo ""

echo -e "${GREEN}📦 Installing dependencies...${NC}"

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Build frontend
echo -e "${GREEN}🔨 Building Next.js application...${NC}"
npm run build

# Create logs directory
mkdir -p logs

# Stop existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing PM2 processes...${NC}"
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start PM2 processes
echo -e "${GREEN}▶️  Starting PM2 processes...${NC}"
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📝 View logs with: pm2 logs"
echo "🔄 Restart with: pm2 restart all"
echo ""
echo -e "${YELLOW}⚠️  Post-deployment checklist:${NC}"
echo "  1. Configure nginx (see nginx.conf and DEPLOYMENT_CHECKLIST.md)"
echo "  2. Set up SSL certificate (Let's Encrypt recommended)"
echo "  3. Update Google OAuth redirect URIs in Google Cloud Console"
echo "  4. Test the application: curl https://yourdomain.com/health"
echo "  5. Set up PM2 startup: pm2 startup (follow instructions)"
echo ""
echo -e "${GREEN}📚 See DEPLOYMENT_CHECKLIST.md for detailed instructions${NC}"





