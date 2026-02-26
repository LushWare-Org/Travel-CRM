/**
 * Direct Gemini API Test - Matching Spring Boot Approach
 * This script tests the exact API call format that Spring Boot uses
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from Server directory
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });
console.log(`Loading .env from: ${envPath}`);

async function testGeminiDirect() {
  console.log('\n🧪 Testing Gemini API - Direct Call (Spring Boot Style)');
  console.log('============================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ GEMINI_API_KEY not found in .env');
    return;
  }

  const trimmedKey = apiKey.trim();
  console.log(`API Key Preview: ${trimmedKey.substring(0, 10)}...`);
  console.log(`Key Length: ${trimmedKey.length} characters\n`);

  // Test different endpoint formats - using current available models
  const testConfigs = [
    {
      name: 'v1 with gemini-2.5-flash',
      url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${trimmedKey}`,
    },
    {
      name: 'v1 with gemini-2.5-pro',
      url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${trimmedKey}`,
    },
    {
      name: 'v1 with gemini-2.0-flash',
      url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${trimmedKey}`,
    },
    {
      name: 'v1beta with gemini-2.5-flash',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${trimmedKey}`,
    },
  ];

  // Test request body - Spring Boot typically uses this format
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: 'Write a short travel description for "7-Day Sri Lanka Adventure"',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 200,
    },
  };

  console.log('📝 Request Body:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log('\n');

  let success = false;

  for (const config of testConfigs) {
    try {
      console.log(`Testing: ${config.name}...`);
      console.log(`URL: ${config.url.replace(trimmedKey, 'AIzaSy...')}\n`);

      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log(`Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Failed: ${errorText.substring(0, 200)}`);
        console.log('\n');
        continue;
      }

      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
      console.log('\n');

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const { text } = data.candidates[0].content.parts[0];
        console.log('Generated Text:');
        console.log(text);
        console.log('\n');
        success = true;
        break;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log('\n');
    }
  }

  if (!success) {
    console.log('❌ All endpoints failed. The API key might not have access, or the endpoint format is incorrect.');
    console.log('\n💡 If this works in Spring Boot, check:');
    console.log('   1. The exact URL format Spring Boot uses');
    console.log('   2. The request body structure');
    console.log('   3. Any additional headers Spring Boot sends');
  } else {
    console.log('✅ Found a working endpoint!');
  }

  console.log('\n============================================================\n');
}

testGeminiDirect().catch(console.error);
