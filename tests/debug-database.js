// Test with different connection configs
const { Pool } = require('pg');

// Test the Docker PostgreSQL connection directly
const dockerPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tutoriai',
  user: 'tutoriai_user',
  password: 'tutoriai_password'
});

const { pool } = require('../backend/src/config/database');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  // First test direct Docker connection
  console.log('\n📝 Testing DIRECT Docker PostgreSQL connection...');
  try {
    const result = await dockerPool.query('SELECT NOW() as current_time');
    console.log('✅ Direct Docker connection successful');
    console.log('Current time from DB:', result.rows[0].current_time);
  } catch (error) {
    console.error('❌ Direct Docker connection failed:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
  }
  
  // Then test the app's connection
  console.log('\n📝 Testing APP database connection...');
  try {
    // Test basic connectivity
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('Current time from DB:', result.rows[0].current_time);
    
    // Test if users table exists and has data
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log('✅ Users table accessible, count:', usersResult.rows[0].count);
    
    // Test if classes table exists
    const classesResult = await pool.query('SELECT COUNT(*) FROM classes');
    console.log('✅ Classes table accessible, count:', classesResult.rows[0].count);
    
    // Check if our test teacher user exists
    const teacherResult = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['auth-test-teacher@example.com']
    );
    
    if (teacherResult.rows.length > 0) {
      console.log('✅ Test teacher user found:', teacherResult.rows[0]);
      
      // Try to create a class directly in database
      const testUserId = teacherResult.rows[0].id;
      console.log('🔍 Attempting to create class with teacher ID:', testUserId);
      
      const createResult = await pool.query(
        `INSERT INTO classes (name, description, icon_name, icon_color, teacher_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, icon_name, icon_color, created_at`,
        ['Direct DB Test Class', 'Test from database', 'book-open', 'bg-blue-500', testUserId]
      );
      
      console.log('✅ Class created directly in database:', createResult.rows[0]);
      
      // Clean up - delete the test class
      await pool.query('DELETE FROM classes WHERE id = $1', [createResult.rows[0].id]);
      console.log('✅ Test class cleaned up');
      
    } else {
      console.log('❌ Test teacher user not found');
    }
    
  } catch (error) {
    console.error('❌ Database error:');
    console.error('Name:', error.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
  }
}

if (require.main === module) {
  testDatabaseConnection().then(() => process.exit(0)).catch(console.error);
}

module.exports = { testDatabaseConnection };