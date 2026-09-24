import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'mediserve-super-secret-jwt-key-2026-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../mediserve.sqlite'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  deviceTokenSecret: process.env.DEVICE_TOKEN_SECRET || 'mediserve-device-token-secret-xyz987',
};
