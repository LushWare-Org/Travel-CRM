/**
 * Quick Gemini Setup Checker
 * Run: node src/scripts/checkGeminiSetup.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

console.log('🔍 Checking Gemini AI Setup...\n');

// Check 1: API Key exists
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log('❌ GEMINI_API_KEY not found in .env file');
  console.log('\n📝 Steps to fix:');
  console.log('1. Go to: https://makersuite.google.com/app/apikey');
  console.log('2. Sign in with Google account');
  console.log('3. Click "Create API Key"');
  console.log('4. Copy the key');
  console.log('5. Add to Server/.env: GEMINI_API_KEY=your_key_here\n');
  process.exit(1);
}

console.log('✅ GEMINI_API_KEY found in .env');

// Check 2: API Key format
if (apiKey.length < 20) {
  console.log('⚠️  API key seems too short. Please verify it\'s correct.');
}

console.log(`✅ API key length: ${apiKey.length} characters`);

// Check 3: Test API connection
console.log('\n🧪 Testing API connection...');

try {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Try the most common model
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  console.log('✅ Gemini client initialized');
  console.log('✅ Model loaded: gemini-pro');
  
  // Try a simple generation
  console.log('🔄 Testing content generation...');
  const result = await model.generateContent('Say "Hello" in one word');
  const response = await result.response;
  const text = response.text();
  
  console.log(`✅ Generation successful! Response: "${text.trim()}"\n`);
  console.log('🎉 Everything is working! Your Gemini AI is properly configured.\n');
  
} catch (error) {
  console.log('❌ API test failed!\n');
  console.log('Error:', error.message);
  
  if (error.message.includes('404') || error.message.includes('not found')) {
    console.log('\n📋 This usually means:');
    console.log('1. The API key doesn\'t have access to Gemini models');
    console.log('2. For Google Cloud API keys, you need to enable the API');
    console.log('\n💡 Solutions:');
    console.log('Option A - Use AI Studio Key (Recommended):');
    console.log('  1. Go to: https://makersuite.google.com/app/apikey');
    console.log('  2. Create a new API key');
    console.log('  3. This key works immediately, no setup needed\n');
    
    console.log('Option B - Enable API for Google Cloud Key:');
    console.log('  1. Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
    console.log('  2. Select your project');
    console.log('  3. Click "Enable"');
    console.log('  4. Wait a few minutes, then try again\n');
  } else if (error.message.includes('API key') || error.message.includes('authentication')) {
    console.log('\n📋 Invalid API key');
    console.log('💡 Get a new key from: https://makersuite.google.com/app/apikey\n');
  } else {
    console.log('\n📋 Unexpected error');
    console.log('💡 Check the error message above for details\n');
  }
  
  process.exit(1);
}

