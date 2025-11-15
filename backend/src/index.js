const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const path = require('path');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Import passport after dotenv config
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for nginx reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking API requests
  crossOriginEmbedderPolicy: false,
  // Explicitly allow all headers including Authorization
  permittedCrossDomainPolicies: false,
  frameguard: false, // ✅ FIX: Disable X-Frame-Options to allow iframe embedding for previews
}));

// CORS configuration - support multiple origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000'];

// Validate FRONTEND_URL in production
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.warn('⚠️  WARNING: FRONTEND_URL not set in production. CORS may not work correctly.');
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl, etc.)
    // This is safe because we validate the token in the Authorization header
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all origins for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const originMatch = allowedOrigins.some(allowedOrigin => {
      // Support exact match
      if (origin === allowedOrigin) return true;
      
      try {
        const originUrl = new URL(origin);
        const originHostname = originUrl.hostname;
        
        // Handle wildcard subdomain patterns (e.g., *.tryrankly.com or https://*.tryrankly.com)
        if (allowedOrigin.includes('*.')) {
          // Extract domain from pattern (handles both "*.tryrankly.com" and "https://*.tryrankly.com")
          let domainPattern = allowedOrigin;
          
          // Strip protocol if present (https://*.tryrankly.com -> *.tryrankly.com)
          domainPattern = domainPattern.replace(/^https?:\/\//, '');
          
          // Remove "*." prefix to get base domain (e.g., *.tryrankly.com -> tryrankly.com)
          const baseDomain = domainPattern.replace(/^\*\./, '');
          
          // Check if origin hostname matches the base domain or is a subdomain
          // Examples:
          // - *.tryrankly.com should match: app.tryrankly.com, www.tryrankly.com, tryrankly.com
          // - *.tryrankly.com should NOT match: other.com
          if (originHostname === baseDomain || originHostname.endsWith('.' + baseDomain)) {
            return true;
          }
        }
        
        // Support exact domain match (e.g., https://app.tryrankly.com)
        return origin === allowedOrigin;
      } catch (e) {
        // If URL parsing fails, fall back to simple string match
        return origin === allowedOrigin;
      }
    });
    
    if (originMatch) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS: Blocked request from origin: ${origin}`);
      console.warn(`⚠️  CORS: Allowed origins: ${allowedOrigins.join(', ')}`);
      console.warn(`⚠️  CORS: Origin hostname: ${origin ? new URL(origin).hostname : 'N/A'}`);
      callback(new Error(`Not allowed by CORS. Origin ${origin} is not in allowed list.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours preflight cache
}));

// Rate limiting - DISABLED for LLM endpoints to allow long-running operations
// LLM endpoints can take several minutes and shouldn't be rate-limited
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Very high limit - primarily for non-LLM endpoints
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for:
  // 1. Development environment
  // 2. LLM-related endpoints (can take minutes to complete)
  // 3. Auth endpoints
  skip: (req) => {
    // Skip in development
    if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
      return true;
    }
    
    // Skip for LLM endpoints (these can take several minutes)
    const llmEndpoints = [
      '/api/onboarding/analyze-website',
      '/api/onboarding/generate-prompts',
      '/api/onboarding/test-prompts',
      '/api/insights/generate',
      '/api/insights/regenerate',
    ];
    
    const isLLMEndpoint = llmEndpoints.some(endpoint => req.path.startsWith(endpoint));
    if (isLLMEndpoint) {
      return true; // Skip rate limiting for LLM endpoints
    }
    
    // Skip for auth endpoints
    if (req.path.startsWith('/api/auth')) {
      return true;
    }
    
    return false;
  }
});

// Apply rate limiting (with LLM endpoint exemptions)
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log incoming requests (production debugging)
if (process.env.NODE_ENV === 'production' && process.env.DEBUG_REQUESTS === 'true') {
  app.use((req, res, next) => {
    console.log(`📥 [REQUEST] ${req.method} ${req.path}`, {
      hasAuth: !!req.headers.authorization,
      authLength: req.headers.authorization ? req.headers.authorization.length : 0,
      contentType: req.headers['content-type'],
      origin: req.headers.origin,
      ip: req.ip
    });
    next();
  });
}

// Cookie parser middleware
app.use(cookieParser());

