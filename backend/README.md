# TutoriAI Backend

A Node.js backend with Express and PostgreSQL for the TutoriAI whiteboard application.

## Features

- **User Management**: Registration, login, and profile management
- **Whiteboard CRUD**: Create, read, update, and delete whiteboards
- **Real-time Collaboration**: Share whiteboards with other users
- **Content Persistence**: Save and load whiteboard content
- **RESTful API**: Clean API endpoints for frontend integration
- **Database Integration**: PostgreSQL with proper relationships
- **Authentication**: JWT-based authentication system
- **Automated Setup**: Complete database initialization and configuration

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Quick Setup

### Automated Setup (Recommended)

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Run the automated setup script**
   ```bash
   ./setup.sh
   ```
   
   This script will:
   - Check prerequisites (Node.js, npm, PostgreSQL)
   - Create `.env` file from template
   - Prompt for database configuration
   - Install dependencies
   - Create database if it doesn't exist
   - Initialize database tables and sample data
   - Run tests
   - Verify setup

### Manual Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=tutoriai_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3001
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Create PostgreSQL database**
   ```bash
   npm run create-db
   ```
   
   Or manually:
   ```sql
   CREATE DATABASE tutoriai_db;
   ```

5. **Initialize database tables and sample data**
   ```bash
   npm run init-db
   ```

## Database Setup Commands

### Create Database Only
```bash
npm run create-db
```

### Initialize Database Schema and Sample Data
```bash
npm run init-db
```

### Complete Database Setup (Create + Initialize)
```bash
npm run setup:db
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001`

## Troubleshooting

### PostgreSQL Connection Issues

1. **Make sure PostgreSQL is running:**
   ```bash
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   
   # Windows
   # Start PostgreSQL service from Services
   ```

2. **Check PostgreSQL status:**
   ```bash
   pg_isready
   ```

3. **Verify database user exists:**
   ```bash
   psql postgres -c "\du"
   ```

4. **Create postgres user if needed:**
   ```bash
   psql postgres -c "CREATE USER postgres WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD 'postgres';"
   ```

### Common Error Codes

- `ECONNREFUSED`: PostgreSQL is not running
- `28P01`: Authentication failed - check credentials
- `3D000`: Database does not exist - run `npm run create-db`
- `42501`: Permission denied - check user privileges

## API Endpoints

### Authentication

#### POST /api/users/register
Register a new user
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST /api/users/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/users/profile
Get user profile
```
GET /api/users/profile?userId=1
```

#### PUT /api/users/profile
Update user profile
```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "userId": 1
}
```

### Whiteboards

#### GET /api/whiteboards
Get all whiteboards for a user
```
GET /api/whiteboards?userId=1
```

#### GET /api/whiteboards/:id
Get specific whiteboard
```
GET /api/whiteboards/1?userId=1
```

#### POST /api/whiteboards
Create new whiteboard
```json
{
  "title": "My Whiteboard",
  "description": "A new whiteboard",
  "isPublic": false,
  "ownerId": 1
}
```

#### PUT /api/whiteboards/:id
Update whiteboard
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "isPublic": true,
  "userId": 1
}
```

#### DELETE /api/whiteboards/:id
Delete whiteboard
```json
{
  "userId": 1
}
```

#### PATCH /api/whiteboards/:id/content
Update whiteboard content
```json
{
  "content": {
    "elements": [
      {
        "id": "1",
        "type": "sticky",
        "content": "Note content",
        "position": { "x": 100, "y": 100 },
        "color": "yellow"
      }
    ]
  },
  "userId": 1
}
```

#### POST /api/whiteboards/:id/share
Share whiteboard with user
```json
{
  "email": "collaborator@example.com",
  "permissionLevel": "edit",
  "userId": 1
}
```

#### GET /api/whiteboards/:id/collaborators
Get whiteboard collaborators
```
GET /api/whiteboards/1/collaborators
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Whiteboards Table
```sql
CREATE TABLE whiteboards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB DEFAULT '{}',
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Whiteboard Collaborators Table
```sql
CREATE TABLE whiteboard_collaborators (
    id SERIAL PRIMARY KEY,
    whiteboard_id INTEGER REFERENCES whiteboards(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(whiteboard_id, user_id)
);
```

## Testing

Run the test suite:
```bash
npm test
```

Run specific test files:
```bash
npm test -- whiteboard.test.js
npm test -- user.test.js
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── whiteboardController.js  # Whiteboard business logic
│   └── userController.js        # User business logic
├── routes/
│   ├── whiteboards.js       # Whiteboard routes
│   └── users.js             # User routes
├── scripts/
│   └── init-database.js     # Database initialization
├── tests/
│   ├── whiteboard.test.js   # Whiteboard API tests
│   └── user.test.js         # User API tests
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
└── README.md               # This file
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation
- SQL injection prevention with parameterized queries
- CORS configuration

## Development

### Adding New Features

1. Create controller functions in appropriate controller file
2. Add routes in route files
3. Write tests for new functionality
4. Update documentation

### Database Migrations

For schema changes, create new migration scripts in the `scripts/` directory.

## Deployment

1. Set up production environment variables
2. Configure PostgreSQL for production
3. Set up reverse proxy (nginx recommended)
4. Use PM2 or similar for process management
5. Configure SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details 

---

## How to Fix This

### 1. **Unload the Broken Service**
First, try to unload the problematic LaunchAgent:
```sh
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist
```
If you get an error that it doesn't exist, that's okay.

---

### 2. **Remove the LaunchAgent File**
Delete the LaunchAgent file if it exists:
```sh
rm -f ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist
```

---

### 3. **Reinstall the Service**
Try to start the service again:
```sh
brew services start postgresql@14
```

---

### 4. **If It Still Fails, Try Running as Root**
Sometimes, running as root gives more details:
```sh
sudo brew services start postgresql@14
```
If you see a more detailed error, please share it.

---

### 5. **Check for Data Directory Issues**
If the above doesn't work, the data directory may be corrupted or have wrong permissions. Check the directory:
```sh
ls -ld /usr/local/var/postgresql@14 /usr/local/var/postgres
```
If you see permission issues, fix them:
```sh
sudo chown -R $(whoami) /usr/local/var/postgresql@14 /usr/local/var/postgres
```

---

### 6. **Check the Logs**
Check the PostgreSQL log for more details:
```sh
tail -n 50 /usr/local/var/log/postgres.log
```

---

## Summary of Steps

1. Unload the broken LaunchAgent  
2. Remove the LaunchAgent file  
3. Try starting the service again  
4. If it fails, try as root and check for permission issues  
5. Check the logs for more details  

---

Would you like me to run these commands for you, or would you like to try them yourself? If you get any new error messages, please share them here! 