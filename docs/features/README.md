# LaTeX to PDF with Tectonic

This feature allows users to write LaTeX documents in the Task Editor and automatically compile them to PDF using Tectonic.

## Features

- **LaTeX Editor**: Write LaTeX documents with syntax highlighting
- **PDF Preview**: Real-time PDF compilation and preview
- **Tabbed Interface**: Switch between editing and preview modes
- **Automatic Compilation**: PDF updates automatically when LaTeX content changes

## Setup

### Backend Requirements

1. **Install Tectonic**:
   - **macOS**: `brew install tectonic`
   - **Linux**: `apt-get install -y tectonic`
   - **Docker**: Tectonic is included in the Docker images

2. **Backend Route**: The LaTeX compilation endpoint is available at `/api/latex/compile`

### Frontend Components

- `useLatexPdf` hook: Manages LaTeX compilation state
- `LatexToPdfViewer` component: Displays compiled PDFs
- Enhanced TaskEditor with LaTeX tabs

## Usage

1. **Open Task Editor**: Navigate to any task in the application
2. **Switch to Editor Tab**: Click the "Editor" tab to write LaTeX
3. **Write LaTeX**: Use the textarea to write your LaTeX document
4. **Preview PDF**: Click the "PDF Preview" tab to see the compiled result
5. **Real-time Updates**: Switch between tabs to see changes reflected in the PDF

## LaTeX Template

The editor comes with a basic LaTeX template:

```latex
\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{graphicx}
\usepackage{geometry}

\geometry{margin=1in}

\title{Task Document}
\author{TutoriAI}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}
Enter your task content here.

\section{Main Content}
Your main content goes here.

\end{document}
```

## API Endpoint

**POST** `/api/latex/compile`

**Request Body**:
```json
{
  "latex": "\\documentclass{article}\\begin{document}Hello World\\end{document}",
  "jobname": "main"
}
```

**Response**: `application/pdf` (binary)

**Error Response**:
```json
{
  "error": "Compilation failed (code 1)",
  "log": "LaTeX compilation error details..."
}
```

## Security Features

- **Input Validation**: LaTeX content limited to 2MB
- **Timeouts**: 60-second compilation timeout
- **Sandboxing**: Temporary directories for each compilation
- **Shell Escape Disabled**: Tectonic runs with security restrictions

## Troubleshooting

### Common Issues

1. **Tectonic not found**: Ensure Tectonic is installed and available in PATH
2. **Compilation errors**: Check LaTeX syntax and package availability
3. **Timeout errors**: Large documents may exceed the 60-second limit

### Development

- Use Docker for consistent environment
- Check backend logs for compilation errors
- Verify Tectonic installation: `tectonic --version`

## Future Enhancements

- Math equation preview with KaTeX
- LaTeX syntax highlighting
- Template library
- Export to different formats
- Collaborative editing
