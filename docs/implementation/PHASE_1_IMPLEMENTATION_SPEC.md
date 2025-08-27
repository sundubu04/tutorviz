# Phase 1 Implementation Specification
## Core Infrastructure and Basic Task Maker System

### Overview
Phase 1 focuses on establishing the foundational infrastructure and implementing the core functionality needed to create, compile, and display LaTeX-based tasks. This phase will deliver a working prototype that demonstrates the basic concept of AI-generated task creation.

### Phase 1 Goals
- Set up the complete development environment
- Implement basic OpenAI API integration
- Create a simple LaTeX compilation service
- Build a basic chat interface for AI communication
- Establish the core task management system
- Deliver a minimal viable product (MVP) for task creation

### Technical Stack

#### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Build Tool**: Vite
- **Package Manager**: npm

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **LaTeX Compilation**: Docker containers with TeX Live
- **Authentication**: JWT-based system

#### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Development Environment**: Local development with hot reloading
- **API Documentation**: OpenAPI/Swagger

### Implementation Details

#### 1. Project Setup and Architecture

##### 1.1 Backend Infrastructure
```bash
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Database connection and configuration
│   │   ├── openai.js            # OpenAI API configuration
│   │   └── latex.js             # LaTeX compilation configuration
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication middleware
│   │   ├── validation.js        # Request validation middleware
│   │   └── errorHandler.js      # Global error handling
│   ├── routes/
│   │   ├── tasks.js             # Task CRUD operations
│   │   ├── openai.js            # OpenAI API endpoints
│   │   ├── latex.js             # LaTeX compilation endpoints
│   │   └── auth.js              # Authentication endpoints
│   ├── services/
│   │   ├── openaiService.js     # OpenAI API integration
│   │   ├── latexService.js      # LaTeX compilation service
│   │   └── taskService.js       # Task management logic
│   ├── models/
│   │   └── task.js              # Task data model and validation
│   └── utils/
│       ├── logger.js             # Logging utility
│       └── helpers.js            # Common helper functions
├── Dockerfile                    # LaTeX compilation container
├── docker-compose.yml            # Development environment setup
└── package.json                  # Dependencies and scripts
```

##### 1.2 Frontend Infrastructure
```bash
src/
├── components/
│   ├── TaskMaker/
│   │   ├── ChatSidebar.tsx      # Basic chat interface
│   │   ├── TaskEditor.tsx       # Simple task display
│   │   ├── LaTeXViewer.tsx      # LaTeX code display
│   │   └── TaskToolbar.tsx      # Basic editing controls
│   ├── common/
│   │   ├── Button.tsx           # Reusable button component
│   │   ├── Input.tsx            # Reusable input component
│   │   └── Loading.tsx          # Loading state component
│   └── layout/
│       ├── Header.tsx           # Application header
│       └── Layout.tsx           # Main layout wrapper
├── contexts/
│   ├── AuthContext.tsx          # Authentication state management
│   └── TaskContext.tsx          # Task state management
├── services/
│   ├── api.ts                   # API client functions
│   ├── openai.ts                # OpenAI service integration
│   └── latex.ts                 # LaTeX compilation service
├── types/
│   ├── task.ts                  # Task-related type definitions
│   ├── openai.ts                # OpenAI API types
│   └── common.ts                # Common type definitions
└── utils/
    ├── constants.ts              # Application constants
    └── helpers.ts                # Utility functions
```

#### 2. Core Features Implementation

##### 2.1 OpenAI Integration
**Requirements:**
- Secure API key management
- Basic conversation with GPT-4
- Task generation prompts
- Response parsing and validation

**Implementation:**
```typescript
// OpenAI service interface
interface OpenAIService {
  generateTask(prompt: string, context?: TaskContext): Promise<TaskGenerationResponse>;
  refineTask(taskId: string, feedback: string): Promise<TaskRefinementResponse>;
  getConversationHistory(userId: string): Promise<Message[]>;
}

// Task generation response
interface TaskGenerationResponse {
  success: boolean;
  task: Task;
  latex: string;
  message: string;
  error?: string;
}
```

**API Endpoints:**
```javascript
POST /api/openai/generate-task
POST /api/openai/refine-task
GET /api/openai/conversation/:userId
```

