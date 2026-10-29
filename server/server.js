const dotenv = require('dotenv');
// Load environment variables as early as possible
dotenv.config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./src/config/db');
const { initSocket } = require('./src/services/socketService');
const { notFound, errorHandler } = require('./src/middleware/errorMiddleware');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const approvalRoutes = require('./src/routes/approvalRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');

const app = express();
const server = http.createServer(app);

// Security and utility middleware
app.use(helmet());
app.use(cookieParser());

const configuredClientOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  ...(process.env.CLIENT_URLS || '').split(',')
].map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean);

const localDevOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const allowedOrigins = new Set([
  ...configuredClientOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : localDevOrigins)
]);
const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin.replace(/\/$/, '')) ||
  (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      return callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);
// Payment webhooks need their exact raw bytes for signature verification.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Initialize Socket.io
initSocket(server, [
  ...configuredClientOrigins,
  ...(process.env.NODE_ENV === 'production' ? [] : localDevOrigins)
]);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Walleto Backend API (Virtual Wallet & Selective Splitting)'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/approvals', approvalRoutes);
// Catch 404 & Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 5001;

// Port Conflict (EADDRINUSE) & General Server Error Handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use (EADDRINUSE).`);
    console.error(`💡 Tip: Another application or zombie Node process is already using port ${PORT}.`);
    console.error(`   To resolve, kill the process on port ${PORT} or specify a different PORT in server/.env (e.g. PORT=5001).\n`);
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
});

// Process-level unhandled rejection & uncaught exception safeguards
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err?.message || err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err?.message || err);
  process.exit(1);
});

// Wrap server.listen inside clean MongoDB connection promise
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => {
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Walleto Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`🌐 API URL: http://localhost:${PORT}/api`);
        console.log(`⚡ WebSocket URL: ws://localhost:${PORT}/socket.io/\n`);
      });
    })
    .catch((err) => {
      console.error(`❌ Failed to connect to MongoDB. Server startup aborted: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { app, server };
