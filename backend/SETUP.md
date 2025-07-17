# TutoriAI Backend Setup Guide

This guide will help you set up the TutoriAI backend with Node.js, Express, and PostgreSQL.

## Prerequisites

Before running the setup, make sure you have the following installed:

### Required Software

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **PostgreSQL** (v12 or higher)
   - **macOS**: `brew install postgresql`
   - **Ubuntu/Debian**: `sudo apt-get install postgresql postgresql-contrib`
   - **Windows**: Download from https://www.postgresql.org/download/windows/
   - **Docker**: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

### PostgreSQL Setup

1. **Start PostgreSQL**:
   - **macOS**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`
   - **Windows**: Start from Services or use pgAdmin

2. **Create a database user** (optional, you can use the default 'postgres' user):
   ```bash
   sudo -u postgres createuser --interactive
   ```

3. **Verify PostgreSQL is running**:
   ```bash
   pg_isready
   ```

## Quick Setup

### Option 1: Automated Setup (Recommended)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Run the setup script**:
   ```bash
   ./setup.sh
   ```
   
   Or using npm:
   ```bash
   npm run setup
   ```

3. **Follow the prompts** to configure your environment variables.

### Option 2: Manual Setup

If you prefer to set up manually or the automated setup fails:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp env.example .env
   ```

3. **Edit .env file** with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tutoriai_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3001
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Initialize the database**:
   ```bash
   npm run init-db
   ```

5. **Run tests** (optional):
   ```bash
   npm test
   ```

## Configuration Options

### Environment Variables

The following environment variables can be configured in the `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | tutoriai_db | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `PORT` | 3001 | Backend server port |
| `NODE_ENV` | development | Environment mode |
| `JWT_SECRET` | tutoriai_jwt_secret_2024 | JWT signing secret |
| `JWT_EXPIRES_IN` | 24h | JWT token expiration |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed CORS origin |

### Database Configuration

The setup will create the following database structure:

- **Users table**: User accounts and authentication
- **Whiteboards table**: Whiteboard data and metadata
- **Whiteboard_shares table**: Sharing and collaboration permissions
- **Whiteboard_elements table**: Individual whiteboard elements (shapes, text, etc.)

## Verification

After setup, verify everything is working:

1. **Start the backend server**:
   ```bash
   npm start
   ```

2. **Test the health endpoint**:
   ```bash
   curl http://localhost:3001/api/health
   ```

3. **Run the test suite**:
   ```bash
   npm test
   ```

## Troubleshooting

### Common Issues

#### PostgreSQL Connection Issues

**Error**: `ECONNREFUSED` or `password authentication failed`

**Solutions**:
1. Make sure PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check your credentials in `.env` file

3. Reset PostgreSQL password:
   ```bash
   sudo -u postgres psql
   ALTER USER postgres PASSWORD 'new_password';
   \q
   ```

#### Port Already in Use

**Error**: `EADDRINUSE`

**Solutions**:
1. Change the port in `.env` file
2. Kill the process using the port:
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

#### Permission Denied

**Error**: `EACCES` when running setup script

**Solutions**:
1. Make the script executable:
   ```bash
   chmod +x setup.sh
   ```

2. Run with proper permissions:
   ```bash
   sudo ./setup.sh
   ```

### Database Issues

#### Database Doesn't Exist

If you get an error about the database not existing:

1. Create the database manually:
   ```bash
   createdb tutoriai_db
   ```

2. Or connect to PostgreSQL and create it:
   ```bash
   psql -U postgres
   CREATE DATABASE tutoriai_db;
   \q
   ```

#### Tables Not Created

If tables are missing after setup:

1. Run the database initialization manually:
   ```bash
   npm run init-db
   ```

2. Check the database connection in `.env`

## Development Workflow

### Starting the Backend

```bash
# Production mode
npm start

# Development mode (with auto-restart)
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- whiteboard.test.js
```

### Database Management

```bash
# Initialize/reset database
npm run init-db

# Connect to database
psql -U postgres -d tutoriai_db
```

## API Documentation

Once the backend is running, you can access:

- **Health Check**: `GET http://localhost:3001/api/health`
- **Whiteboards**: `GET/POST http://localhost:3001/api/whiteboards`
- **Users**: `GET/POST http://localhost:3001/api/users`
- **Authentication**: `POST http://localhost:3001/api/auth/login`

## Next Steps

After successful backend setup:

1. **Start the frontend**:
   ```bash
   cd ../frontend
   python -m http.server 3000
   ```

2. **Open your browser** to `http://localhost:3000`

3. **Test the application** by creating a whiteboard and adding elements

## Support

If you encounter issues not covered in this guide:

1. Check the logs in the terminal
2. Verify all prerequisites are installed
3. Ensure PostgreSQL is running and accessible
4. Check the `.env` file configuration
5. Run the test suite to identify specific issues

For additional help, refer to the main project README or create an issue in the project repository. 