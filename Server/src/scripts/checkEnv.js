/**
 * Check .env file for GEMINI_API_KEY configuration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');

console.log('\n🔍 Checking .env File for GEMINI_API_KEY\n');
console.log('='.repeat(60));

// Read .env file directly
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  console.log('\n📋 .env File Analysis:\n');

  let foundGeminiKey = false;
  let geminiLine = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for GEMINI_API_KEY
    if (line.toUpperCase().includes('GEMINI')) {
      foundGeminiKey = true;
      geminiLine = { lineNumber: i + 1, content: line };

      console.log(`✅ Found GEMINI_API_KEY on line ${i + 1}:`);
      console.log(`   ${line.substring(0, 50)}${line.length > 50 ? '...' : ''}`);

      // Check for common issues
      const issues = [];

      if (line.includes(' ')) {
        issues.push('❌ Contains spaces');
      }
      if (line.startsWith('"') || line.startsWith("'") || line.startsWith('`')) {
        issues.push('❌ Starts with quotes');
      }
      if (line.endsWith('"') || line.endsWith("'") || line.endsWith('`')) {
        issues.push('❌ Ends with quotes');
      }
      if (!line.includes('=')) {
        issues.push('❌ Missing equals sign (=)');
      }

      // Extract the key value
      const match = line.match(/GEMINI_API_KEY\s*=\s*(.+)/i);
      if (match) {
        let keyValue = match[1].trim();

        // Remove quotes if present
        if ((keyValue.startsWith('"') && keyValue.endsWith('"'))
            || (keyValue.startsWith("'") && keyValue.endsWith("'"))) {
          keyValue = keyValue.slice(1, -1);
          issues.push('⚠️  Key wrapped in quotes (will be removed automatically)');
        }

        console.log('\n   Key Value Analysis:');
        console.log(`   - Length: ${keyValue.length} characters`);
        console.log(`   - Starts with: ${keyValue.substring(0, 10)}...`);
        console.log(`   - Format: ${keyValue.startsWith('AIza') ? '✅ Valid format' : '❌ Invalid format (should start with AIza)'}`);

        if (keyValue.length < 35) {
          issues.push('⚠️  Key seems too short (usually 39+ characters)');
        }
        if (keyValue.length > 50) {
          issues.push('⚠️  Key seems too long (usually 39 characters)');
        }

        if (issues.length > 0) {
          console.log('\n   ⚠️  Issues found:');
          issues.forEach((issue) => console.log(`   ${issue}`));
        } else {
          console.log('\n   ✅ No issues found with key format');
        }
      }

      break;
    }
  }

  if (!foundGeminiKey) {
    console.log('❌ GEMINI_API_KEY not found in .env file');
    console.log('\n📝 To add it:');
    console.log('   1. Open Server/.env');
    console.log('   2. Add: GEMINI_API_KEY=your_key_here');
    console.log('   3. No spaces, no quotes');
    console.log('   4. Restart server\n');
  }

  // Now check what Node.js actually reads
  dotenv.config({ path: envPath });
  const loadedKey = process.env.GEMINI_API_KEY;

  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📦 What Node.js Actually Reads:\n');

  if (loadedKey) {
    console.log('✅ GEMINI_API_KEY is loaded');
    console.log(`   Length: ${loadedKey.length} characters`);
    console.log(`   Preview: ${loadedKey.substring(0, 15)}...`);
    console.log(`   Format: ${loadedKey.startsWith('AIza') ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Has spaces: ${loadedKey.includes(' ') ? '❌ Yes' : '✅ No'}`);
    console.log(`   Trimmed length: ${loadedKey.trim().length} characters`);
  } else {
    console.log('❌ GEMINI_API_KEY is NOT loaded by Node.js');
    console.log('   This means the .env file format is incorrect or the key is missing.\n');
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('\n💡 Common .env File Mistakes:\n');
  console.log('   ❌ GEMINI_API_KEY = "AIza..."  (has spaces and quotes)');
  console.log('   ❌ GEMINI_API_KEY="AIza..."   (has quotes)');
  console.log('   ❌ GEMINI_API_KEY = AIza...    (has spaces)');
  console.log('   ✅ GEMINI_API_KEY=AIza...      (correct format)\n');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('❌ .env file not found at:', envPath);
    console.log('   Make sure the file exists in the Server directory\n');
  } else {
    console.log('❌ Error reading .env file:', error.message);
  }
}
