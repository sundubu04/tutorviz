const ApiClient = require('../backend/src/utils/apiClient');

async function testClassesAuth() {
  console.log('🔍 Testing GET /classes authentication...');
  
  try {
    // Test unauthenticated access
    console.log('\n📝 Step 1: Test unauthenticated access');
    const unauthenticatedApi = new ApiClient();
    unauthenticatedApi.setToken(null); // Ensure no token
    
    try {
      const response = await unauthenticatedApi.getClasses();
      console.log('❌ Unauthenticated access succeeded (SECURITY ISSUE):', response);
    } catch (error) {
      console.log('✅ Unauthenticated access correctly blocked:', error.message);
    }
    
    // Test authenticated access
    console.log('\n📝 Step 2: Test authenticated access');
    const authenticatedApi = new ApiClient();
    
    // Login first
    const loginResponse = await authenticatedApi.login({
      email: 'auth-test-teacher@example.com',
      password: 'test123'
    });
    console.log('✅ Login successful, token set');
    
    try {
      const response = await authenticatedApi.getClasses();
      console.log('✅ Authenticated access successful:', response.classes.length, 'classes returned');
    } catch (error) {
      console.log('❌ Authenticated access failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testClassesAuth().catch(console.error);
}

module.exports = { testClassesAuth };