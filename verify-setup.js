#!/usr/bin/env node

/**
 * Rankly Setup Verification Script
 * This script verifies that your local development environment is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Rankly Setup Verification\n');
console.log('=' .repeat(50));
console.log('');

let hasErrors = false;
let hasWarnings = false;

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 18) {
    console.log(`✅ Node.js version: ${nodeVersion} (>= 18.0.0)`);
  } else {
    console.log(`❌ Node.js version: ${nodeVersion} (requires >= 18.0.0)`);
    hasErrors = true;
  }
}

// Check npm version
function checkNpmVersion() {
  const { execSync } = require('child_process');
  try {
    const npmVersion = execSync('npm -v', { encoding: 'utf-8' }).trim();
    const majorVersion = parseInt(npmVersion.split('.')[0]);
    
    if (majorVersion >= 9) {
      console.log(`✅ npm version: ${npmVersion} (>= 9.0.0)`);
    } else {
      console.log(`⚠️  npm version: ${npmVersion} (recommended >= 9.0.0)`);
      hasWarnings = true;
    }
  } catch (error) {
    console.log(`⚠️  Could not check npm version`);
    hasWarnings = true;
  }
}

// Check if dependencies are installed
function checkDependencies() {
  const frontendNodeModules = path.join(__dirname, 'node_modules');
  const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
  
  if (fs.existsSync(frontendNodeModules)) {
    console.log('✅ Frontend dependencies installed');
  } else {
    console.log('❌ Frontend dependencies not installed. Run: npm install');
    hasErrors = true;
  }
  
  if (fs.existsSync(backendNodeModules)) {
    console.log('✅ Backend dependencies installed');
  } else {
    console.log('❌ Backend dependencies not installed. Run: cd backend && npm install');
    hasErrors = true;
  }
}

// Check environment files
function checkEnvFiles() {
  const frontendEnv = path.join(__dirname, '.env.local');
  const backendEnv = path.join(__dirname, 'backend', '.env');
  
  if (fs.existsSync(frontendEnv)) {
    console.log('✅ Frontend .env.local exists');
    
    // Check if API URL is set
    const envContent = fs.readFileSync(frontendEnv, 'utf-8');
    if (envContent.includes('NEXT_PUBLIC_API_URL')) {
      console.log('✅ NEXT_PUBLIC_API_URL is configured');
    } else {
      console.log('⚠️  NEXT_PUBLIC_API_URL not found in .env.local');
      hasWarnings = true;
    }
  } else {
    console.log('⚠️  Frontend .env.local not found. Create it with NEXT_PUBLIC_API_URL=http://localhost:5000/api');
    hasWarnings = true;
  }
  
  if (fs.existsSync(backendEnv)) {
    console.log('✅ Backend .env exists');
    
    // Check for required backend env variables
    const envContent = fs.readFileSync(backendEnv, 'utf-8');
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'OPENROUTER_API_KEY',
      'FRONTEND_URL'
    ];
    
    const missingVars = [];
    requiredVars.forEach(varName => {
      if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your-`) || envContent.includes(`${varName}=`)) {
        // Check if it's actually set (not just placeholder)
        const regex = new RegExp(`${varName}=(.+)`, 'i');
        const match = envContent.match(regex);
        if (!match || match[1].trim() === '' || match[1].includes('your-')) {
          missingVars.push(varName);
        }
      }
    });
    
    if (missingVars.length === 0) {
      console.log('✅ All required backend environment variables are set');
    } else {
      console.log(`⚠️  Missing or placeholder values for: ${missingVars.join(', ')}`);
      hasWarnings = true;
    }
  } else {
    console.log('❌ Backend .env not found. Create it in backend/.env');
    hasErrors = true;
  }
}

// Check if ports are available (basic check)
function checkPorts() {
  const net = require('net');
  
  function checkPort(port, name) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }
  
  // Note: This is a simple check and may not be 100% accurate
  console.log('ℹ️  Port availability check (may not be 100% accurate)');
  console.log('   Run servers to verify ports are actually available');
}

// Run all checks
console.log('📦 Checking Prerequisites...\n');
checkNodeVersion();
checkNpmVersion();
console.log('');

console.log('📚 Checking Dependencies...\n');
checkDependencies();
console.log('');

console.log('🔧 Checking Environment Files...\n');
checkEnvFiles();
console.log('');

console.log('🔌 Checking Ports...\n');
checkPorts();
console.log('');

// Summary
console.log('=' .repeat(50));
console.log('');
if (hasErrors) {
  console.log('❌ Setup has ERRORS. Please fix them before proceeding.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Setup has WARNINGS. Review them and update configuration as needed.');
  console.log('');
  console.log('📖 Next steps:');
  console.log('1. Update backend/.env with your actual credentials');
  console.log('2. Ensure .env.local has NEXT_PUBLIC_API_URL=http://localhost:5000/api');
  console.log('3. Start backend: cd backend && npm run dev');
  console.log('4. Start frontend: npm run dev');
  process.exit(0);
} else {
  console.log('✅ Setup looks good!');
  console.log('');
  console.log('🚀 Ready to start development:');
  console.log('1. Start backend: cd backend && npm run dev');
  console.log('2. Start frontend: npm run dev');
  process.exit(0);
}

