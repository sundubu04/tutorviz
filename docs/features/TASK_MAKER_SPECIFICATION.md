# Task Maker Specification
## OpenAI-Integrated Auto-Generated Task Creation System

### Overview
The Task Maker is an intelligent system that leverages OpenAI's language models to automatically generate educational tasks and assignments. Users can communicate with an AI agent through a chat interface, and the system will generate LaTeX-based tasks that are compiled and displayed in real-time. Users can edit tasks directly in the compiled view, with changes automatically reflected in the underlying LaTeX code.

### Core Features

#### 1. AI Agent Communication
- **Chat Interface**: A right panel where users can communicate with the AI agent
- **Context-Aware Conversations**: The agent maintains conversation history and context
- **Task Generation Prompts**: Users can request specific types of tasks (math problems, essays, quizzes, etc.)
- **Iterative Refinement**: Users can ask for modifications, clarifications, or improvements to generated tasks

#### 2. LaTeX Task Generation
- **Dynamic LaTeX Creation**: AI agent generates LaTeX code based on user requirements
- **Template System**: Pre-defined LaTeX templates for different task types
- **Mathematical Notation**: Full support for mathematical expressions, equations, and symbols
- **Multi-format Support**: Support for various document types (worksheets, exams, homework assignments)

#### 3. Real-time Compilation
- **Live LaTeX Rendering**: Instant compilation and display of LaTeX code
- **Error Handling**: Graceful handling of LaTeX compilation errors with user-friendly messages
- **Preview Mode**: Real-time preview of how the final document will appear

#### 4. Direct Task Editing
- **WYSIWYG Interface**: Users can edit tasks directly in the compiled view
- **Bidirectional Sync**: Changes in the compiled view automatically update the LaTeX code
- **Rich Text Editing**: Support for text formatting, mathematical expressions, and structural changes
- **Version History**: Track changes and allow rollback to previous versions

### System Architecture

#### Frontend Components
```
src/
├── components/
│   ├── TaskMaker/
│   │   ├── ChatSidebar.tsx          # AI agent communication interface
│   │   ├── TaskEditor.tsx           # Main task editing area
│   │   ├── LaTeXViewer.tsx          # LaTeX code display and editing
│   │   ├── CompiledView.tsx         # Rendered task display
│   │   └── TaskPreview.tsx          # Final document preview
```

#### Backend Services
```
backend/
├── services/
│   ├── openai/
│   │   ├── agent.js                 # OpenAI API integration
│   │   ├── promptTemplates.js       # System prompts and templates
│   │   └── conversationManager.js   # Chat history and context
│   ├── latex/
│   │   ├── compiler.js              # LaTeX compilation service
│   │   ├── renderer.js              # PDF/HTML rendering
│   │   └── validator.js             # LaTeX syntax validation
│   └── task/
│       ├── generator.js              # Task generation logic
│       ├── editor.js                 # Task editing operations
│       └── versionControl.js         # Change tracking and history
```

