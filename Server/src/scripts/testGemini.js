/**
 * Test Gemini AI Connection
 * Run with: node src/scripts/testGemini.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('Testing Gemini AI connection...\n');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // First, try to list available models
    console.log('Fetching available models...\n');
    try {
      // Try v1 API endpoint
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Available models:');
        if (data.models) {
          data.models.forEach((model) => {
            console.log(`  - ${model.name}`);
          });
        }
        console.log('');
      }
    } catch (listError) {
      console.log('Could not list models, trying direct test...\n');
    }

    // Try different models with different API versions
    const modelsToTry = [
      { name: 'gemini-pro', apiVersion: 'v1' },
      { name: 'models/gemini-pro', apiVersion: 'v1' },
      { name: 'gemini-1.5-flash', apiVersion: 'v1' },
      { name: 'models/gemini-1.5-flash', apiVersion: 'v1' },
    ];

    for (const { name, apiVersion } of modelsToTry) {
      try {
        console.log(`Testing model: ${name} (${apiVersion})...`);
        const model = genAI.getGenerativeModel({
          model: name,
          // Try without specifying API version first
        });

        const result = await model.generateContent('Say hello in one word');
        const response = await result.response;
        const text = response.text();

        console.log(`✅ ${name} works! Response: ${text}\n`);
        console.log(`✅ Use model: ${name} in your service\n`);
        process.exit(0);
      } catch (error) {
        console.log(`❌ ${name} failed: ${error.message.substring(0, 100)}...\n`);
      }
    }

    console.error('❌ All models failed.');
    console.error('\n💡 Possible solutions:');
    console.error('1. Check if your API key is valid');
    console.error('2. Verify API key has access to Gemini models');
    console.error('3. Try using a different API key from: https://makersuite.google.com/app/apikey');
    console.error('4. Check if you need to enable the Gemini API in Google Cloud Console');
    process.exit(1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testGemini();
