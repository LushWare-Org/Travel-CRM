/**
 * Verify Gemini API Key
 * This script verifies if the GEMINI_API_KEY is correct and has access to models
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const geminiKey = process.env.GEMINI_API_KEY;
const emailKey = process.env.EMAIL_API_KEY || process.env.GMAIL_APP_PASSWORD;

console.log('\n🔍 Verifying Gemini API Key Configuration...\n');

// Check if they might have used email key
if (emailKey && geminiKey === emailKey) {
  console.log('❌ ERROR: GEMINI_API_KEY appears to be the same as EMAIL_API_KEY!');
  console.log('   These are DIFFERENT keys:');
  console.log('   - EMAIL_API_KEY: Used for sending emails (Gmail app password)');
  console.log('   - GEMINI_API_KEY: Used for AI content generation (from AI Studio)\n');
  console.log('📝 SOLUTION:');
  console.log('   1. Get Gemini API key from: https://makersuite.google.com/app/apikey');
  console.log('   2. Add to Server/.env: GEMINI_API_KEY=your_gemini_key_here');
  console.log('   3. Keep EMAIL_API_KEY separate for email functionality\n');
  process.exit(1);
}

if (!geminiKey || geminiKey.trim() === '') {
  console.log('❌ GEMINI_API_KEY not found in .env file');
  console.log('\n📝 Steps to fix:');
  console.log('1. Go to: https://makersuite.google.com/app/apikey');
  console.log('2. Click "Create API Key" or "Get API Key"');
  console.log('3. Copy the complete key (starts with AIza...)');
  console.log('4. Add to Server/.env: GEMINI_API_KEY=your_key_here');
  console.log('5. Restart server\n');
  process.exit(1);
}

const trimmedKey = geminiKey.trim();
const keyLength = trimmedKey.length;
const keyPreview = trimmedKey.substring(0, 10) + '...';

console.log(`✅ GEMINI_API_KEY found: ${keyPreview}`);
console.log(`   Length: ${keyLength} characters`);
console.log(`   Format: ${trimmedKey.startsWith('AIza') ? '✅ Valid format' : '❌ Invalid format (should start with AIza)'}\n`);

if (!trimmedKey.startsWith('AIza')) {
  console.log('❌ API key format is incorrect. Valid Gemini keys start with "AIza"');
  console.log('   This might be an email API key, not a Gemini API key!');
  console.log('   Get a Gemini key from: https://makersuite.google.com/app/apikey\n');
  process.exit(1);
}

if (keyLength < 35) {
  console.log('⚠️  Warning: API key seems too short. Valid keys are usually 39+ characters.');
}

console.log('🧪 Testing API key with Gemini models...\n');

try {
  const genAI = new GoogleGenerativeAI(trimmedKey);
  
  // Try the most common model first
  const modelsToTry = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  
  let success = false;
  let workingModel = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`   Testing: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test with a simple prompt
      const result = await model.generateContent('Say "Hello" in one word.');
      const response = await result.response;
      const text = response.text();
      
      console.log(`   ✅ ${modelName} WORKS! Response: "${text.trim()}"`);
      workingModel = modelName;
      success = true;
      break;
    } catch (error) {
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        console.log(`   ❌ ${modelName} - Model not found (404)`);
        continue;
      } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('API key') || errorMsg.includes('Invalid')) {
        console.log(`   ❌ ${modelName} - API key invalid or expired`);
        console.log('\n❌ Your API key is invalid or expired!');
        console.log('\n📝 Steps to fix:');
        console.log('1. Get a NEW API key from: https://makersuite.google.com/app/apikey');
        console.log('2. Make sure you\'re logged into the correct Google account');
        console.log('3. Copy the COMPLETE key (starts with AIza...)');
        console.log('4. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
        console.log('5. Restart server completely\n');
        process.exit(1);
      } else {
        console.log(`   ⚠️  ${modelName} - Error: ${errorMsg.substring(0, 60)}...`);
        continue;
      }
    }
  }
  
  if (success) {
    console.log(`\n✅ SUCCESS! Your API key is valid and working with: ${workingModel}`);
    console.log('   You can now use AI features in the application.\n');
    process.exit(0);
  } else {
    console.log('\n❌ All models failed. Your API key doesn\'t have access to Gemini models.');
    console.log('\n📝 Possible reasons:');
    console.log('   1. API key was created from Google Cloud Console (not AI Studio)');
    console.log('   2. API key doesn\'t have the Generative AI API enabled');
    console.log('   3. API key is restricted or doesn\'t have model access');
    console.log('\n📝 Steps to fix:');
    console.log('1. Go to: https://makersuite.google.com/app/apikey (AI Studio)');
    console.log('2. Make sure you\'re logged into the correct Google account');
    console.log('3. Create a NEW API key');
    console.log('4. Copy the COMPLETE key (starts with AIza...)');
    console.log('5. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
    console.log('6. Restart server completely');
    console.log('\n   NOTE: If using Google Cloud Console, enable API at:');
    console.log('   https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n');
    process.exit(1);
  }
} catch (error) {
  console.log('\n❌ Error testing API key:', error.message);
  console.log('\n📝 Steps to fix:');
  console.log('1. Get a NEW API key from: https://makersuite.google.com/app/apikey');
  console.log('2. Make sure it\'s from AI Studio (not Google Cloud Console)');
  console.log('3. Copy the COMPLETE key (starts with AIza...)');
  console.log('4. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
  console.log('5. Restart server completely\n');
  process.exit(1);
}

