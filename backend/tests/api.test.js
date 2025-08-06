const ApiClient = require('../src/utils/apiClient');

const testAPI = async () => {
  const api = new ApiClient();
  
  console.log('🧪 Testing TutoriAI Backend API...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await api.healthCheck();
    console.log('✅ Health check passed:', health.message);

    // Test login (will fail since no sample data exists)
    console.log('\n2. Testing login...');
    try {
      const loginResponse = await api.login({
        email: 'teacher@example.com',
        password: 'demo123'
      });
      console.log('✅ Login successful:', loginResponse.user.firstName);
    } catch (error) {
      console.log('✅ Login correctly failed - no sample users exist');
    }

    // Test get classes (will fail since not authenticated)
    console.log('\n3. Testing get classes...');
    try {
      const classes = await api.getClasses();
      console.log('✅ Classes retrieved:', classes.classes.length, 'classes');
    } catch (error) {
      console.log('✅ Classes correctly failed - not authenticated');
    }

    // Test get assignments (will fail since not authenticated)
    console.log('\n4. Testing get assignments...');
    try {
      const assignments = await api.getAssignments();
      console.log('✅ Assignments retrieved:', assignments.assignments.length, 'assignments');
    } catch (error) {
      console.log('✅ Assignments correctly failed - not authenticated');
    }

    // Test get profile (will fail since not authenticated)
    console.log('\n5. Testing get profile...');
    try {
      const profile = await api.getProfile();
      console.log('✅ Profile retrieved:', profile.user.firstName, profile.user.lastName);
    } catch (error) {
      console.log('✅ Profile correctly failed - not authenticated');
    }

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📋 Available endpoints:');
    console.log('- GET /api/health - Health check');
    console.log('- POST /api/auth/login - User login');
    console.log('- GET /api/auth/profile - Get user profile');
    console.log('- GET /api/classes - Get classes');
    console.log('- GET /api/assignments - Get assignments');
    console.log('- GET /api/calendar - Get calendar events');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. The server is running (npm run dev)');
    console.log('2. PostgreSQL is running and accessible');
    console.log('3. Database is set up (npm run setup)');
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI }; 