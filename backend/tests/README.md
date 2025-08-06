# TutoriAI Backend Tests

This directory contains comprehensive test suites for the TutoriAI backend API.

## 📁 Test Structure

```
tests/
├── README.md           # This file
├── run-all.js          # Test runner for all test suites
├── auth.test.js        # Authorization and authentication tests
├── api.test.js         # General API functionality tests
└── calendar.test.js    # Calendar event management tests
```

## 🚀 Running Tests

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
# Authorization tests
npm run test:auth

# General API tests
npm run test:api

# Calendar tests
npm run test:calendar
```

### Run Tests Directly
```bash
# Run specific test file
node tests/auth.test.js
node tests/api.test.js
node tests/calendar.test.js

# Run test runner
node tests/run-all.js
```

## 🧪 Test Suites

### 1. Authorization Tests (`auth.test.js`)
Comprehensive authentication and authorization testing:

- **Health Check**: Verify API is running
- **User Registration**: Test valid/invalid registration flows
- **User Login**: Test login with valid/invalid credentials
- **Protected Endpoints**: Verify authentication requirements
- **Role-Based Access**: Test teacher vs student permissions
- **Token Validation**: Test token handling and expiration
- **Logout Functionality**: Verify logout behavior

**Test Coverage:**
- ✅ Registration validation
- ✅ Login authentication
- ✅ Token management
- ✅ Role-based access control
- ✅ Protected endpoint security
- ✅ Error handling

### 2. API Tests (`api.test.js`)
General API functionality and endpoint testing:

- **Health Check**: Basic API availability
- **Authentication**: Login/logout flows
- **Data Retrieval**: Classes, assignments, profile
- **Error Handling**: Invalid requests and responses

### 3. Calendar Tests (`calendar.test.js`)
Calendar event management testing:

- **Event Creation**: Test creating events with/without auth
- **Event Validation**: Test field validation and constraints
- **Authentication**: Verify auth requirements for events
- **Error Handling**: Test various error scenarios
- **Self-Contained**: Creates its own test user for authentication

## 📊 Test Results

Tests provide detailed output including:
- ✅ Pass/fail status for each test
- 📈 Success rate percentage
- 🔍 Detailed error messages
- 📋 Summary of all test suites

## 🛠️ Adding New Tests

### Creating a New Test Suite

1. Create a new file: `tests/your-feature.test.js`
2. Follow the naming convention: `*.test.js`
3. Export a class with a `runAllTests()` method:

```javascript
class YourFeatureTestSuite {
  constructor() {
    this.api = new ApiClient();
    this.testResults = { passed: 0, failed: 0, total: 0 };
  }

  logResult(testName, passed, details = '') {
    // Log test results
  }

  async runAllTests() {
    // Run your tests
    console.log('📊 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
  }
}

module.exports = YourFeatureTestSuite;
```

### Test Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests
3. **Descriptive Names**: Use clear test names
4. **Error Handling**: Test both success and failure cases
5. **Validation**: Verify expected outcomes

## 🔧 Test Configuration

### Prerequisites
- Backend server running (`npm run dev`)
- Database set up (`npm run setup`)
- PostgreSQL running

### Environment
Tests use the same environment as the main application:
- Database: PostgreSQL
- API: `http://localhost:5001/api`
- Authentication: JWT tokens

## 🐛 Debugging Tests

### Common Issues
1. **Server not running**: Start with `npm run dev`
2. **Database not set up**: Run `npm run setup`
3. **Port conflicts**: Check if port 5001 is available
4. **Authentication errors**: Verify JWT_SECRET is set

### Debug Mode
Add console.log statements to test files for debugging:
```javascript
console.log('Debug info:', someVariable);
```

## 📈 Test Metrics

The test runner provides:
- Total test count
- Pass/fail ratios
- Success rates
- Detailed error reporting
- Suite-level summaries

## 🤝 Contributing

When adding new features:
1. Write corresponding tests
2. Ensure all tests pass
3. Update this README if needed
4. Follow existing test patterns 