### User Interface Design

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header (Navigation, User Info)                              │
├─────────────────┬─────────────────────┬─────────────────────┤
│                 │                     │                     │
│ LaTeX Viewer    │   Task Editor       │   Chat Sidebar      │
│ (Source Code)   │   (Compiled View)   │   (AI Agent)        │
│ [Toggleable]    │                     │                     │
│                 │                     │                     │
│ • LaTeX Code    │ • Rich Text Edit    │ • Chat History      │
│ • Syntax Highlight│ • Math Expressions │ • Quick Actions    │
│ • Live Preview  │ • Drag & Drop       │ • Math Quiz Gen     │
│ • Error Display │ • Real-time Sync    │ • Input Box         │
└─────────────────┴─────────────────────┴─────────────────────┘
```

**Layout Features:**
- **Left Panel**: LaTeX Viewer with toggle button to show/hide
- **Center Panel**: Task Editor (main editing area) - dynamically resizes
- **Right Panel**: Chat Sidebar (fixed width, always visible)
- **Responsive Design**: LaTeX viewer collapses to maximize editing space when hidden

#### Chat Sidebar Features (Right Panel)
- **Conversation Thread**: Chronological chat history with the AI agent
- **Math Quiz Generator**: Specialized quick action for LaTeX math problem generation
- **Auto-resizing Input**: Text area that expands based on content length
- **Real-time AI Response**: Direct LaTeX code generation without showing internal prompts
- **Light Theme UI**: Clean, minimalist design with light color scheme

#### LaTeX Viewer Features (Left Panel - Toggleable)
- **LaTeX Source Code**: Raw LaTeX code display and editing
- **Syntax Highlighting**: Color-coded LaTeX syntax for better readability  
- **Live Preview**: Real-time rendering preview of LaTeX changes
- **Error Display**: Clear error messages and debugging information
- **Toggle Control**: Show/hide functionality to maximize editing space

#### Task Editor Features
- **Rich Text Interface**: WYSIWYG editing with formatting toolbar
- **Mathematical Editor**: Inline math expression editing with LaTeX preview
- **Structural Elements**: Drag-and-drop interface for sections, questions, and components
- **Live Preview**: Real-time rendering of changes
- **Collaboration Tools**: Comments, suggestions, and version tracking

### Database Schema

#### Core Task Tables

##### 1. Tasks Table
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latex_code TEXT NOT NULL,
  compiled_html TEXT,
  subject VARCHAR(100),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  tags TEXT[], -- Array of tags for categorization
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 2. Task Versions Table
```sql
CREATE TABLE task_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  latex_code TEXT NOT NULL,
  compiled_html TEXT,
  change_summary TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, version_number)
);
```

##### 3. Task Conversations Table
```sql
CREATE TABLE task_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_data JSONB NOT NULL, -- OpenAI conversation history
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 4. Task Templates Table
```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  latex_code TEXT NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  difficulty_level VARCHAR(20),
  tags TEXT[],
  is_system_template BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

##### 5. Task Collaborations Table
```sql
CREATE TABLE task_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  permissions JSONB, -- Specific permissions for the user
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  UNIQUE(task_id, user_id)
);
```

##### 6. Task Comments Table
```sql
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  latex_range JSONB, -- Range in LaTeX where comment applies
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Database Indexes
```sql
-- Performance indexes for common queries
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_class_id ON tasks(class_id);
CREATE INDEX idx_tasks_subject ON tasks(subject);
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX idx_task_versions_task_id ON task_versions(task_id);
CREATE INDEX idx_task_conversations_task_id ON task_conversations(task_id);
```

### Backend API Endpoints

#### 1. Task Management Routes (`/api/tasks`)

##### GET `/api/tasks`
- **Description**: Retrieve tasks with filtering and pagination (no need to implement this yet)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `class_id`: Filter by class
  - `subject`: Filter by subject
  - `tags`: Filter by tags (comma-separated)
  - `search`: Search in title and description
- **Response**: Paginated list of tasks with metadata