##### 2.2 LaTeX Compilation Service
**Requirements:**
- Docker-based LaTeX compilation
- Error handling and reporting
- Multiple output formats (PDF, HTML)
- Caching for performance

**Implementation:**
```javascript
// LaTeX service interface
class LaTeXService {
  async compile(latexCode: string, options: CompileOptions): Promise<CompileResult>;
  async validate(latexCode: string): Promise<ValidationResult>;
  async renderPreview(latexCode: string): Promise<string>;
}

// Compile options
interface CompileOptions {
  format: 'pdf' | 'html' | 'png';
  template?: string;
  packages?: string[];
}
```

**API Endpoints:**
```javascript
POST /api/latex/compile
POST /api/latex/validate
POST /api/latex/preview
```

##### 2.3 Basic Chat Interface
**Requirements:**
- Real-time chat with AI agent
- Message history persistence
- Basic prompt templates
- Loading states and error handling

**Components:**
```typescript
// Chat sidebar component
interface ChatSidebarProps {
  onTaskGenerated: (task: Task) => void;
  onTaskRefined: (task: Task) => void;
}

// Message interface
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}
```

**Features:**
- Simple text input for user messages
- Message history display
- Quick action buttons for common tasks
- Loading indicators during AI processing

##### 2.4 Task Management System
**Requirements:**
- Basic CRUD operations for tasks
- Task versioning
- Metadata storage
- Search and filtering

**Database Operations:**
```sql
-- Core task operations
INSERT INTO tasks (title, description, latex_content, created_by) VALUES (...);
SELECT * FROM tasks WHERE created_by = $1 ORDER BY created_at DESC;
UPDATE tasks SET latex_content = $1, version = version + 1 WHERE id = $1;
DELETE FROM tasks WHERE id = $1 AND created_by = $1;

-- Task versioning
INSERT INTO task_versions (task_id, version_number, latex_content, created_by) VALUES (...);
SELECT * FROM task_versions WHERE task_id = $1 ORDER BY version_number DESC;
```

**API Endpoints:**
```javascript
GET /api/tasks                    # List user's tasks
POST /api/tasks                   # Create new task
GET /api/tasks/:id                # Get specific task
PUT /api/tasks/:id                # Update task
DELETE /api/tasks/:id             # Delete task
GET /api/tasks/:id/versions       # Get task version history
```

#### 3. User Interface Implementation

##### 3.1 Layout Structure
**Three-panel layout with optional LaTeX sidebar:**
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Logo, Navigation, User Menu)                       │
├─────────────────┬─────────────────────┬─────────────────────┤
│                 │                     │                     │
│ LaTeX Viewer    │   Task Editor       │   Chat Sidebar      │
│ (Optional)      │   (Dynamic width)   │   (20% width)       │
│ (Toggleable)    │                     │                     │
│                 │                     │                     │
│ • LaTeX Code    │ • Task Display      │ • Chat Input        │
│ • Syntax High   │ • Basic Controls    │ • Message List      │
│ • Error Display │ • Preview Area      │ • Quick Actions     │
│ • Toggle Button │ • Rich Text Edit    │ • AI Agent Chat     │
└─────────────────┴─────────────────────┴─────────────────────┘
```

**Layout Behavior:**
- **LaTeX Viewer (Left)**: Optional sidebar that can be toggled open/closed
  - Default state: Closed (collapsed)
  - Width when open: 25% of screen width
  - Contains toggle button to show/hide
  - When closed, Task Editor expands to use full available width
  
- **Task Editor (Center)**: Main content area with dynamic width
  - Width: 75% when LaTeX sidebar is closed
  - Width: 50% when LaTeX sidebar is open
  - Always maintains minimum usable width for content editing
  
- **Chat Sidebar (Right)**: Fixed width sidebar for AI communication
  - Width: Fixed 20% of screen width
  - Always visible and accessible
  - Contains chat interface and quick action buttons

##### 3.2 Component Specifications

**ChatSidebar.tsx:**
- Chat input field with send button
- Message history with scrollable list
- Quick action buttons (Generate Math Quiz, Create Essay, etc.)
- Loading states and error messages

**TaskEditor.tsx:**
- Task title and description display
- Compiled LaTeX preview area
- Basic editing controls (edit title, description)
- Save/update functionality

**LaTeXViewer.tsx:**
- Syntax-highlighted LaTeX code display
- Copy to clipboard functionality
- Error highlighting and messages
- Basic code editing capabilities

**TaskToolbar.tsx:**
- Save button
- Preview button
- Export options (PDF, HTML)
- Version history access

#### 4. Database Implementation

##### 4.1 Initial Schema Setup
```sql
-- Create the core tables as defined in the main specification
-- Focus on essential fields for MVP

