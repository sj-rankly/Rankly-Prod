/**
 * PM2 Ecosystem Configuration
 * Run: pm2 start ecosystem.config.js --env production
 */

const path = require('path');

module.exports = {
  apps: [
    {
      name: 'rankly-backend',
      script: path.resolve(__dirname, 'backend/src/index.js'),
      cwd: path.resolve(__dirname),
      instances: 1, // Start with 1 instance for debugging, increase later if needed
      exec_mode: 'fork', // Use fork mode first, switch to cluster after confirming it works
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 30000, // 30 seconds - allow graceful shutdown for long-running operations
      wait_ready: true, // Wait for app to signal ready
      listen_timeout: 10000, // 10 seconds to start
      // Ensure .env file is found
      env_file: './backend/.env',
    },
    {
      name: 'rankly-frontend',
      script: 'npm',
      args: 'start',
      cwd: path.resolve(__dirname),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};






