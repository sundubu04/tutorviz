// Jest setup file for test environment

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'tutoriai_test_db';
process.env.JWT_SECRET = 'test_secret_key';
process.env.PORT = 3002;

// Global test utilities
global.testUtils = {
  // Generate test data
  createTestUser: () => ({
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  }),
  
  createTestWhiteboard: () => ({
    title: `Test Whiteboard ${Date.now()}`,
    description: 'Test description',
    isPublic: false,
    ownerId: 1
  }),
  
  // Wait utility
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Clean database utility
  cleanDatabase: async (pool) => {
    try {
      await pool.query('DELETE FROM whiteboard_collaborators');
      await pool.query('DELETE FROM whiteboards');
      await pool.query('DELETE FROM users WHERE id > 1');
    } catch (error) {
      console.error('Error cleaning database:', error);
    }
  }
};

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

// Global test timeout
jest.setTimeout(10000); 