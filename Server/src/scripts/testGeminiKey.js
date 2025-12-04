/**
 * Test Gemini API Key
 * This script tests if the GEMINI_API_KEY is valid and working
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

const apiKey = process.env.GEMINI_API_KEY;

console.log('\n🔍 Testing Gemini API Key...\n');

if (!apiKey || apiKey.trim() === '') {
  console.log('❌ GEMINI_API_KEY not found in .env file');
  console.log('\n📝 Steps to fix:');
  console.log('1. Get API key from: https://makersuite.google.com/app/apikey');
  console.log('2. Add to Server/.env: GEMINI_API_KEY=your_key_here');
  console.log('3. Restart server\n');
  process.exit(1);
}

const trimmedKey = apiKey.trim();
const keyLength = trimmedKey.length;
const keyPreview = trimmedKey.substring(0, 10) + '...';

console.log(`✅ API Key found: ${keyPreview}`);
console.log(`   Length: ${keyLength} characters`);
console.log(`   Format: ${trimmedKey.startsWith('AIza') ? '✅ Valid format' : '❌ Invalid format (should start with AIza)'}\n`);

if (!trimmedKey.startsWith('AIza')) {
  console.log('❌ API key format is incorrect. Valid keys start with "AIza"');
  console.log('   Get a new key from: https://makersuite.google.com/app/apikey\n');
  process.exit(1);
}

if (keyLength < 35) {
  console.log('⚠️  Warning: API key seems too short. Valid keys are usually 39+ characters.');
  console.log('   Make sure you copied the complete key.\n');
}

console.log('🧪 Testing API key with Gemini...\n');

try {
  const genAI = new GoogleGenerativeAI(trimmedKey);
  
  // Try different models
  const modelsToTry = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  
  let success = false;
  let workingModel = null;
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`   Trying model: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      // Test with a simple prompt
      const result = await model.generateContent('Say "Hello" in one word.');
      const response = await result.response;
      const text = response.text();
      
      console.log(`   ✅ ${modelName} works! Response: "${text.trim()}"`);
      workingModel = modelName;
      success = true;
      break;
    } catch (error) {
      console.log(`   ❌ ${modelName} failed: ${error.message}`);
      
      // Check for specific error types
      if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
        console.log('\n❌ API key is invalid or expired!');
        console.log('\n📝 Steps to fix:');
        console.log('1. Get a NEW API key from: https://makersuite.google.com/app/apikey');
        console.log('2. Make sure to get it from AI Studio (not Google Cloud Console)');
        console.log('3. Copy the COMPLETE key (starts with AIza...)');
        console.log('4. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
        console.log('5. Restart server completely\n');
        process.exit(1);
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        console.log(`   ⚠️  Model ${modelName} not available with this API key`);
        continue;
      } else {
        console.log(`   ⚠️  Error: ${error.message}`);
        continue;
      }
    }
  }
  
  if (success) {
    console.log(`\n✅ SUCCESS! Your API key is valid and working with model: ${workingModel}`);
    console.log('   You can now use AI features in the application.\n');
    process.exit(0);
  } else {
    console.log('\n❌ All models failed. Your API key may be invalid or expired.');
    console.log('\n📝 Steps to fix:');
    console.log('1. Get a NEW API key from: https://makersuite.google.com/app/apikey');
    console.log('2. Make sure to get it from AI Studio (not Google Cloud Console)');
    console.log('3. Copy the COMPLETE key (starts with AIza...)');
    console.log('4. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
    console.log('5. Restart server completely\n');
    process.exit(1);
  }
} catch (error) {
  console.log('\n❌ Error testing API key:', error.message);
  console.log('\n📝 Steps to fix:');
  console.log('1. Get a NEW API key from: https://makersuite.google.com/app/apikey');
  console.log('2. Make sure to get it from AI Studio (not Google Cloud Console)');
  console.log('3. Copy the COMPLETE key (starts with AIza...)');
  console.log('4. Replace in Server/.env: GEMINI_API_KEY=your_new_key');
  console.log('5. Restart server completely\n');
  process.exit(1);
}

