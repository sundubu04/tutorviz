const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: []
};

// Helper function to run a test file
async function runTestFile(filePath) {
  const fileName = path.basename(filePath, '.js');
  console.log(`\n🚀 Running ${fileName}...`);
  console.log('='.repeat(50));
  
  try {
    // Import and run the test
    const testModule = require(filePath);
    
    if (typeof testModule === 'function') {
      // For class-based tests
      const testInstance = new testModule();
      await testInstance.runAllTests();
    } else if (typeof testModule === 'object' && testModule.runAllTests) {
      // For class-based tests with runAllTests method
      await testModule.runAllTests();
    } else {
      // For simple test files
      console.log('✅ Test completed');
    }
    
    testResults.suites.push({ name: fileName, status: 'passed' });
    testResults.passed++;
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    testResults.suites.push({ name: fileName, status: 'failed', error: error.message });
    testResults.failed++;
  }
  
  testResults.total++;
}

// Main function to run all tests
async function runAllTests() {
  console.log('🧪 TutoriAI Test Suite Runner');
  console.log('='.repeat(50));
  
  // Get all test files
  const testFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.test.js'))
    .sort(); // Sort for consistent order
  
  console.log(`📁 Found ${testFiles.length} test file(s):`);
  testFiles.forEach(file => console.log(`  - ${file}`));
  
  // Run each test file
  for (const file of testFiles) {
    await runTestFile(path.join(__dirname, file));
  }
  
  // Print final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Test Suite Results:');
  testResults.suites.forEach(suite => {
    const status = suite.status === 'passed' ? '✅' : '❌';
    console.log(`  ${status} ${suite.name}`);
    if (suite.error) {
      console.log(`     Error: ${suite.error}`);
    }
  });
  
  if (testResults.failed === 0) {
    console.log('\n🎉 All test suites passed!');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${testResults.failed} test suite(s) failed.`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runTestFile }; 