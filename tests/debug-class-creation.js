const ApiClient = require('../backend/src/utils/apiClient');

async function debugClassCreation() {
  const api = new ApiClient();
  
  console.log('🔍 Debug: Testing class creation flow...');
  
  try {
    // Step 1: Login as teacher
    console.log('\n📝 Step 1: Login as teacher');
    const loginResponse = await api.login({
      email: 'auth-test-teacher@example.com',
      password: 'test123'
    });
    console.log('✅ Login successful, token received:', !!loginResponse.token);
    console.log('User role:', loginResponse.user?.role);
    
    // Step 2: Try to create a class
    console.log('\n📝 Step 2: Create class');
    const classData = {
      name: 'Debug Test Class',
      description: 'Testing class creation for debug',
      iconName: 'book-open',
      iconColor: 'bg-blue-500'
    };
    
    console.log('Class data to send:', classData);
    console.log('Token being used:', api.getToken()?.substring(0, 20) + '...');
    
    try {
      const createResponse = await api.createClass(classData);
      console.log('✅ Class creation successful:', createResponse);
    } catch (createError) {
      console.log('❌ Class creation failed, making direct HTTP request for more details...');
      
      // Make a direct fetch request to get more details
      const directResponse = await fetch('http://localhost:5001/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`
        },
        body: JSON.stringify(classData)
      });
      
      console.log('Direct HTTP Response Status:', directResponse.status);
      console.log('Direct HTTP Response Headers:', Object.fromEntries(directResponse.headers.entries()));
      
      const responseText = await directResponse.text();
      console.log('Direct HTTP Response Body:', responseText);
      
      if (responseText) {
        try {
          const responseJson = JSON.parse(responseText);
          console.log('Parsed JSON response:', responseJson);
        } catch (parseError) {
          console.log('Could not parse response as JSON');
        }
      }
      
      throw createError;
    }
    
    // Step 3: Clean up - delete the class
    if (createResponse.class?.id) {
      console.log('\n📝 Step 3: Clean up - delete test class');
      await api.deleteClass(createResponse.class.id);
      console.log('✅ Class deleted successfully');
    }
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    
    // Check if it's a network error
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

if (require.main === module) {
  debugClassCreation().catch(console.error);
}

module.exports = { debugClassCreation };