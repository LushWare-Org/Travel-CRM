/**
 * Diagnose Gemini API Key Issues
 * This script thoroughly tests the API key and provides detailed diagnostics
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

console.log('\n🔍 Gemini API Key Diagnostic Tool\n');
console.log('='.repeat(60));

if (!apiKey || apiKey.trim() === '') {
  console.log('\n❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

const trimmedKey = apiKey.trim();
const keyPreview = `${trimmedKey.substring(0, 15)}...`;
const keyLength = trimmedKey.length;

console.log('\n📋 API Key Information:');
console.log(`   Preview: ${keyPreview}`);
console.log(`   Length: ${keyLength} characters`);
console.log(`   Format: ${trimmedKey.startsWith('AIza') ? '✅ Valid' : '❌ Invalid'}`);
console.log(`   Starts with: ${trimmedKey.substring(0, 4)}`);

if (!trimmedKey.startsWith('AIza')) {
  console.log('\n❌ API key format is incorrect!');
  process.exit(1);
}

console.log('\n🧪 Testing API Key with Gemini SDK...\n');

try {
  const genAI = new GoogleGenerativeAI(trimmedKey);

  // Try to list available models (if SDK supports it)
  console.log('📝 Attempting to test with different models...\n');

  // Extended list of possible model names
  const allModelsToTry = [
    'gemini-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash-exp',
    'models/gemini-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.5-pro',
  ];

  let anySuccess = false;
  const results = [];

  for (const modelName of allModelsToTry) {
    const cleanName = modelName.replace(/^models\//, '');
    try {
      console.log(`   Testing: ${cleanName}...`);

      const model = genAI.getGenerativeModel({ model: cleanName });
      const result = await model.generateContent('Say "Hello"');
      const response = await result.response;
      const text = await response.text();

      console.log(`   ✅ ${cleanName} WORKS! Response: "${text.trim()}"`);
      results.push({ model: cleanName, status: '✅ WORKS', response: text.trim() });
      anySuccess = true;
      break; // Stop on first success
    } catch (error) {
      const errorMsg = error.message || '';
      let status = '❌ Failed';

      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        status = '❌ 404 Not Found';
      } else if (errorMsg.includes('401') || errorMsg.includes('403') || errorMsg.includes('API key')) {
        status = '❌ Auth Error';
        console.log(`   ${status}: ${cleanName}`);
        console.log('\n❌ API key authentication failed!');
        console.log('   The API key is invalid or expired.');
        console.log('\n📝 Solution:');
        console.log('   1. Get a NEW key from: https://makersuite.google.com/app/apikey');
        console.log('   2. Make sure you\'re logged into the correct Google account');
        console.log('   3. Copy the complete key');
        console.log('   4. Update Server/.env: GEMINI_API_KEY=your_new_key');
        console.log('   5. Restart server\n');
        process.exit(1);
      } else if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        status = '⚠️  Quota/Rate Limit';
      } else {
        status = `❌ Error: ${errorMsg.substring(0, 40)}...`;
      }

      results.push({ model: cleanName, status });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📊 Test Results Summary:\n');

  results.forEach((r) => {
    console.log(`   ${r.status.padEnd(20)} ${r.model}`);
  });

  if (anySuccess) {
    const workingModel = results.find((r) => r.status.includes('✅'));
    console.log(`\n✅ SUCCESS! Your API key works with: ${workingModel.model}`);
    console.log('   You can use this model in your application.\n');
    process.exit(0);
  } else {
    console.log('\n❌ All models failed. Possible issues:');
    console.log('\n   1. API key doesn\'t have access to Gemini models');
    console.log('   2. API key was created from Google Cloud Console (not AI Studio)');
    console.log('   3. Generative AI API is not enabled for this key');
    console.log('   4. Regional restrictions or API availability');
    console.log('\n📝 Solutions to try:');
    console.log('\n   Option A: Get a NEW key from AI Studio');
    console.log('   1. Go to: https://makersuite.google.com/app/apikey');
    console.log('   2. Make sure you\'re logged into the correct Google account');
    console.log('   3. Delete any existing keys');
    console.log('   4. Create a NEW API key');
    console.log('   5. Copy the complete key');
    console.log('   6. Update Server/.env: GEMINI_API_KEY=your_new_key');
    console.log('   7. Restart server completely');
    console.log('\n   Option B: Enable API in Google Cloud Console');
    console.log('   1. Go to: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
    console.log('   2. Select your project');
    console.log('   3. Click "Enable"');
    console.log('   4. Wait a few minutes');
    console.log('   5. Try again');
    console.log('\n   Option C: Check API key restrictions');
    console.log('   1. Go to: https://console.cloud.google.com/apis/credentials');
    console.log('   2. Find your API key');
    console.log('   3. Check "API restrictions" - should allow "Generative Language API"');
    console.log('   4. Check "Application restrictions" - should not be too restrictive\n');
    process.exit(1);
  }
} catch (error) {
  console.log('\n❌ Error during testing:', error.message);
  console.log('\n📝 Please check:');
  console.log('   1. API key is correct');
  console.log('   2. Internet connection');
  console.log('   3. Try getting a new key from: https://makersuite.google.com/app/apikey\n');
  process.exit(1);
}
