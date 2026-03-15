const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const winston = require('winston');
require('dotenv').config();

const Database = require('./database');
const { router: authRoutes, authenticateToken } = require('./routes/auth');
const activationRoutes = require('./routes/activations');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/services');
const webhookRoutes = require('./routes/webhooks');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;

// Initialize database
const db = new Database();

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Make io and db available to routes
app.use((req, res, next) => {
  req.io = io;
  req.db = db;
  req.logger = logger;
  req.authenticateToken = authenticateToken;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/activations', activationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/webhooks', webhookRoutes);

// App routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/app', (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/app/', (req, res) => {
  res.sendFile(__dirname + '/public/app.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/app/funds', (req, res) => {
  res.sendFile(__dirname + '/public/funds.html');
});

app.get('/app/create-account', (req, res) => {
  res.sendFile(__dirname + '/public/create-account.html');
});

// Health check
app.get('/api/public/numbers', async (req, res) => {
  try {
    const numbers = await req.db.getPublicNumbers();
    res.json(numbers);
  } catch (error) {
    req.logger.error('Error fetching public numbers:', error);
    res.status(500).json({ error: 'Failed to fetch public numbers' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // This is for the private number activation feature
  socket.on('join-activation', (activationId) => {
    socket.join(`activation-${activationId}`);
    logger.info(`Client ${socket.id} joined activation ${activationId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  logger.info(`🚀 TempSMS Pro running on port ${PORT}`);
  logger.info(`📱 Access: http://localhost:${PORT}`);
  logger.info(`🔌 WebSocket enabled for real-time updates`);
});

module.exports = { app, server, io };
