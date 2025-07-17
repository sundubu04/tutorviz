# TutoriAI

A modern collaborative whiteboard application with a beautiful dashboard interface and real-time collaboration features.

## Features

### Dashboard
- **Modern UI**: Clean, responsive dashboard with sidebar navigation
- **Meeting Management**: Schedule and manage meetings with RSVP functionality
- **Calendar Integration**: View upcoming events and meetings
- **Insights**: Analytics and progress tracking
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Whiteboard
- **Miro-like Interface**: Professional whiteboard editor with toolbar
- **Multiple Tools**: Select, text, sticky notes, shapes, connectors, and pen tools
- **Real-time Collaboration**: Share whiteboards with team members
- **Content Persistence**: Save and load whiteboard content automatically
- **Zoom Controls**: Pan and zoom functionality
- **Sidebar**: Project brief, brainstorm ideas, and action items

### Backend API
- **Node.js & Express**: RESTful API with proper error handling
- **PostgreSQL Database**: Reliable data storage with relationships
- **User Authentication**: JWT-based authentication system
- **CRUD Operations**: Full whiteboard management
- **Collaboration**: Share and manage whiteboard access
- **Comprehensive Testing**: Unit and integration tests

## Architecture

```
TutoriAI/
├── frontend/                 # Frontend application
│   ├── index.html           # Main dashboard
│   ├── whiteboard.html      # Standalone whiteboard page
│   ├── styles.css           # Main styles
│   ├── script.js            # Dashboard functionality
│   └── features/
│       └── whiteboard/      # Whiteboard feature
│           ├── whiteboard.html
│           ├── whiteboard.css
│           ├── whiteboard.js
│           └── README.md
├── backend/                  # Backend API
│   ├── server.js            # Express server
│   ├── package.json         # Dependencies
│   ├── config/
│   │   └── database.js      # PostgreSQL configuration
│   ├── controllers/         # Business logic
│   ├── routes/              # API routes
│   ├── scripts/             # Database setup
│   ├── tests/               # Test suite
│   └── README.md
└── start.sh                 # Quick start script
```

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Python 3 (for frontend server)

### Option 1: Automated Setup
```bash
# Make the startup script executable
chmod +x start.sh

# Run the startup script
./start.sh
```

### Option 2: Manual Setup

#### 1. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your database credentials

# Create PostgreSQL database
createdb tutoriai_db

# Initialize database
npm run init-db

# Run tests
npm test

# Start development server
npm run dev
```

#### 2. Frontend Setup
```bash
cd frontend

# Start frontend server (Python 3)
python3 -m http.server 3000
```

#### 3. Access the Application
- **Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Whiteboard**: http://localhost:3000/whiteboard/[id]

## Usage

### Dashboard Navigation
1. **Home**: View greeting and quick actions
2. **Meetings**: Manage upcoming meetings and RSVPs
3. **Calendar**: View and navigate calendar events
4. **Whiteboards**: Access your whiteboard collection
5. **Insights**: View analytics and progress

### Whiteboard Features
1. **Create Whiteboard**: Click "Create New Whiteboard" button
2. **Open Whiteboard**: Click "Open" on any whiteboard card
3. **Edit Content**: Use toolbar tools to add elements
4. **Save Automatically**: Content saves every 30 seconds
5. **Share**: Use share button to collaborate with others

### Available Tools
- **Select**: Move and select elements
- **Text**: Add text elements
- **Sticky Notes**: Create colored sticky notes
- **Shapes**: Add geometric shapes
- **Connectors**: Draw connecting lines
- **Pen**: Freehand drawing

## API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile

### Whiteboards
- `GET /api/whiteboards` - List user's whiteboards
- `GET /api/whiteboards/:id` - Get specific whiteboard
- `POST /api/whiteboards` - Create new whiteboard
- `PUT /api/whiteboards/:id` - Update whiteboard
- `DELETE /api/whiteboards/:id` - Delete whiteboard
- `PATCH /api/whiteboards/:id/content` - Update content
- `POST /api/whiteboards/:id/share` - Share whiteboard

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- whiteboard.test.js

# Run with coverage
npm test -- --coverage

# Run test suite with custom runner
npm run test:run
```

### Test Coverage
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Workflow Tests**: Complete user journey testing
- **Error Handling**: Edge cases and error scenarios

## Development

### Adding New Features
1. **Backend**: Add controllers, routes, and tests
2. **Frontend**: Update HTML, CSS, and JavaScript
3. **Database**: Create migration scripts if needed
4. **Testing**: Add comprehensive tests

### Code Structure
- **Modular Design**: Features organized in separate directories
- **Separation of Concerns**: Frontend and backend clearly separated
- **RESTful API**: Clean, predictable API endpoints
- **Error Handling**: Consistent error responses

## Deployment

### Production Setup
1. **Environment Variables**: Configure production settings
2. **Database**: Set up production PostgreSQL instance
3. **Reverse Proxy**: Configure nginx for frontend serving
4. **Process Management**: Use PM2 for Node.js processes
5. **SSL**: Configure HTTPS certificates

### Docker Support
```dockerfile
# Example Dockerfile for backend
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the documentation in each directory
- Review the test files for usage examples
- Open an issue on GitHub

---

**TutoriAI** - Empowering collaboration through intelligent whiteboarding

