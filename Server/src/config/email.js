import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import logger from './logger.js';

// Ensure dotenv is loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverDir = join(__dirname, '..');
const envPath = join(serverDir, '..', '.env');
dotenv.config({ path: envPath });

const emailConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM,
};

// Validate email configuration on startup
// Check if variables are defined and not just whitespace
const hasHost = emailConfig.host && emailConfig.host.trim();
const hasPort = emailConfig.port && !isNaN(emailConfig.port);
const hasUser = emailConfig.auth.user && emailConfig.auth.user.trim();
const hasPass = emailConfig.auth.pass && emailConfig.auth.pass.trim();
const hasFrom = emailConfig.from && emailConfig.from.trim();

if (!hasHost || !hasPort || !hasUser || !hasPass || !hasFrom) {
  logger.warn('⚠️  Email configuration incomplete. These env variables are required:');
  if (!hasHost) logger.warn(`  - EMAIL_HOST (currently: "${process.env.EMAIL_HOST || 'undefined'}")`);
  if (!hasPort) logger.warn(`  - EMAIL_PORT (currently: "${process.env.EMAIL_PORT || 'undefined'}")`);
  if (!hasUser) logger.warn(`  - EMAIL_USER (currently: "${process.env.EMAIL_USER || 'undefined'}")`);
  if (!hasPass) logger.warn(`  - EMAIL_PASSWORD (currently: "${process.env.EMAIL_PASSWORD ? 'SET' : 'undefined'}")`);
  if (!hasFrom) logger.warn(`  - EMAIL_FROM (currently: "${process.env.EMAIL_FROM || 'undefined'}")`);
  logger.warn('Email sending will not work until these are configured.');
} else {
  logger.info(`✅ Email service configured: ${emailConfig.host}:${emailConfig.port} (Secure: ${emailConfig.secure})`);
}

export default emailConfig;
