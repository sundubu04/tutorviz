# LaTeX Implementation with Tectonic

This document describes the complete LaTeX implementation in TutoriAI's Task Editor, featuring real-time PDF compilation using Tectonic.

## Overview

The LaTeX implementation provides:
- **Real-time PDF compilation** using Tectonic LaTeX engine
- **Interactive LaTeX editor** with syntax highlighting
- **Template system** with pre-built document templates
- **Snippet library** for common LaTeX elements
- **Error handling** with detailed compilation logs
- **PDF preview** with download functionality

## Architecture

### Backend (Node.js + Express)
- **Endpoint**: `POST /api/latex/compile`
- **Engine**: Tectonic LaTeX compiler
- **Security**: Isolated temporary directories, timeouts, input validation
- **File**: `backend/src/routes/latex.js`

### Frontend (React + TypeScript)
- **Hook**: `useLatexPdf` - Manages compilation state and API calls
- **Component**: `LatexToPdfViewer` - Displays PDF with error handling
- **Component**: `LatexTemplates` - Template and snippet selection
- **Integration**: TaskEditor with three-panel layout

## Features

### 1. Real-time Compilation
- **Debounced compilation**: 1-second delay to avoid excessive API calls
- **Automatic recompilation**: When LaTeX content changes
- **Status indicators**: Loading, success, and error states

### 2. LaTeX Editor
- **Toggle between view/edit modes**
- **Monospace font** for better code readability
- **Full-height editor** with proper scrolling
- **Real-time sync** with PDF preview

### 3. Template System
- **Article template**: Standard academic format
- **Book/Report template**: Multi-chapter documents
- **Math document**: Mathematical content with equations
- **Presentation template**: Beamer slides
- **Table document**: Data tables and formatting

### 4. Snippet Library
- **Math equations**: Inline and display math
- **Text formatting**: Bold, italic, lists
- **Tables**: Basic table structures
- **Images**: Image inclusion syntax

### 5. Error Handling
- **Compilation errors**: Detailed error messages
- **Compilation logs**: Expandable log viewer
- **Retry functionality**: One-click retry button
- **Graceful degradation**: Fallback for unsupported browsers

### 6. PDF Features
- **Inline preview**: PDF displayed directly in browser
- **Download functionality**: Save PDF to local system
- **Responsive design**: Adapts to panel sizes
- **High-quality output**: Tectonic's superior rendering

## Usage

### Basic Workflow
1. **Open Task Editor**: Navigate to `/task-editor/{taskId}`
2. **Edit LaTeX**: Use the left panel to edit LaTeX source
3. **Preview PDF**: Switch to "PDF Preview" tab
4. **Download**: Click download button when ready

### Using Templates
1. **Expand Templates**: Click the chevron in the left panel
2. **Select Template**: Choose from available templates
3. **Customize**: Edit the template content as needed
4. **Compile**: PDF updates automatically

### Using Snippets
1. **Switch to Snippets**: Use the tabs in the templates section
2. **Select Snippet**: Click on any snippet to insert it
3. **Position Cursor**: Place cursor where you want the snippet
4. **Insert**: Snippet is added to the current LaTeX content

## Technical Details

### API Contract
```json
POST /api/latex/compile
{
  "latex": "\\documentclass{article}\\begin{document}Hello!\\end{document}",
  "jobname": "main"
}
```

**Response**: `application/pdf` (binary)

**Error Response**:
```json
{
  "error": "Compilation failed (code 1)",
  "log": "LaTeX Error: Missing \\begin{document}"
}
```

### Security Features
- **Input validation**: Maximum 2MB LaTeX content
- **Job name sanitization**: Only alphanumeric characters allowed
- **Isolated execution**: Each compilation in separate temp directory
- **Timeout protection**: 60-second maximum compilation time
- **Resource cleanup**: Automatic cleanup of temporary files

### Performance Optimizations
- **Debounced compilation**: Prevents excessive API calls
- **URL management**: Proper cleanup of blob URLs
- **Memory management**: Automatic garbage collection
- **Caching**: Avoids recompiling identical content

## Dependencies

### Backend
- **tectonic**: LaTeX compiler (system dependency)
- **express**: Web framework
- **child_process**: Process spawning for Tectonic

### Frontend
- **react**: UI framework
- **lucide-react**: Icons
- **typescript**: Type safety

## Installation

### System Requirements
```bash
# macOS
brew install tectonic

# Ubuntu/Debian
sudo apt-get install tectonic

# Or use Docker (see Dockerfile in docs)
```

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Frontend Setup
```bash
npm install
npm start
```

## Testing

### Manual Testing
1. **Start servers**: Both frontend (3000) and backend (5001)
2. **Navigate**: Go to `/task-editor/demo-task`
3. **Edit LaTeX**: Modify the default template
4. **Check compilation**: Verify PDF updates in real-time
5. **Test errors**: Introduce syntax errors to test error handling

### API Testing
```bash
curl -X POST http://localhost:5001/api/latex/compile \
  -H 'Content-Type: application/json' \
  -d '{"latex": "\\documentclass{article}\\begin{document}Test\\end{document}"}' \
  --output test.pdf
```

## Troubleshooting

### Common Issues

1. **Tectonic not found**
   - Ensure Tectonic is installed and in PATH
   - Check system dependencies

2. **Compilation timeouts**
   - Reduce LaTeX complexity
   - Check for infinite loops in LaTeX

3. **PDF not displaying**
   - Check browser PDF support
   - Verify CORS settings
   - Check network connectivity

4. **Memory issues**
   - Large LaTeX documents may cause memory problems
   - Consider document size limits

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in the backend.

## Future Enhancements

- **Syntax highlighting**: CodeMirror integration
- **Auto-completion**: LaTeX command suggestions
- **Collaborative editing**: Real-time collaboration
- **Version control**: Document history
- **Export options**: Multiple output formats
- **Math preview**: KaTeX for instant math rendering
- **Template marketplace**: User-contributed templates

## Contributing

When contributing to the LaTeX implementation:

1. **Test thoroughly**: Verify compilation works
2. **Handle errors**: Provide meaningful error messages
3. **Performance**: Consider debouncing and caching
4. **Security**: Validate all inputs
5. **Documentation**: Update this file for new features

## License

This implementation is part of TutoriAI and follows the project's MIT license.
