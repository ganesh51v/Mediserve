import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { connectDB } from './db/connection.js';
import { initSocketIO } from './services/socket.service.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import medicationRoutes from './routes/medication.routes.js';
import deviceRoutes from './routes/device.routes.js';
import alertRoutes from './routes/alert.routes.js';
import reportRoutes from './routes/report.routes.js';
import auditRoutes from './routes/audit.routes.js';

const app = express();
const httpServer = http.createServer(app);

// Initialize WebSockets
initSocketIO(httpServer);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-token'],
  })
);
app.use(express.json());

// Apply rate limiting to /api routes
app.use('/api', apiLimiter);

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MediServe MERN Smart Medication Monitoring Platform',
    stack: 'MERN (MongoDB, Express, React, Node.js)',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// Error Handler
app.use(errorHandler);

// Initialize Database Connection & Server
export async function startServer() {
  await connectDB();
  return new Promise<http.Server>((resolve) => {
    httpServer.listen(config.port, () => {
      console.log(`🏥 MediServe MERN Backend running on port ${config.port}`);
      console.log(`🌐 REST API: http://localhost:${config.port}/api`);
      console.log(`🔌 WebSockets: ws://localhost:${config.port}`);
      resolve(httpServer);
    });
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start MediServe MERN server:', err);
    process.exit(1);
  });
}

export { app, httpServer };
