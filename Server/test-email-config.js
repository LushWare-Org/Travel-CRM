import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('=== Email Configuration Test ===\n');

const config = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: process.env.EMAIL_FROM,
};

console.log('Configuration loaded:');
console.log(`  Host: ${config.host}`);
console.log(`  Port: ${config.port}`);
console.log(`  Secure: ${config.secure}`);
console.log(`  User: ${config.auth.user}`);
console.log(`  Password: ${config.auth.pass ? '✓ SET' : '✗ NOT SET'}`);
console.log(`  From: ${config.from}\n`);

console.log('Creating transporter...');
const transporter = nodemailer.createTransport(config);

console.log('Verifying connection...\n');
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Connection failed:');
    console.log('  Error:', error.message);
    console.log('  Code:', error.code);
    console.log('  Command:', error.command);
    if (error.response) console.log('  Response:', error.response);
  } else {
    console.log('✅ Connection successful!');
    console.log('  Ready to send emails');
  }
  process.exit(error ? 1 : 0);
});
