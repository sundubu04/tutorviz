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
- **Database**: PostgreSQL (Docker containerized)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, express-rate-limit
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **Docker** and **Docker Compose**
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TutoriAI
```

### 2. One-Time Setup (Automatic)
```bash
# Run the setup script (handles everything automatically)
./setup.sh
```

This script will:
- ✅ Check Docker and Docker Compose availability
- ✅ Start PostgreSQL database container
- ✅ Create the database (`tutoriai_db`)
- ✅ Set up environment configuration
- ✅ Install all dependencies
- ✅ Initialize database tables
- ✅ Provide clear next steps

### 3. Start the Application
```bash
# Start both backend and frontend servers
./start.sh
```

This script will:
- ✅ Start the backend server (port 5001)
- ✅ Start the frontend server (port 3000)
- ✅ Show you the URLs and credentials
- ✅ Handle graceful shutdown with Ctrl+C

### 4. Access the Application

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001

## 🐳 Docker-Based Backend Setup

### Quick Docker Setup
```bash
# Start PostgreSQL database
docker-compose up -d postgres

# Wait for database to be ready (5-10 seconds)
sleep 5

# Set up backend environment
cd backend
cp env.example .env

# Install dependencies
npm install

# Initialize database
npm run setup

# Start backend server
npm run dev
```

### Docker Services

The project includes Docker Compose configuration for easy database setup:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:14
    container_name: tutoriai-postgres
    environment:
      POSTGRES_DB: tutoriai_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 5. Manual Setup (Alternative)

If you prefer manual setup or need to troubleshoot:

#### Backend Setup with Docker
```bash
# Navigate to project root
cd TutoriAI

# Start PostgreSQL database
docker-compose up -d postgres

# Wait for database to be ready
sleep 5

# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
```

Edit the `.env` file with your configuration:
```env
PORT=5001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tutoriai_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

```bash
# Initialize database and sample data
npm run setup

# Start the backend server
npm run dev
```

#### Frontend Setup
```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Start the frontend development server
npm start
```

## 🗄 Database Management

### Docker Database Commands
```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# View database logs
docker-compose logs postgres

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d postgres
```

### Database Reset
```bash
# Reset database and recreate tables
cd backend
npm run reset
```

## 🛠 Available Scripts

### Setup Scripts
- **`./setup.sh`** - Complete one-time setup (Docker database, dependencies, configuration)
- **`./start.sh`** - Start both backend and frontend servers

### Backend Scripts
- **`npm run dev`** - Start backend development server
- **`npm run setup`** - Initialize database and sample data
- **`npm run reset`** - Reset database and recreate tables
- **`npm test`** - Run backend tests
- **`npm run test:all`** - Run all backend tests

### Docker Scripts
- **`docker-compose up -d postgres`** - Start PostgreSQL database
- **`docker-compose stop postgres`** - Stop PostgreSQL database
- **`docker-compose logs postgres`** - View database logs

## 🔧 Development

### Quick Development Start
```bash
# Start database and both servers for development
docker-compose up -d postgres
./start.sh
```

### Backend Development

```bash
cd backend

# Start development server with auto-reload
npm run dev

# Run database migrations
npm run migrate

# Test API endpoints
npm run test:api

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

**Base URL**: `http://localhost:5001/api`

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

The application uses PostgreSQL (containerized) with the following main tables:

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
npm run test:api
```

### Frontend Tests
```bash
npm test
```

## 📦 Deployment

### Backend Deployment
1. Set up PostgreSQL database (or use Docker)
2. Configure environment variables
3. Run database migrations
4. Start the server with `npm start`

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy the `build` folder to your web server

## 🐳 Docker Production

For production deployment, you can use the provided Docker configurations:

```bash
# Production database
docker-compose -f docker-compose.prod.yml up -d

# Development environment
docker-compose -f docker-compose.dev.yml up -d
```

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
