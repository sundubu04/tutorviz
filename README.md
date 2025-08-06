# TutoriAI - Classroom Management System

A comprehensive web-based classroom management system designed to streamline educational workflows for teachers and enhance learning experiences for students. The application provides an integrated platform for managing students, scheduling, collaborative whiteboarding, and task creation/management.

## 🚀 Features

### Core Functionalities
- **Student Manager**: Centralized student information and progress tracking
- **Calendar System**: Comprehensive scheduling and event management
- **Task Maker**: Comprehensive assignment and task creation system
- **User Authentication**: JWT-based authentication with role-based access control

### User Roles
- **Teachers**: Full access to all features, can create/manage classes and assignments
- **Students**: View assigned tasks, submit assignments, access enrolled classes
- **Administrators**: User management and system configuration

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TutoriAI
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
```

Edit the `.env` file with your configuration:
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

```bash
# Set up PostgreSQL database
createdb tutoriai_db

# Initialize database and sample data
npm run setup

# Start the backend server
npm run dev
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (root of project)
cd ..

# Install dependencies
npm install

# Start the frontend development server
npm start
```

### 4. Verify Installation

The application should now be running at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

Test the API:
```bash
cd backend
npm run test-api
```

## 📊 Sample Data

The setup script creates sample data for testing:

### Users
- **Teacher**: teacher@example.com (password: demo123)
- **Student 1**: student1@example.com (password: demo123)
- **Student 2**: student2@example.com (password: demo123)

### Sample Classes
- Java Programming
- Operating Systems
- Python Development
- C++ Programming
- Database Systems
- Web Development

## 🔧 Development

### Backend Development

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Run database migrations
npm run migrate

# Test API endpoints
npm run test-api

# Run tests
npm test
```

### Frontend Development

```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Class Management
- `GET /api/classes` - Get all classes for current user
- `POST /api/classes` - Create new class (teachers)
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Assignment System
- `GET /api/assignments` - Get all assignments
- `POST /api/assignments` - Create new assignment (teachers)
- `POST /api/assignments/:id/submit` - Submit assignment (students)
- `PUT /api/assignments/:id/grade/:submissionId` - Grade assignment (teachers)

### Calendar & Events
- `GET /api/calendar` - Get calendar events
- `POST /api/calendar` - Create new event
- `PUT /api/calendar/:id` - Update event



## 🗄 Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: User accounts and profiles
- **classes**: Class information and enrollments
- **assignments**: Task definitions and submissions
- **calendar_events**: Events and scheduling data

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- Security headers with helmet
- CORS configuration
- SQL injection prevention

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test-api
```

### Frontend Tests
```bash
npm test
```

## 📦 Deployment

### Backend Deployment
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Start the server with `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `build` folder to your web server

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License

## 🆘 Support

For support and questions:
- Check the documentation in the `backend/README.md` and `PROJECT_SPECIFICATION.md`
- Review the API documentation
- Test the sample endpoints with the provided credentials

## 🎯 Roadmap

- [ ] Mobile application
- [ ] Advanced analytics and reporting
- [ ] Third-party LMS integration
- [ ] AI-powered grading assistance
- [ ] Parent portal integration