##### POST `/api/tasks`
- **Description**: Create a new task
- **Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "latex_code": "string",
    "subject": "string", (optional)
    "class_id": "uuid", (optional)
    "tags": ["string"], 
  }
  ```
- **Response**: Created task object

##### GET `/api/tasks/:id`
- **Description**: Retrieve a specific task by ID
- **Response**: Task object with full details

##### PUT `/api/tasks/:id`
- **Description**: Update an existing task
- **Body**: Same as POST with optional fields
- **Response**: Updated task object

##### DELETE `/api/tasks/:id`
- **Description**: Delete a task (soft delete)
- **Response**: Success message

#### 2. Task Compilation Routes (`/api/tasks/:id/compile`)

##### POST `/api/tasks/:id/compile`
- **Description**: Compile LaTeX code to PDF
- **Body**:
  ```json
  {
    "latex_code": "string",
    "output_format": "html|pdf"
  }
  ```
- **Response**: Compiled content and metadata
- The compiled code should be shown in the center panel

#### 3. AI Agent Routes (`/api/tasks/:id/ai`)

##### POST `/api/tasks/:id/ai/chat`
- **Description**: Send message to AI agent for task generation/editing
- **Body**:
  ```json
  {
    "message": "string",
    "context": "string",
    "action": "generate|edit|improve|explain"
  }
  ```
- **Response**: AI response with LaTeX code and explanation

##### GET `/api/tasks/:id/ai/conversation`
- **Description**: Retrieve AI conversation history for a task
- **Response**: Array of conversation messages

##### POST `/api/tasks/:id/ai/generate`
- **Description**: Generate a new task using AI
- **Body**:
  ```json
  {
    "prompt": "string",
    "task_type": "string",
    "subject": "string",
    "difficulty": "string",
    "template_id": "uuid"
  }
  ```
- **Response**: Generated task with LaTeX code

#### 4. Template Management Routes (`/api/templates`) (no need to implement yet. for the future)

##### GET `/api/templates`
- **Description**: Retrieve available task templates
- **Query Parameters**: Similar to tasks with template-specific filters
- **Response**: Paginated list of templates

##### POST `/api/templates`
- **Description**: Create a new task template
- **Body**: Template object similar to task
- **Response**: Created template object

##### GET `/api/templates/:id`
- **Description**: Retrieve a specific template
- **Response**: Template object

##### PUT `/api/templates/:id`
- **Description**: Update a template
- **Response**: Updated template object

##### DELETE `/api/templates/:id`
- **Description**: Delete a template
- **Response**: Success message

#### 5. Collaboration Routes (`/api/tasks/:id/collaborators`) (no need to implement yet)

##### GET `/api/tasks/:id/collaborators`
- **Description**: Retrieve collaborators for a task
- **Response**: Array of collaborator objects

##### POST `/api/tasks/:id/collaborators`
- **Description**: Add a collaborator to a task
- **Body**:
  ```json
  {
    "user_id": "uuid",
    "role": "string",
    "permissions": "object"
  }
  ```
- **Response**: Collaboration object

##### PUT `/api/tasks/:id/collaborators/:userId`
- **Description**: Update collaborator permissions
- **Response**: Updated collaboration object

##### DELETE `/api/tasks/:id/collaborators/:userId`
- **Description**: Remove a collaborator
- **Response**: Success message

### Backend Services Implementation

#### 1. OpenAI Service (`backend/src/services/openai/agent.js`)
```javascript
const OpenAI = require('openai');
const { pool } = require('../../config/database');

class OpenAIAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.conversationHistory = new Map();
  }

  async generateTask(prompt, context, options = {}) {
    const systemPrompt = this.buildSystemPrompt(context, options);
    
    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    }); // gpt-5-nano doesn't require token and temp specification

    return this.parseTaskResponse(response.choices[0].message.content);
  }

  async editTask(taskId, userMessage, currentLatex) {
    const conversation = await this.getConversation(taskId);
    
    const messages = [
      { role: 'system', content: this.buildEditingPrompt() },
      ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: userMessage }
    ];

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      messages
    });

    const editedLatex = this.parseEditingResponse(response.choices[0].message.content);
    await this.saveConversation(taskId, 'user', userMessage);
    await this.saveConversation(taskId, 'assistant', response.choices[0].message.content);

    return { latex: editedLatex, explanation: response.choices[0].message.content };
  }

  buildSystemPrompt(context, options) {
    return `You are an expert educational content creator specializing in LaTeX document generation.
    
Context: ${context}
Subject: ${options.subject || 'general'}

Generate LaTeX code that:
1. Uses proper LaTeX syntax and structure
2. Includes appropriate packages for the content type
3. Has clear, educational content
4. Can be compiled without errors

Return only the LaTeX code, no explanations or markdown formatting.`;
  }

  buildEditingPrompt() {
    return `You are an expert LaTeX editor. The user will provide LaTeX code and a request for changes.
    
Your task is to:
1. Understand the current LaTeX structure
2. Make the requested changes while maintaining LaTeX syntax
3. Return only the modified LaTeX code
4. Ensure the code compiles correctly

Do not add explanations or markdown formatting. Return only the LaTeX code.`;
  }

  parseTaskResponse(response) {
    // Extract LaTeX code from AI response
    const latexMatch = response.match(/\\documentclass.*\\end\{document\}/s);
    if (latexMatch) {
      return latexMatch[0];
    }
    throw new Error('Invalid LaTeX response from AI');
  }

  parseEditingResponse(response) {
    // Extract LaTeX code from editing response
    const latexMatch = response.match(/\\documentclass.*\\end\{document\}/s);
    if (latexMatch) {
      return latexMatch[0];
    }
    throw new Error('Invalid LaTeX editing response from AI');
  }

  async getConversation(taskId) {
    const result = await pool.query(
      'SELECT conversation_data FROM task_conversations WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1',
      [taskId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].conversation_data.messages || [];
    }
    return [];
  }

  async saveConversation(taskId, role, content) {
    const conversation = await this.getConversation(taskId);
    conversation.push({ role, content, timestamp: new Date() });
    
    await pool.query(
      `INSERT INTO task_conversations (task_id, user_id, conversation_data)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, user_id)
       DO UPDATE SET conversation_data = $3, updated_at = CURRENT_TIMESTAMP`,
      [taskId, req.user.id, { messages: conversation }]
    );
  }
}

module.exports = new OpenAIAgent();
```

#### 2. LaTeX Compilation Service (`backend/src/services/latex/compiler.js`)
```javascript
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../../config/database');

