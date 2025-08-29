-- TutoriAI Database Initialization Script
-- This script runs when the PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist
-- Note: This will be created by the environment variable POSTGRES_DB

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100) DEFAULT 'book',
    icon_color VARCHAR(7) DEFAULT '#3B82F6',
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class enrollments table
CREATE TABLE IF NOT EXISTS class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, student_id)
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    due_date TIMESTAMP,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    topic VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    file_path VARCHAR(500),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grade DECIMAL(5,2),
    feedback TEXT
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    event_type VARCHAR(50) DEFAULT 'general',
    is_all_day BOOLEAN DEFAULT false,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table for TaskMaker functionality
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'general',
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    estimated_time INTEGER DEFAULT 30, -- in minutes
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_class_id ON calendar_events(class_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tasks_class_id ON tasks(class_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty_level ON tasks(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data if tables are empty
DO $$
BEGIN
    -- Only insert sample data if no users exist
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        -- Insert sample teacher
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ('teacher@tutoriai.com', '$2a$10$rQZ9K8mN2pL1qR3sT5uV7w', 'John', 'Doe', 'teacher', true);
        
        -- Insert sample student
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ('student@tutoriai.com', '$2a$10$rQZ9K8mN2pL1qR3sT5uV7w', 'Jane', 'Smith', 'student', true);
        
        -- Get the teacher ID
        DECLARE
            teacher_id UUID;
            student_id UUID;
            class_id UUID;
        BEGIN
            SELECT id INTO teacher_id FROM users WHERE email = 'teacher@tutoriai.com';
            SELECT id INTO student_id FROM users WHERE email = 'student@tutoriai.com';
            
            -- Insert sample class
            INSERT INTO classes (name, description, teacher_id)
            VALUES ('Introduction to Computer Science', 'Learn the basics of programming and computer science', teacher_id)
            RETURNING id INTO class_id;
            
            -- Enroll student in class
            INSERT INTO class_enrollments (class_id, student_id)
            VALUES (class_id, student_id);
            
            -- Insert sample assignment
            INSERT INTO assignments (title, description, class_id, due_date, priority, topic)
            VALUES ('First Programming Assignment', 'Create a simple Hello World program', class_id, NOW() + INTERVAL '7 days', 'normal', 'Programming Basics');
            
            -- Insert sample calendar event
            INSERT INTO calendar_events (title, description, start_time, end_time, event_type, class_id, created_by)
            VALUES ('Class Introduction', 'First day of class introduction', NOW(), NOW() + INTERVAL '1 hour', 'class', class_id, teacher_id);
            
            -- Insert sample task
            INSERT INTO tasks (title, description, content, task_type, difficulty_level, estimated_time, class_id, created_by, tags)
            VALUES (
                'Hello World Program',
                'Create your first Python program that prints "Hello, World!"',
                'Write a Python program that prints "Hello, World!" to the console. Make sure to include proper comments and follow Python naming conventions.',
                'programming',
                'beginner',
                15,
                class_id,
                teacher_id,
                ARRAY['python', 'beginner', 'hello-world']
            );
        END;
        
        RAISE NOTICE 'Sample data inserted successfully';
        RAISE NOTICE 'Sample Teacher: teacher@tutoriai.com (password: password123)';
        RAISE NOTICE 'Sample Student: student@tutoriai.com (password: password123)';
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
