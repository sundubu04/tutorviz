import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Undo,
  Redo,
  Bold,
  Italic,
  List,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bot,
  FileText,
  Eye,
  Code,
  X,
  GripVertical
} from 'lucide-react';
import LatexToPdfViewer from '../components/LatexToPdfViewer';

const TaskEditor: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLatexViewerOpen, setIsLatexViewerOpen] = useState(true);
  const [taskContent, setTaskContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant'; content: string; timestamp: Date}[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [latexContent, setLatexContent] = useState(`\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Task Document}
\\author{TutoriAI}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Enter your task content here.

\\section{Main Content}
Your main content goes here.

\\end{document}`);

  // Panel resizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  // Refs for drag functionality
  const leftResizerRef = useRef<HTMLDivElement>(null);
  const rightResizerRef = useRef<HTMLDivElement>(null);
  
  // Throttle resize updates for smoother performance
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleBackToTasks = () => {
    navigate('/tasks');
  };

  const handleButtonClick = (buttonName: string) => {
    alert(`${buttonName} functionality to be implemented`);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleLatexViewer = () => {
    setIsLatexViewerOpen(!isLatexViewerOpen);
  };

  // Throttled resize function for smoother performance
  const throttledResize = useCallback((resizeFunction: () => void) => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      resizeFunction();
    }, 16); // ~60fps
  }, []);

  // Mouse event handlers for left panel resizing
  const handleLeftMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  }, []);

  const handleLeftMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingLeft) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth * 0.4; // Max 40% of screen width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      // Use throttled resize for smoother performance
      throttledResize(() => {
        setLeftPanelWidth(newWidth);
      });
    }
  }, [isDraggingLeft, throttledResize]);

  const handleLeftMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    // Clear any pending resize updates
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
  }, []);

  // Mouse event handlers for right panel resizing
  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
  }, []);

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRight) return;
    
    const newWidth = window.innerWidth - e.clientX;
    const minWidth = 200;
    const maxWidth = window.innerWidth * 0.4; // Max 40% of screen width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      // Use throttled resize for smoother performance
      throttledResize(() => {
        setRightPanelWidth(newWidth);
      });
    }
  }, [isDraggingRight, throttledResize]);

  const handleRightMouseUp = useCallback(() => {
    setIsDraggingRight(false);
    // Clear any pending resize updates
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = null;
    }
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDraggingLeft) {
      document.addEventListener('mousemove', handleLeftMouseMove);
      document.addEventListener('mouseup', handleLeftMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleLeftMouseMove);
      document.removeEventListener('mouseup', handleLeftMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, handleLeftMouseMove, handleLeftMouseUp]);

  useEffect(() => {
    if (isDraggingRight) {
      document.addEventListener('mousemove', handleRightMouseMove);
      document.addEventListener('mouseup', handleRightMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleRightMouseMove);
      document.removeEventListener('mouseup', handleRightMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingRight, handleRightMouseMove, handleRightMouseUp]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Load task content on component mount
  useEffect(() => {
    const loadTaskContent = async () => {
      if (!taskId) return;
      
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call when backend is reimplemented
        setTaskContent('Task content will be loaded here when backend is ready...');
      } catch (error) {
        console.error('Error loading task content:', error);
        setTaskContent('Error loading task content');
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskContent();
  }, [taskId]);

  const handleSave = async () => {
    if (!taskId) return;
    
    try {
      setIsSaving(true);
      // TODO: Replace with actual API call when backend is reimplemented
      alert('Save functionality will be implemented when backend is ready');
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !taskId) return;

    const userMessage = chatMessage.trim();
    setChatMessage('');
    
    // Add user message to chat history
    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      setIsAgentWorking(true);
      // TODO: Replace with actual AI API call when backend is reimplemented
      const aiResponse = {
        role: 'assistant' as const,
        content: 'AI assistance will be available when the backend is reimplemented. For now, you can edit the task content directly.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorResponse = {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setIsAgentWorking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading task editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToTasks}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Tasks</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">Task Editor</h1>
              {taskId && (
                <span className="text-sm text-gray-500">ID: {taskId}</span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleButtonClick.bind(null, 'Undo')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Undo"
              >
                <Undo className="h-5 w-5" />
              </button>
              <button
                onClick={handleButtonClick.bind(null, 'Redo')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Redo"
              >
                <Redo className="h-5 w-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex space-x-0">
        {/* Left Panel - LaTeX Viewer (Toggleable) */}
        {isLatexViewerOpen && (
          <>
            <div 
              className="bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-150 ease-out"
              style={{ width: `${leftPanelWidth}px` }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Code className="h-5 w-5" />
                    <span>LaTeX Viewer</span>
                  </h3>
                  <button
                    onClick={toggleLatexViewer}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hide LaTeX Viewer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Raw LaTeX source code</p>
                </div>

                {/* LaTeX Source Code Display */}
                <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                  <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap overflow-auto max-h-96">
                    {latexContent}
                  </pre>
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>View and edit raw LaTeX code. Changes sync with the main editor.</p>
                </div>
              </div>
            </div>
            
            {/* Left Panel Resizer */}
            <div
              ref={leftResizerRef}
              className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group transition-colors duration-150"
              onMouseDown={handleLeftMouseDown}
              title="Drag to resize left panel"
            >
              <GripVertical className="h-6 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" />
            </div>
          </>
        )}

        {/* Center Panel - Task Editor (Main editing area, dynamically resizes) */}
        <div className={`flex-1 bg-white transition-all duration-150 ease-out ${isChatOpen ? 'min-w-0' : 'w-full'}`}>
          <div className="p-4">
            {/* Tab Navigation */}
            <div className="flex items-center space-x-1 mb-4 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'editor'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>Editor</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>PDF Preview</span>
                </div>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'editor' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Task Editor</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleButtonClick.bind(null, 'Bold')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleButtonClick.bind(null, 'Italic')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleButtonClick.bind(null, 'List')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="List"
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleButtonClick.bind(null, 'Align Left')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Align Left"
                    >
                      <AlignLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleButtonClick.bind(null, 'Align Center')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Align Center"
                    >
                      <AlignCenter className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleButtonClick.bind(null, 'Align Right')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Align Right"
                    >
                      <AlignRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <textarea
                  value={taskContent}
                  onChange={(e) => setTaskContent(e.target.value)}
                  className="w-full h-[calc(100vh-280px)] p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your task content here..."
                />
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>Edit your task content above. Switch to PDF Preview to see the compiled result.</p>
                </div>
              </>
            )}

            {activeTab === 'preview' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">PDF Preview</h2>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  >
                    Edit Task
                  </button>
                </div>
                
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 h-[calc(100vh-280px)] overflow-auto">
                  <LatexToPdfViewer latex={latexContent} />
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>PDF is automatically compiled from your LaTeX content. Make changes in the Editor tab and return here to see updates.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat Sidebar (Fixed width, always visible) */}
        {isChatOpen && (
          <>
            {/* Right Panel Resizer */}
            <div
              ref={rightResizerRef}
              className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize flex items-center justify-center group transition-colors duration-150"
              onMouseDown={handleRightMouseDown}
              title="Drag to resize right panel"
            >
              <GripVertical className="h-6 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-150" />
            </div>
            
            <div 
              className="bg-white border-l border-gray-200 flex-shrink-0 transition-all duration-150 ease-out"
              style={{ width: `${rightPanelWidth}px` }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                  <button
                    onClick={toggleChat}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Hide Chat"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Ask me to help with your task</p>
                  <p className="text-xs mt-2">AI assistance will be available when backend is ready</p>
                </div>

                {/* Chat History */}
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isAgentWorking && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="space-y-3">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask me to help with your task..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!chatMessage.trim() || isAgentWorking}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    <Bot className="h-4 w-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle Buttons (when panels are closed) */}
      {!isLatexViewerOpen && (
        <button
          onClick={toggleLatexViewer}
          className="fixed left-6 bottom-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open LaTeX Viewer"
        >
          <Code className="h-6 w-6" />
        </button>
      )}

      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed right-6 bottom-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default TaskEditor;