class LaTeXCompiler {
  constructor() {
    this.tempDir = path.join(__dirname, '../../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async compileLatex(latexCode, outputFormat = 'html') {
    const taskId = this.generateTaskId();
    const tempDir = path.join(this.tempDir, taskId);
    
    try {
      await fs.mkdir(tempDir);
      
      // Write LaTeX file
      const latexFile = path.join(tempDir, 'document.tex');
      await fs.writeFile(latexFile, latexCode);
      
      // Compile based on output format
      let result;
      if (outputFormat === 'html') {
        result = await this.compileToHtml(tempDir, latexFile);
      } else if (outputFormat === 'pdf') {
        result = await this.compileToPdf(tempDir, latexFile);
      } else {
        throw new Error(`Unsupported output format: ${outputFormat}`);
      }
      
      return result;
    } catch (error) {
      throw new Error(`LaTeX compilation failed: ${error.message}`);
    } finally {
      // Cleanup temp directory
      await this.cleanupTempDir(tempDir);
    }
  }

  async compileToHtml(tempDir, latexFile) {
    return new Promise((resolve, reject) => {
      const command = `cd "${tempDir}" && pandoc "${latexFile}" -f latex -t html --mathjax -o document.html`;
      
      exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Pandoc conversion failed: ${error.message}`));
          return;
        }
        
        try {
          const htmlFile = path.join(tempDir, 'document.html');
          const htmlContent = await fs.readFile(htmlFile, 'utf8');
          resolve({
            content: htmlContent,
            format: 'html',
            metadata: this.extractMetadata(htmlContent)
          });
        } catch (readError) {
          reject(new Error(`Failed to read HTML output: ${readError.message}`));
        }
      });
    });
  }

  async compileToPdf(tempDir, latexFile) {
    return new Promise((resolve, reject) => {
      const command = `cd "${tempDir}" && pdflatex -interaction=nonstopmode "${latexFile}"`;
      
      exec(command, { timeout: 30000 }, async (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`PDF compilation failed: ${error.message}`));
          return;
        }
        
        try {
          const pdfFile = path.join(tempDir, 'document.pdf');
          const pdfBuffer = await fs.readFile(pdfFile);
          resolve({
            content: pdfBuffer.toString('base64'),
            format: 'pdf',
            metadata: this.extractPdfMetadata(pdfBuffer)
          });
        } catch (readError) {
          reject(new Error(`Failed to read PDF output: ${readError.message}`));
        }
      });
    });
  }

  extractMetadata(content) {
    // Extract title, author, date, etc. from content
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Untitled Document';
    
    return {
      title,
      wordCount: this.countWords(content),
      compiledAt: new Date().toISOString()
    };
  }

  extractPdfMetadata(pdfBuffer) {
    // Basic PDF metadata extraction
    return {
      format: 'pdf',
      size: pdfBuffer.length,
      compiledAt: new Date().toISOString()
    };
  }

  countWords(content) {
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textContent.split(' ').length;
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async cleanupTempDir(tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }
}

module.exports = new LaTeXCompiler();
```

#### 3. Task Service (`backend/src/services/task/generator.js`)
```javascript
const { pool } = require('../../config/database');
const openaiAgent = require('../openai/agent');
const latexCompiler = require('../latex/compiler');

class TaskGenerator {
  async generateTask(userId, prompt, options = {}) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Generate task using AI
      const latexCode = await openaiAgent.generateTask(prompt, options.context, options);
      
      // Compile LaTeX to HTML for preview
      const compiledResult = await latexCompiler.compileLatex(latexCode, 'html');
      
      // Create task record
      const taskResult = await client.query(
        `INSERT INTO tasks (
          title, description, latex_code, compiled_html, 
          subject, class_id, created_by, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          options.title || 'AI Generated Task',
          options.description || prompt,
          latexCode,
          compiledResult.content,
          options.subject || 'general',
          options.class_id || null,
          userId,
          options.tags || []
        ]
      );
      
      // Create initial version
      await client.query(
        `INSERT INTO task_versions (task_id, version_number, latex_code, compiled_html, change_summary)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          taskResult.rows[0].id,
          1,
          latexCode,
          compiledResult.content,
          'Initial AI-generated task'
        ]
      );
      
      await client.query('COMMIT');
      return taskResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTask(taskId, userId, updates) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current task
      const currentTask = await client.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      
      if (currentTask.rows.length === 0) {
        throw new Error('Task not found');
      }
      
      const task = currentTask.rows[0];
      
      // Check permissions
      if (task.created_by !== userId) {
        const collaboration = await client.query(
          'SELECT role FROM task_collaborations WHERE task_id = $1 AND user_id = $2',
          [taskId, userId]
        );
        
        if (collaboration.rows.length === 0 || !['editor', 'admin'].includes(collaboration.rows[0].role)) {
          throw new Error('Insufficient permissions to edit this task');
        }
      }
      
      // Update task
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(updates[key]);
          paramCount++;
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const updateResult = await client.query(
        `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        [...updateValues, taskId]
      );
      
      // Create new version if LaTeX code changed
      if (updates.latex_code && updates.latex_code !== task.latex_code) {
        const versionNumber = await this.getNextVersionNumber(taskId);
        
        await client.query(
          `INSERT INTO task_versions (task_id, version_number, latex_code, change_summary)
           VALUES ($1, $2, $3, $4)`,
          [
            taskId,
            versionNumber,
            updates.latex_code,
            updates.change_summary || 'Task updated'
          ]
        );
      }
      
      await client.query('COMMIT');
      return updateResult.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getNextVersionNumber(taskId) {
    const result = await pool.query(
      'SELECT MAX(version_number) as max_version FROM task_versions WHERE task_id = $1',
      [taskId]
    );
    
    return (result.rows[0].max_version || 0) + 1;
  }

  async getTaskWithVersions(taskId, userId) {
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }
    
    const task = taskResult.rows[0];
    
    // Check access permissions
    if (task.created_by !== userId && !task.is_public) {
      const collaboration = await pool.query(
        'SELECT role FROM task_collaborations WHERE task_id = $1 AND user_id = $2',
        [taskId, userId]
      );
      
      if (collaboration.rows.length === 0) {
        throw new Error('Access denied to this task');
      }
    }
    
    // Get versions
    const versionsResult = await pool.query(
      'SELECT * FROM task_versions WHERE task_id = $1 ORDER BY version_number DESC',
      [taskId]
    );
    
    return {
      ...task,
      versions: versionsResult.rows
    };
  }
}

module.exports = new TaskGenerator();
```

### Environment Configuration

#### Required Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-nano

# LaTeX Compilation
LATEX_COMPILER_PATH=/usr/local/bin/pdflatex
PANDOC_PATH=/usr/local/bin/pandoc
TEMP_DIR=./temp
MAX_COMPILATION_TIME=30000

# Task Generation Limits
MAX_TASKS_PER_USER=100
MAX_TASK_SIZE=1048576
MAX_CONVERSATION_LENGTH=50

# Security
JWT_SECRET=your_jwt_secret_key_here
RATE_LIMIT_TASKS=100
RATE_LIMIT_COMPILATION=50
```

### Security and Rate Limiting

#### Task Generation Rate Limiting
```javascript
const taskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each user to 100 task generations per windowMs
  message: 'Too many task generations, please try again later.',
  keyGenerator: (req) => req.user.id, // Rate limit by user ID
  skip: (req) => req.user.role === 'admin' // Skip for admins
});

app.use('/api/tasks/ai/generate', taskLimiter);
```

#### LaTeX Compilation Rate Limiting
```javascript
const compilationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each user to 50 compilations per windowMs
  message: 'Too many LaTeX compilations, please try again later.',
  keyGenerator: (req) => req.user.id,
  skip: (req) => req.user.role === 'admin'
});

app.use('/api/tasks/:id/compile', compilationLimiter);
```

### Testing Strategy

#### Backend Testing
```javascript
// tests/task.test.js
describe('Task Generation', () => {
  test('should generate task with valid prompt', async () => {
    const response = await request(app)
      .post('/api/tasks/ai/generate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        prompt: 'Create a math quiz with 5 algebra problems',
        subject: 'mathematics'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('latex_code');
  });
});

describe('LaTeX Compilation', () => {
  test('should compile valid LaTeX to PDF', async () => {
    const response = await request(app)
      .post('/api/tasks/123/compile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        latex_code: '\\documentclass{article}\\begin{document}Hello World\\end{document}',
        output_format: 'pdf'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('content');
    expect(response.body.format).toBe('pdf');
  });
});
```

### Performance Optimization

#### Caching Strategy
```javascript
const NodeCache = require('node-cache');
const taskCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Cache compiled LaTeX results
const getCachedCompilation = async (latexHash, outputFormat) => {
  const cacheKey = `${latexHash}_${outputFormat}`;
  return taskCache.get(cacheKey);
};

const setCachedCompilation = (latexHash, outputFormat, result) => {
  const cacheKey = `${latexHash}_${outputFormat}`;
  taskCache.set(cacheKey, result);
};
```

#### Database Query Optimization
```javascript
// Use prepared statements for frequent queries
const getTaskById = pool.query(
  'SELECT * FROM tasks WHERE id = $1',
  [taskId]
);

// Implement pagination for large result sets
const getTasksWithPagination = async (page = 1, limit = 20, filters = {}) => {
  const offset = (page - 1) * limit;
  const whereClause = this.buildWhereClause(filters);
  
  const result = await pool.query(
    `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  return result.rows;
};
```

This comprehensive backend specification provides all the necessary components for implementing the TaskMaker system, including database schema, API endpoints, services, security measures, and performance optimizations. The modular architecture allows for iterative development while maintaining scalability and security best practices.
