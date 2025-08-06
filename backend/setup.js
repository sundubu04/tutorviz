const { initializeDatabase } = require('./src/config/database');
const bcrypt = require('bcryptjs');

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up TutoriAI Database...');
    
    // Initialize database tables and sample data
    await initializeDatabase();
    
    console.log('✅ Database setup completed successfully!');
    console.log('\n📋 Database Status:');
    console.log('- Database tables created successfully');
    console.log('- No sample data inserted (clean slate)');
    console.log('- Ready for user registration and class creation');
    
    console.log('\n🔗 API Endpoints:');
    console.log('- Health Check: http://localhost:5001/api/health');
    console.log('- API Base: http://localhost:5001/api');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Test the API with the sample credentials above');
    console.log('3. Connect your frontend to the backend API');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 