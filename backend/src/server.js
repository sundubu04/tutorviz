const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');

// Import routes
const authRoutes = require('./api/routes/auth');
const classRoutes = require('./api/routes/classes');
const assignmentRoutes = require('./api/routes/assignments');
const userRoutes = require('./api/routes/users');
const calendarRoutes = require('./api/routes/calendar');
const latexRoutes = require('./api/routes/latex');
const taskRoutes = require('./api/routes/tasks');
const taskAiRoutes = require('./api/routes/taskAi');
const taskWorkflowRoutes = require('./api/routes/taskWorkflow');
const supabaseRoutes = require('./api/routes/supabase');

const app = express();
const PORT = process.env.PORT || 5001;
const prisma = new PrismaClient();
let isDbConnected = false;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes
app.use(limiter);

// CORS configuration - moved before rate limiting
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TutoriAI Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/latex', latexRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/supabase', supabaseRoutes);
app.use('/api', taskAiRoutes);
app.use('/api', taskWorkflowRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON',
      message: 'The request body contains invalid JSON'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server (listen immediately; connect to DB with retries)
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 TutoriAI Backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Increase socket timeout to accommodate slow OpenAI requests.
  // Default Node timeout is often ~2 minutes; if the model takes longer,
  // the client can see `ERR_CONNECTION_RESET`.
  server.timeout = 5 * 60 * 1000; // 5 minutes
  server.headersTimeout = 5 * 60 * 1000;

  const connectWithRetry = async () => {
    // Retry forever in dev so the container doesn't crash-restart
    while (!isDbConnected) {
      try {
        await prisma.$connect();
        isDbConnected = true;
        console.log('✅ Database connection successful');
      } catch (error) {
        console.error('❌ Failed to connect to database. Retrying in 5s...', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  connectWithRetry();
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

module.exports = app; 