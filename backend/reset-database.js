const { pool } = require('./src/config/database');

const resetDatabase = async () => {
  try {
    console.log('🗑️  Resetting TutoriAI Database...');
    
    // Drop all tables in the correct order (respecting foreign key constraints)
    await pool.query('DROP TABLE IF EXISTS assignment_submissions CASCADE');
    await pool.query('DROP TABLE IF EXISTS assignments CASCADE');
    await pool.query('DROP TABLE IF EXISTS tasks CASCADE');
    await pool.query('DROP TABLE IF EXISTS calendar_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS class_enrollments CASCADE');
    await pool.query('DROP TABLE IF EXISTS classes CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('✅ Database reset completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run: node setup.js (to recreate tables and sample data)');
    console.log('2. Start the server: npm run dev');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run reset if this file is executed directly
if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase }; 