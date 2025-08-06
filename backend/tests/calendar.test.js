const ApiClient = require('../src/utils/apiClient');

const testCalendarEvent = async () => {
  const api = new ApiClient();
  
  console.log('📅 Testing Calendar Event Creation...\n');

  try {
    // Test 1: Try to create event without authentication
    console.log('1. Testing event creation without authentication...');
    try {
      await api.createEvent({
        title: 'Test Event',
        description: 'Test description',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        eventType: 'other',
        isAllDay: false
        // Note: No createdBy field - should fail at authentication first
      });
      console.log('❌ Should have failed - no authentication');
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('Unauthorized')) {
        console.log('✅ Correctly blocked - authentication required');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 2: Create a test user for calendar testing
    console.log('\n2. Creating test user for calendar testing...');
    try {
      const registerResponse = await api.register({
        email: 'calendar-test@example.com',
        password: 'test123',
        firstName: 'Calendar',
        lastName: 'Tester',
        role: 'teacher'
      });
      console.log('✅ Test user created successfully:', registerResponse.user.firstName);
    } catch (error) {
      // If user already exists, try to login
      try {
        const loginResponse = await api.login({
          email: 'calendar-test@example.com',
          password: 'test123'
        });
        console.log('✅ Test user logged in successfully:', loginResponse.user.firstName);
      } catch (loginError) {
        console.log('❌ Failed to create/login test user:', error.message);
        return;
      }
    }

    // Test 3: Try to create event with authentication (no classId)
    console.log('\n3. Testing event creation with authentication (no classId)...');
    try {
      const newEvent = await api.createEvent({
        title: 'Test Calendar Event',
        description: 'Testing calendar event creation',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        eventType: 'other',
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('✅ Event created successfully:', newEvent.event.title);
    } catch (error) {
      console.log('❌ Failed to create event:', error.message);
    }

    // Test 3.5: Try to create event with empty classId (should fail)
    console.log('\n3.5. Testing event creation with empty classId (should fail)...');
    try {
      await api.createEvent({
        title: 'Test Event with Empty ClassId',
        description: 'This should fail due to empty classId',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        eventType: 'other',
        classId: '', // Empty string should cause 400 error
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('❌ Should have failed - empty classId');
    } catch (error) {
      console.log('✅ Correctly blocked - empty classId causes validation error');
    }

    // Test 4: Try to create event with invalid data
    console.log('\n4. Testing event creation with invalid data...');
    try {
      await api.createEvent({
        title: '', // Empty title should fail
        description: 'Test description',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        eventType: 'other',
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('❌ Should have failed - empty title');
    } catch (error) {
      if (error.message.includes('400') || error.message.includes('validation')) {
        console.log('✅ Correctly blocked - validation failed');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 5: Try to create event with invalid event type
    console.log('\n5. Testing event creation with invalid event type...');
    try {
      await api.createEvent({
        title: 'Test Event',
        description: 'Test description',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        eventType: 'invalid_type', // Invalid event type
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('❌ Should have failed - invalid event type');
    } catch (error) {
      if (error.message.includes('400') || error.message.includes('validation')) {
        console.log('✅ Correctly blocked - invalid event type');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 6: Try to create event with invalid class name
    console.log('\n6. Testing event creation with invalid class ID...');
    try {
      await api.createEvent({
        title: 'Test Event with Invalid Class',
        description: 'This should fail due to invalid class ID',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        eventType: 'other',
        classId: 'invalid-uuid-format', // Invalid UUID format
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('❌ Should have failed - invalid class ID');
    } catch (error) {
      if (error.message.includes('400') || error.message.includes('validation')) {
        console.log('✅ Correctly blocked - invalid class ID');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 7: Try to create event with valid class ID
    console.log('\n7. Testing event creation with valid class ID...');
    try {
      const newEventWithClass = await api.createEvent({
        title: 'Test Event with Valid Class',
        description: 'Testing calendar event creation with valid class',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        eventType: 'other',
        classId: '131be04e-5286-498d-b45c-70c0230e6989', // English A: Literature HL
        isAllDay: false,
        createdBy: {
          firstName: 'Calendar',
          lastName: 'Tester'
        }
      });
      console.log('✅ Event with valid class created successfully:', newEventWithClass.event.title);
      console.log('   Class ID:', newEventWithClass.event.classId);
      console.log('   Class Name:', newEventWithClass.event.className);
    } catch (error) {
      console.log('❌ Failed to create event with valid class:', error.message);
    }

    // Test 8: Try to create event with various invalid class formats
    console.log('\n8. Testing event creation with various invalid class formats...');
    const invalidClassIds = [
      'invalid-uuid',
      'not-a-uuid-at-all',
      '12345678-1234-1234-1234-123456789012', // Invalid UUID format
      '00000000-0000-0000-0000-000000000000', // Valid UUID format but likely doesn't exist
      'very-long-string-that-is-not-a-uuid',
      'class@#$%',
      '123456'
    ];

    for (const invalidClassId of invalidClassIds) {
      try {
        await api.createEvent({
          title: `Test Event with Invalid Class: ${invalidClassId}`,
          description: 'Testing with invalid class format',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
          eventType: 'other',
          classId: invalidClassId,
          isAllDay: false,
          createdBy: {
            firstName: 'Calendar',
            lastName: 'Tester'
          }
        });
        console.log(`❌ Should have failed - invalid class: ${invalidClassId}`);
      } catch (error) {
        console.log(`✅ Correctly blocked - invalid class: ${invalidClassId}`);
      }
    }

    // Test 9: Try to create event with valid class IDs from database
    console.log('\n9. Testing event creation with valid class IDs from database...');
    const validClassIds = [
      '131be04e-5286-498d-b45c-70c0230e6989', // English A: Literature HL
      'c38f9c00-d84e-41de-b2b9-4b158c753b42', // Biology SL
      '9d2576c2-bf05-4d6a-9c6f-36843bc181a1', // Mathematics: Analysis and Approaches HL
      'b5786e7e-d6ce-4435-a554-5e09ec405915', // Theory of Knowledge
      '2949468a-9a1b-44e4-9e92-5278eab0c65b', // Creativity, Activity, Service
      '35d01da1-ebad-4144-848b-214b02199079'  // Extended Essay
    ];

    for (const validClassId of validClassIds) {
      try {
        const newEvent = await api.createEvent({
          title: `Test Event with Valid Class ID: ${validClassId}`,
          description: 'Testing with valid class ID from database',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
          eventType: 'other',
          classId: validClassId,
          isAllDay: false,
          createdBy: {
            firstName: 'Calendar',
            lastName: 'Tester'
          }
        });
        console.log(`✅ Successfully created event with class ID: ${validClassId}`);
        console.log(`   Class Name: ${newEvent.event.className}`);
      } catch (error) {
        console.log(`❌ Failed to create event with valid class ID ${validClassId}:`, error.message);
      }
    }

    console.log('\n🎉 Calendar event tests completed!');

  } catch (error) {
    console.error('❌ Calendar test failed:', error.message);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testCalendarEvent();
}

module.exports = { testCalendarEvent }; 