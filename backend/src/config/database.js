const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tutoriai_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database schema creation
const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        avatar_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Classes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_name VARCHAR(100),
        icon_color VARCHAR(50),
        teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add unique constraint for class names per teacher (if it doesn't exist)
    try {
      await pool.query(`
        ALTER TABLE classes 
        ADD CONSTRAINT unique_class_name_per_teacher 
        UNIQUE (name, teacher_id)
      `);
    } catch (error) {
      // Constraint might already exist, ignore the error
      console.log('Unique constraint check completed');
    }

    // Class enrollments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_enrollments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(class_id, student_id)
      )
    `);

    // Assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
        due_date TIMESTAMP NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        is_urgent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Assignment submissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        submission_text TEXT,
        file_url VARCHAR(500),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        grade DECIMAL(5,2),
        feedback TEXT,
        graded_by UUID REFERENCES users(id),
        graded_at TIMESTAMP
      )
    `);

    // Calendar events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        is_all_day BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update existing calendar_events table to allow NULL created_by if it exists
    try {
      await pool.query(`
        ALTER TABLE calendar_events 
        ALTER COLUMN created_by DROP NOT NULL
      `);
    } catch (error) {
      // Column might already be nullable or table might not exist, ignore the error
      console.log('Calendar events table update check completed');
    }



    // Ensure class_id column exists with proper foreign key
    try {
      // Check if class_id column exists
      const columnCheck = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'class_id'
      `);
      
      if (columnCheck.rows.length === 0) {
        // class_id doesn't exist, add it
        await pool.query(`
          ALTER TABLE calendar_events 
          ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL
        `);
        console.log('Added class_id column with foreign key constraint');
      } else {
        console.log('class_id column already exists');
      }
    } catch (error) {
      console.log('Class column check completed:', error.message);
    }


    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};



// Initialize database
const initializeDatabase = async () => {
  try {
    await createTables();
    // Sample data insertion removed - database will be empty
    console.log('Database initialization completed');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

module.exports = {
  pool,
  initializeDatabase,
  createTables
}; 