const { Pool } = require('pg');
require('dotenv').config();

// Database connection configuration
// Support both DATABASE_URL (Docker) and individual DB_* variables (local)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for Docker deployment
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
} else {
  // Use individual DB_* variables for local development
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tutoriai_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'your_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

// Database initialization with table creation
const initializeDatabase = async () => {
  try {
    console.log('📊 Initializing TutoriAI Database...');
    
    // Test connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to database');
    }

    // Create tables
    await createTables();
    
    console.log('✅ Database initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Create database tables
const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Classes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Class enrollments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      )
    `);

    // Assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        due_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Assignment submissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        file_path VARCHAR(500),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        grade DECIMAL(5,2),
        feedback TEXT
      )
    `);

    // Calendar events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table for TaskMaker functionality
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        task_type VARCHAR(50) NOT NULL DEFAULT 'general',
        difficulty_level VARCHAR(20) DEFAULT 'medium',
        estimated_time INTEGER DEFAULT 30,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        tags TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created successfully');
  } finally {
    client.release();
  }
};

// Insert sample data
const insertSampleData = async () => {
  const client = await pool.connect();
  
  try {
    // Check if sample data already exists
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('📝 Sample data already exists, skipping...');
      return;
    }

    // Insert sample teacher
    const teacherResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['teacher@tutoriai.com', '$2a$10$rQZ9K8mN2pL1qR3sT5uV7w', 'John', 'Doe', 'teacher']);

    const teacherId = teacherResult.rows[0].id;

    // Insert sample student
    const studentResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, ['student@tutoriai.com', '$2a$10$rQZ9K8mN2pL1qR3sT5uV7w', 'Jane', 'Smith', 'student']);

    const studentId = studentResult.rows[0].id;

    // Insert sample class
    const classResult = await client.query(`
      INSERT INTO classes (name, description, teacher_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['Introduction to Computer Science', 'Learn the basics of programming and computer science', teacherId]);

    const classId = classResult.rows[0].id;

    // Enroll student in class
    await client.query(`
      INSERT INTO class_enrollments (class_id, student_id)
      VALUES ($1, $2)
    `, [classId, studentId]);

    // Insert sample assignment
    await client.query(`
      INSERT INTO assignments (title, description, class_id, due_date)
      VALUES ($1, $2, $3, $4)
    `, ['First Programming Assignment', 'Create a simple Hello World program', classId, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);

    // Insert sample calendar event
    await client.query(`
      INSERT INTO calendar_events (title, description, start_time, end_time, class_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['Class Introduction', 'First day of class introduction', new Date(), new Date(Date.now() + 60 * 60 * 1000), classId, teacherId]);

    // Insert sample task
    await client.query(`
      INSERT INTO tasks (title, description, content, task_type, difficulty_level, estimated_time, class_id, created_by, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      'Hello World Program',
      'Create your first Python program that prints "Hello, World!"',
      'Write a Python program that prints "Hello, World!" to the console. Make sure to include proper comments and follow Python naming conventions.',
      'programming',
      'beginner',
      15,
      classId,
      teacherId,
      ['python', 'beginner', 'hello-world']
    ]);

    console.log('✅ Sample data inserted successfully');
    console.log('👨‍🏫 Sample Teacher: teacher@tutoriai.com (password: password123)');
    console.log('👨‍🎓 Sample Student: student@tutoriai.com (password: password123)');
  } finally {
    client.release();
  }
};

module.exports = { 
  pool, 
  initializeDatabase, 
  createTables, 
  insertSampleData, 
  testConnection 
}; 