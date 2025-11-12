#!/bin/bash

# Rankly Local Development Setup Script
# This script helps you set up the project for local development

set -e

echo "🚀 Rankly Local Development Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"

# Check npm version
echo "📦 Checking npm version..."
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
    echo -e "${YELLOW}⚠️  npm version 9 or higher is recommended. Current version: $(npm -v)${NC}"
else
    echo -e "${GREEN}✅ npm version: $(npm -v)${NC}"
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules already exists, skipping...${NC}"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules already exists, skipping...${NC}"
fi
cd ..

# Create .env.local for frontend
echo ""
echo "🔧 Setting up frontend environment..."
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Rankly Frontend Environment Variables (Local Development)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local already exists, skipping...${NC}"
fi

# Create .env for backend
echo ""
echo "🔧 Setting up backend environment..."
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
# Rankly Backend Environment Variables (Local Development)
NODE_ENV=development
PORT=5000

# MongoDB Connection - UPDATE THIS WITH YOUR CONNECTION STRING
MONGODB_URI=mongodb://localhost:27017/rankly

# Frontend URL
FRONTEND_URL=http://localhost:3000

# JWT Configuration - GENERATE A SECURE SECRET
JWT_SECRET=development-secret-key-change-this-to-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# Google OAuth - UPDATE THESE WITH YOUR CREDENTIALS
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Google Analytics 4 OAuth - OPTIONAL
GA4_CLIENT_ID=your-ga4-client-id.apps.googleusercontent.com
GA4_CLIENT_SECRET=your-ga4-client-secret
GA4_REDIRECT_URI=http://localhost:5000/api/auth/ga4/callback

# OpenRouter API - UPDATE THIS WITH YOUR API KEY
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_REFERER=http://localhost:3000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000
EOF
    echo -e "${GREEN}✅ Created backend/.env${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Please update backend/.env with your actual credentials!${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env already exists, skipping...${NC}"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your MongoDB connection string"
echo "2. Update backend/.env with your Google OAuth credentials"
echo "3. Update backend/.env with your OpenRouter API key"
echo "4. Start the backend: cd backend && npm run dev"
echo "5. Start the frontend: npm run dev"
echo ""
echo "📖 See README.md for detailed setup instructions"
echo ""

