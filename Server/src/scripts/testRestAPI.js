/**
 * Test Gemini REST API Directly
 * This script tests the REST API approach without SDK
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY;

console.log('\n🧪 Testing Gemini REST API Directly\n');
console.log('='.repeat(60));

if (!apiKey || apiKey.trim() === '') {
  console.log('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

const trimmedKey = apiKey.trim();
console.log(`API Key: ${trimmedKey.substring(0, 15)}...\n`);

// Test with direct REST API calls
const apiVersions = ['v1', 'v1beta'];
const modelsToTry = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];

for (const version of apiVersions) {
  console.log(`\n📡 Testing API Version: ${version}\n`);

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${trimmedKey}`;

      console.log(`   Testing: ${model}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "Hello" in one word.',
            }],
          }],
        }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.log(`   ❌ ${model}: ${response.status} - ${responseText.substring(0, 100)}`);
        continue;
      }

      const data = JSON.parse(responseText);

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const { text } = data.candidates[0].content.parts[0];
        console.log(`   ✅ ${model} WORKS! Response: "${text.trim()}"`);
        console.log(`\n✅ SUCCESS! Use ${version}/${model} in your application.\n`);
        process.exit(0);
      } else {
        console.log(`   ⚠️  ${model}: Unexpected response format`);
        console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}`);
      }
    } catch (error) {
      console.log(`   ❌ ${model}: Error - ${error.message.substring(0, 80)}`);
    }
  }
}

console.log('\n❌ All API versions and models failed.');
console.log('Your API key does not have access to Gemini models.\n');
process.exit(1);
