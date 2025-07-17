const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Running TutoriAI Backend Tests...\n');

// Test files to run
const testFiles = [
    'user.test.js',
    'whiteboard.test.js'
];

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

async function runTestFile(testFile) {
    return new Promise((resolve) => {
        console.log(`📋 Running ${testFile}...`);
        
        const testPath = path.join(__dirname, testFile);
        const child = exec(`npx jest ${testPath} --verbose`, (error, stdout, stderr) => {
            if (error) {
                console.log(`❌ ${testFile} failed:`);
                console.log(stdout);
                if (stderr) console.log(stderr);
                failedTests++;
            } else {
                console.log(`✅ ${testFile} passed:`);
                console.log(stdout);
                passedTests++;
            }
            
            // Extract test count from output
            const match = stdout.match(/(\d+) tests?/);
            if (match) {
                totalTests += parseInt(match[1]);
            }
            
            resolve();
        });
        
        child.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        
        child.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
    });
}

async function runAllTests() {
    console.log('🚀 Starting test suite...\n');
    
    for (const testFile of testFiles) {
        await runTestFile(testFile);
        console.log(''); // Add spacing between tests
    }
    
    // Summary
    console.log('📊 Test Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    
    if (failedTests > 0) {
        console.log('\n❌ Some tests failed. Please check the output above.');
        process.exit(1);
    } else {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n⏹️  Test run interrupted by user');
    process.exit(1);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Test run terminated');
    process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
    console.error('💥 Test runner error:', error);
    process.exit(1);
}); 