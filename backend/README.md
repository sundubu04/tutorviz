# TutoriAI Backend API

A comprehensive Node.js/Express.js backend API for the TutoriAI classroom management system, built with PostgreSQL for data persistence.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user CRUD operations with profile management
- **Class Management**: Create, manage, and enroll students in classes
- **Assignment System**: Create assignments, submit work, and grade submissions
- **Calendar System**: Event management with class-specific scheduling
- **Security**: Input validation, rate limiting, and security headers

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit
- **File Upload**: multer

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. **Clone the repository and navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tutoriai_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb tutoriai_db
   
   # Or using psql
   psql -U postgres
   CREATE DATABASE tutoriai_db;
   ```

5. **Initialize database**:
   ```bash
   npm run migrate
   ```

6. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `GET /api/users/students/enrollable` - Get students for enrollment (teachers)
- `GET /api/users/:id/stats` - Get user statistics

### Classes
- `GET /api/classes` - Get all classes for current user
- `GET /api/classes/:id` - Get class by ID
- `POST /api/classes` - Create new class (teachers)
- `PUT /api/classes/:id` - Update class (teacher who owns it)
- `DELETE /api/classes/:id` - Delete class (teacher who owns it)
- `POST /api/classes/:id/enroll` - Enroll student in class
- `DELETE /api/classes/:id/enroll/:studentId` - Remove student from class

### Assignments
- `GET /api/assignments` - Get all assignments for current user
- `GET /api/assignments/class/:classId` - Get assignments for specific class
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create new assignment (teachers)
- `PUT /api/assignments/:id` - Update assignment (teacher who created it)
- `DELETE /api/assignments/:id` - Delete assignment (teacher who created it)
- `POST /api/assignments/:id/submit` - Submit assignment (students)
- `PUT /api/assignments/:id/grade/:submissionId` - Grade assignment (teachers)

### Calendar
- `GET /api/calendar` - Get all calendar events for current user
- `GET /api/calendar/:id` - Get event by ID
- `POST /api/calendar` - Create new event
- `PUT /api/calendar/:id` - Update event
- `DELETE /api/calendar/:id` - Delete event



## Database Schema

### Users
- `id` (UUID, Primary Key)
- `email` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `role` (VARCHAR: 'student', 'teacher', 'admin')
- `avatar_url` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Classes
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `description` (TEXT)
- `icon_name` (VARCHAR)
- `icon_color` (VARCHAR)
- `teacher_id` (UUID, Foreign Key to users)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Class Enrollments
- `id` (UUID, Primary Key)
- `class_id` (UUID, Foreign Key to classes)
- `student_id` (UUID, Foreign Key to users)
- `enrolled_at` (TIMESTAMP)

### Assignments
- `id` (UUID, Primary Key)
- `title` (VARCHAR)
- `description` (TEXT)
- `class_id` (UUID, Foreign Key to classes)
- `due_date` (TIMESTAMP)
- `created_by` (UUID, Foreign Key to users)
- `is_urgent` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Assignment Submissions
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key to assignments)
- `student_id` (UUID, Foreign Key to users)
- `submission_text` (TEXT)
- `file_url` (VARCHAR)
- `submitted_at` (TIMESTAMP)
- `grade` (DECIMAL)
- `feedback` (TEXT)
- `graded_by` (UUID, Foreign Key to users)
- `graded_at` (TIMESTAMP)

### Calendar Events
- `id` (UUID, Primary Key)
- `title` (VARCHAR)
- `description` (TEXT)
- `start_time` (TIMESTAMP)
- `end_time` (TIMESTAMP)
- `event_type` (VARCHAR)
- `class_id` (UUID, Foreign Key to classes)
- `created_by` (UUID, Foreign Key to users)
- `is_all_day` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)



## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Role-Based Access Control

- **Students**: Can view and submit assignments, access enrolled classes, view calendar events
- **Teachers**: Can create/manage classes, assignments, grade submissions, manage enrollments
- **Admins**: Full access to all features and user management

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Development

### Running Tests
```bash
npm test
```

### Database Migrations
```bash
npm run migrate
```

### Environment Variables
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_EXPIRES_IN`: JWT expiration time
- `CORS_ORIGIN`: Allowed CORS origin

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting
- Security headers with helmet
- CORS configuration
- SQL injection prevention with parameterized queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License 