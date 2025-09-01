const ApiClient = require('../backend/src/utils/apiClient');

class AuthTestSuite {
  constructor() {
    this.api = new ApiClient();
    this.testUsers = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  // Helper method to log test results
  logResult(testName, passed, details = '') {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${testName}${details ? ` - ${details}` : ''}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${testName}${details ? ` - ${details}` : ''}`);
    }
  }

  // Helper method to create test user
  async createTestUser(email, role = 'teacher') {
    try {
      const userData = {
        email: email,
        password: 'test123',
        firstName: 'Test',
        lastName: role === 'teacher' ? 'Teacher' : 'Student',
        role: role
      };
      
      const response = await this.api.register(userData);
      this.testUsers.push({ email, role, token: response.token });
      return response;
    } catch (error) {
      // If user already exists, try to login
      try {
        const response = await this.api.login({ email, password: 'test123' });
        this.testUsers.push({ email, role, token: response.token });
        return response;
      } catch (loginError) {
        throw new Error(`Failed to create/login user ${email}: ${loginError.message}`);
      }
    }
  }

  // Helper method to cleanup test users
  async cleanupTestUsers() {
    console.log('\n🧹 Cleaning up test users...');
    for (const user of this.testUsers) {
      try {
        // Note: In a real app, you might want to delete test users
        // For now, we'll just log them
        console.log(`  - Test user: ${user.email} (${user.role})`);
      } catch (error) {
        console.log(`  - Failed to cleanup ${user.email}: ${error.message}`);
      }
    }
  }

  // Test 1: Health check without authentication
  async testHealthCheck() {
    console.log('\n🔍 Test 1: Health Check (No Auth Required)');
    
    try {
      const health = await this.api.healthCheck();
      this.logResult('Health check', health.status === 'ok' || health.status === 'OK', `Status: ${health.status}`);
    } catch (error) {
      this.logResult('Health check', false, error.message);
    }
  }

  // Test 2: Registration flow
  async testRegistration() {
    console.log('\n🔍 Test 2: User Registration');
    
    // Test valid registration
    try {
      const response = await this.createTestUser('auth-test-teacher@example.com', 'teacher');
      this.logResult('Valid teacher registration', 
        response.user.role === 'teacher' && response.token, 
        `User: ${response.user.firstName} ${response.user.lastName}`);
    } catch (error) {
      this.logResult('Valid teacher registration', false, error.message);
    }

    // Test student registration
    try {
      const response = await this.createTestUser('auth-test-student@example.com', 'student');
      this.logResult('Valid student registration', 
        response.user.role === 'student' && response.token, 
        `User: ${response.user.firstName} ${response.user.lastName}`);
    } catch (error) {
      this.logResult('Valid student registration', false, error.message);
    }

    // Test duplicate registration
    try {
      await this.api.register({
        email: 'auth-test-teacher@example.com',
        password: 'test123',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'teacher'
      });
      this.logResult('Duplicate registration', false, 'Should have failed');
    } catch (error) {
      this.logResult('Duplicate registration', 
        error.message.includes('already exists'), 
        'Correctly blocked duplicate email');
    }

    // Test invalid email
    try {
      await this.api.register({
        email: 'invalid-email',
        password: 'test123',
        firstName: 'Invalid',
        lastName: 'Email',
        role: 'teacher'
      });
      this.logResult('Invalid email registration', false, 'Should have failed');
    } catch (error) {
      this.logResult('Invalid email registration', 
        error.message.includes('email') || error.message.includes('400'), 
        'Correctly blocked invalid email');
    }
  }

  // Test 3: Login flow
  async testLogin() {
    console.log('\n🔍 Test 3: User Login');
    
    // Test valid login
    try {
      const response = await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'test123'
      });
      this.logResult('Valid login', 
        response.token && response.user.email === 'auth-test-teacher@example.com', 
        `User: ${response.user.firstName} ${response.user.lastName}`);
    } catch (error) {
      this.logResult('Valid login', false, error.message);
    }

    // Test invalid password
    try {
      await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'wrongpassword'
      });
      this.logResult('Invalid password login', false, 'Should have failed');
    } catch (error) {
      this.logResult('Invalid password login', 
        error.message.includes('password') || error.message.includes('incorrect'), 
        'Correctly blocked wrong password');
    }

    // Test non-existent user
    try {
      await this.api.login({
        email: 'nonexistent@example.com',
        password: 'test123'
      });
      this.logResult('Non-existent user login', false, 'Should have failed');
    } catch (error) {
      this.logResult('Non-existent user login', 
        error.message.includes('email') || error.message.includes('incorrect'), 
        'Correctly blocked non-existent user');
    }
  }

  // Test 4: Authentication required endpoints
  async testProtectedEndpoints() {
    console.log('\n🔍 Test 4: Protected Endpoints (Auth Required)');
    
    // Clear any existing authentication
    this.api.setToken(null);
    
    // Test without authentication
    const endpoints = [
      { name: 'Get Profile', method: () => this.api.getProfile() },
      { name: 'Get Classes', method: () => this.api.getClasses() },
      { name: 'Get Assignments', method: () => this.api.getAssignments() },
      { name: 'Get Events', method: () => this.api.getEvents() }
    ];

    for (const endpoint of endpoints) {
      try {
        await endpoint.method();
        this.logResult(`${endpoint.name} (no auth)`, false, 'Should have failed');
      } catch (error) {
        this.logResult(`${endpoint.name} (no auth)`, 
          error.message.includes('authentication') || error.message.includes('token'), 
          'Correctly blocked unauthenticated access');
      }
    }

    // Test with authentication
    try {
      await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'test123'
      });

      for (const endpoint of endpoints) {
        try {
          await endpoint.method();
          this.logResult(`${endpoint.name} (with auth)`, true, 'Access granted');
        } catch (error) {
          this.logResult(`${endpoint.name} (with auth)`, false, error.message);
        }
      }
    } catch (error) {
      this.logResult('Login for protected endpoint test', false, error.message);
    }
  }

  // Test 5: Role-based access control
  async testRoleBasedAccess() {
    console.log('\n🔍 Test 5: Role-Based Access Control');
    
    // Test teacher access to class creation
    try {
      await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'test123'
      });

      const classData = {
        name: 'Test Class for Auth',
        description: 'Testing role-based access',
        iconName: 'book-open',
        iconColor: 'bg-blue-500'
      };

      const response = await this.api.createClass(classData);
      this.logResult('Teacher class creation', 
        response.class.name === classData.name, 
        `Created: ${response.class.name}`);

      // Clean up the test class
      await this.api.deleteClass(response.class.id);
      this.logResult('Teacher class deletion', true, 'Cleanup successful');

    } catch (error) {
      this.logResult('Teacher class creation', false, error.message);
    }

    // Test student access to class creation (should fail)
    try {
      await this.api.login({
        email: 'auth-test-student@example.com',
        password: 'test123'
      });

      const classData = {
        name: 'Test Class by Student',
        description: 'This should fail',
        iconName: 'book-open',
        iconColor: 'bg-red-500'
      };

      await this.api.createClass(classData);
      this.logResult('Student class creation', false, 'Should have failed');
    } catch (error) {
      this.logResult('Student class creation', 
        error.message.includes('403') || error.message.includes('teacher'), 
        'Correctly blocked student from creating class');
    }
  }

  // Test 6: Token validation
  async testTokenValidation() {
    console.log('\n🔍 Test 6: Token Validation');
    
    // Test with valid token
    try {
      await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'test123'
      });

      const profile = await this.api.getProfile();
      this.logResult('Valid token access', 
        profile.user.email === 'auth-test-teacher@example.com', 
        `User: ${profile.user.firstName} ${profile.user.lastName}`);
    } catch (error) {
      this.logResult('Valid token access', false, error.message);
    }

    // Test with invalid token
    try {
      this.api.setToken('invalid-token');
      await this.api.getProfile();
      this.logResult('Invalid token access', false, 'Should have failed');
    } catch (error) {
      this.logResult('Invalid token access', 
        error.message.includes('401') || error.message.includes('invalid'), 
        'Correctly blocked invalid token');
    }

    // Test with expired token (simulated by clearing token)
    try {
      this.api.setToken(null);
      await this.api.getProfile();
      this.logResult('No token access', false, 'Should have failed');
    } catch (error) {
      this.logResult('No token access', 
        error.message.includes('authentication') || error.message.includes('token'), 
        'Correctly blocked missing token');
    }
  }

  // Test 7: Logout functionality
  async testLogout() {
    console.log('\n🔍 Test 7: Logout Functionality');
    
    try {
      // Login first
      await this.api.login({
        email: 'auth-test-teacher@example.com',
        password: 'test123'
      });

      // Verify we're authenticated
      const profile = await this.api.getProfile();
      this.logResult('Pre-logout authentication', 
        profile.user.email === 'auth-test-teacher@example.com', 
        'User authenticated');

      // Logout
      this.api.logout();

      // Try to access protected endpoint
      try {
        await this.api.getProfile();
        this.logResult('Post-logout access', false, 'Should have failed');
      } catch (error) {
        this.logResult('Post-logout access', 
          error.message.includes('authentication') || error.message.includes('token'), 
          'Correctly blocked after logout');
      }
    } catch (error) {
      this.logResult('Logout test', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🔐 Starting Authorization Test Suite...\n');
    
    await this.testHealthCheck();
    await this.testRegistration();
    await this.testLogin();
    await this.testProtectedEndpoints();
    await this.testRoleBasedAccess();
    await this.testTokenValidation();
    await this.testLogout();
    
    await this.cleanupTestUsers();
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Total: ${this.testResults.total}`);
    console.log(`📊 Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All authorization tests passed!');
    } else {
      console.log(`\n⚠️  ${this.testResults.failed} test(s) failed. Please review the errors above.`);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new AuthTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = AuthTestSuite; 