// Session configuration for OAuth
// Validate JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('❌ ERROR: JWT_SECRET must be at least 32 characters in production!');
  console.error('❌ Generate one with: openssl rand -base64 32');
  process.exit(1);
}

app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'rankly_session',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Support cross-site in production with HTTPS
    domain: process.env.COOKIE_DOMAIN || undefined, // Set if using subdomains
    path: '/', // Available site-wide
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection with retry logic
async function connectMongoDB(retries = 5, delay = 2000) {
  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rankly', {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
      });
      
      console.log('✅ MongoDB connected');
      
      // Run startup cleanup to ensure database integrity
      try {
        const dataCleanupService = require('./services/dataCleanupService');
        console.log('\n🧹 Running startup cleanup...');
        await dataCleanupService.cleanOrphanedPrompts();
        await dataCleanupService.cleanOrphanedTestResults();
        console.log('✅ Startup cleanup complete\n');
      } catch (cleanupError) {
        console.error('⚠️  Startup cleanup failed (non-critical):', cleanupError.message);
      }

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        // Auto-reconnect handled by mongoose
      });

      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });

      return true;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt failed:`, err.message);
      return false;
    }
  };

  // Try to connect with retries
  for (let i = 0; i < retries; i++) {
    if (await connect()) {
      return;
    }
    
    if (i < retries - 1) {
      console.log(`⏳ Retrying MongoDB connection in ${delay}ms... (attempt ${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }

  console.error('❌ Failed to connect to MongoDB after all retries');
  console.error('⚠️  Server will continue but database operations will fail');
  
  // Don't exit process - allow server to start but log errors
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error (connection may be down):', err.message);
  });
}

// Connect to MongoDB
connectMongoDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Rankly Backend API',
    version: '1.0.0',
    description: 'Multi-LLM GEO/AEO Platform Backend',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth/*',
      ga4Auth: '/api/auth/ga4/*',
      ga4: '/api/ga4/*',
      user: '/api/user/*',
      onboarding: '/api/onboarding/*',
      competitors: '/api/competitors/*',
      topics: '/api/topics/*',
      personas: '/api/personas/*',
      prompts: '/api/prompts/*',
      cleanup: '/api/cleanup/*',
      metrics: '/api/metrics/*',
      analytics: '/api/analytics/*',
      urlAnalysis: '/api/url-analysis/*',
      subjectiveMetrics: '/api/subjective-metrics/*',
      insights: '/api/insights/*',
      apiUsage: '/api/usage/*'
    },
    status: 'Development - Ready for implementation'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const ga4AuthRoutes = require('./routes/ga4Auth');
const ga4Routes = require('./routes/ga4');
const onboardingRoutes = require('./routes/onboarding');
const competitorRoutes = require('./routes/competitors');
const topicRoutes = require('./routes/topics');
const personaRoutes = require('./routes/personas');
const promptRoutes = require('./routes/prompts');
const cleanupRoutes = require('./routes/cleanup');
const metricsRoutes = require('./routes/metrics');
const analyticsRoutes = require('./routes/analytics');
const urlAnalysisRoutes = require('./routes/urlAnalysis');
const clustersRoutes = require('./routes/clusters');
const dashboardMetricsRoutes = require('./routes/dashboardMetrics');
const subjectiveMetricsRoutes = require('./routes/subjectiveMetrics');
const citationsRoutes = require('./routes/citations');
const insightsRoutes = require('./routes/insights');
const sentimentBreakdownRoutes = require('./routes/sentimentBreakdown');
const actionablesRoutes = require('./routes/actionables');
const apiUsageRoutes = require('./routes/apiUsage');
const manualScrapingRoutes = require('./routes/manualScraping');

// Import error handler
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/ga4', ga4AuthRoutes);
app.use('/api/ga4', ga4Routes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/url-analysis', urlAnalysisRoutes);
app.use('/api/clusters', clustersRoutes);
app.use('/api/dashboard', dashboardMetricsRoutes);
app.use('/api/subjective-metrics', subjectiveMetricsRoutes);
app.use('/api/dashboard/citations', citationsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/sentiment', sentimentBreakdownRoutes);
app.use('/api/actionables', actionablesRoutes);
app.use('/api/usage', apiUsageRoutes);
app.use('/api/manual-scraping', manualScrapingRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Rankly Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API info: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Signal PM2 that app is ready (if using wait_ready)
  if (process.send) {
    process.send('ready');
  }
});

module.exports = app;
