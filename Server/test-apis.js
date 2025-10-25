// API Test Script
// Run this in your browser console or Node.js

const API_BASE = 'http://localhost:5000/api/v1';

async function testPackageAPIs() {
  console.log('🧪 Testing Package APIs...\n');

  const tests = [
    {
      name: 'Get All Packages',
      url: `${API_BASE}/packages`,
      expected: 'packages array'
    },
    {
      name: 'Search Packages',
      url: `${API_BASE}/packages/search?q=beach`,
      expected: 'beach packages'
    },
    {
      name: 'Get by Category',
      url: `${API_BASE}/packages/category/adventure`,
      expected: 'adventure packages'
    },
    {
      name: 'Get Featured',
      url: `${API_BASE}/packages/featured`,
      expected: 'featured packages'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const response = await fetch(test.url);
      const data = await response.json();
      
      if (response.ok && data.status === 'success') {
        console.log(`✅ ${test.name}: SUCCESS`);
        console.log(`   Results: ${data.results || 0} packages`);
        console.log(`   Status: ${response.status} ${response.statusText}\n`);
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Error: ${data.message || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

// Run the tests
testPackageAPIs();