-- Simplified tasks table for Phase 1
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latex_content TEXT NOT NULL,
  compiled_content TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'draft'
);

-- Basic task versions table
CREATE TABLE task_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  latex_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, version_number)
);

-- Simple conversation history
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

##### 4.2 Data Seeding
- Sample LaTeX templates for common task types
- Initial user accounts for testing
- Example tasks demonstrating the system

#### 5. Development Workflow

##### 5.1 Setup Instructions
```bash
# Backend setup
cd backend
npm install
cp env.example .env
# Configure environment variables
npm run dev

# Frontend setup
cd ../src
npm install
npm run dev

# Database setup
docker-compose up -d postgres
npm run db:migrate
npm run db:seed
```

##### 5.2 Environment Variables
```bash
# Backend .env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/taskmaker
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
LATEX_COMPILER_URL=http://localhost:3002

# Frontend .env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_OPENAI_ENABLED=true
```

##### 5.3 Development Scripts
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "db:migrate": "node scripts/migrate.js",
    "db:seed": "node scripts/seed.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

#### 6. Testing Strategy

##### 6.1 Unit Tests
- OpenAI service integration tests
- LaTeX compilation service tests
- Task management logic tests
- API endpoint tests

##### 6.2 Integration Tests
- End-to-end task creation workflow
- LaTeX compilation pipeline
- Database operations
- API authentication

##### 6.3 Manual Testing Checklist
- [ ] User can create an account and log in
- [ ] User can start a conversation with AI agent
- [ ] AI can generate a basic task with LaTeX
- [ ] LaTeX code compiles successfully
- [ ] Task can be saved and retrieved
- [ ] Basic editing functionality works
- [ ] Error handling displays user-friendly messages

#### 7. Success Criteria

##### 7.1 Functional Requirements
- ✅ User authentication system works
- ✅ OpenAI API integration is functional
- ✅ LaTeX compilation service operates correctly
- ✅ Basic task CRUD operations work
- ✅ Chat interface allows AI communication
- ✅ Tasks can be created and displayed

##### 7.2 Performance Requirements
- ✅ API response times < 2 seconds
- ✅ LaTeX compilation < 5 seconds
- ✅ Page load times < 3 seconds
- ✅ Concurrent user support (5+ users)

##### 7.3 Quality Requirements
- ✅ Error handling is comprehensive
- ✅ User interface is intuitive
- ✅ Code follows project standards
- ✅ Documentation is complete
- ✅ Tests pass with >80% coverage

#### 8. Deliverables

##### 8.1 Code Deliverables
- Complete backend API implementation
- Functional frontend application
- Database schema and migrations
- Docker configuration files
- API documentation

##### 8.2 Documentation Deliverables
- Setup and installation guide
- API endpoint documentation
- User manual for basic features
- Development guidelines
- Testing documentation

##### 8.3 Deployment Deliverables
- Docker images for all services
- Environment configuration files
- Deployment scripts
- Monitoring and logging setup

### Timeline
**Estimated Duration: 4-6 weeks**

- **Week 1-2**: Project setup, basic infrastructure, database schema
- **Week 3-4**: OpenAI integration, LaTeX compilation service
- **Week 5-6**: Frontend implementation, testing, documentation

### Risk Mitigation

##### Technical Risks
- **OpenAI API limitations**: Implement rate limiting and fallback responses
- **LaTeX compilation failures**: Robust error handling and validation
- **Performance issues**: Implement caching and optimization strategies

##### Development Risks
- **Scope creep**: Strict adherence to Phase 1 requirements
- **Integration challenges**: Early testing of external service connections
- **Timeline delays**: Regular progress reviews and milestone tracking

### Next Phase Preparation
Phase 1 will establish the foundation for:
- Advanced task editing features (Phase 2)
- Real-time synchronization (Phase 3)
- Collaboration tools (Phase 4)

This implementation specification provides a clear roadmap for Phase 1 development while maintaining focus on delivering a working MVP that demonstrates the core concept of AI-generated task creation.
