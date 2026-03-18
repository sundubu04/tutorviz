import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Undo,
  Redo,
  Bot,
  Code,
  X,
  Download
} from 'lucide-react';
import LatexToPdfViewer from '../components/LatexToPdfViewer';
import ResizablePanel from '../components/resizable/ResizablePanel';

const TaskEditor: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isLatexViewerOpen, setIsLatexViewerOpen] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant'; content: string; timestamp: Date}[]>([]);
  const [aiProposal, setAiProposal] = useState<{ assistantMessage: string; updatedLatex: string } | null>(null);

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const isUuid = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  };


  // Panel resizing state - Better proportions like Overleaf
  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

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

  // Load task content on component mount
  useEffect(() => {
    const loadTaskContent = async () => {
      if (!taskId) return;

      // Backend expects UUIDs for `Task.id`. For demo/non-UUID ids,
      // keep the local editor LaTeX and avoid the failing API call.
      if (!isUuid(taskId)) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const token = localStorage.getItem('authToken');

        const res = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          // For demo/non-UUID ids (e.g. "demo-task"), we keep the editor's default LaTeX.
          if (res.status === 404 || res.status === 400) {
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (typeof data?.content === 'string' && data.content.trim()) {
          setLatexContent(data.content);
        }
      } catch (error) {
        // Avoid noisy console errors for benign cases.
        // Non-UUID ids will be handled by the `res.status === 404/400` early return above.
        console.error('Error loading task content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskContent();
  }, [taskId]);

  const saveLatex = async (contentOverride?: string) => {
    if (!taskId) return;
    if (!isUuid(taskId)) {
      // Non-UUID ids are "demo" / client-only until we add a create-task flow.
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('authToken');
      const nextContent = typeof contentOverride === 'string' ? contentOverride : latexContent;

      const res = await fetch(`http://localhost:5001/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: nextContent }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await saveLatex();
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
      const token = localStorage.getItem('authToken');
      const history = [
        ...chatHistory.slice(-9).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ];

      const res = await fetch(`http://localhost:5001/api/tasks/${taskId}/ai/latex-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMessage,
          latexContent,
          history,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errText}`);
      }

      const data = await res.json();

      const assistantMessage = typeof data?.assistantMessage === 'string' ? data.assistantMessage : '';
      const updatedLatex = typeof data?.updatedLatex === 'string' ? data.updatedLatex : latexContent;

      setAiProposal({
        assistantMessage,
        updatedLatex,
      });

      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: assistantMessage || 'AI generated an updated LaTeX document.',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiProposal(null);
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant' as const,
          content: 'Sorry, I encountered an error. Please try again later.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsAgentWorking(false);
    }
  };

  const handleApplyAiProposal = async () => {
    if (!aiProposal || !taskId) return;
    const nextLatex = aiProposal.updatedLatex;
    setAiProposal(null);
    setLatexContent(nextLatex);
    if (isUuid(taskId)) {
      await saveLatex(nextLatex);
    }
  };

  const handleCancelAiProposal = () => {
    setAiProposal(null);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading task editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
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
                onClick={handleDownload}
                disabled={!pdfUrl}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF"
              >
                <Download className="h-5 w-5" />
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
      <div className="flex-1 flex min-h-0 bg-white">
        {/* Left Panel - LaTeX Code Editor */}
        {isLatexViewerOpen && (
          <ResizablePanel
            side="left"
            initialWidth={leftPanelWidth}
            minWidth={250}
            maxWidth={window.innerWidth * 0.5}
            onWidthChange={setLeftPanelWidth}
            borderSide="right"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>main.tex</span>
              </h3>
              <button
                onClick={toggleLatexViewer}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                title="Hide LaTeX Editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* LaTeX Source Code Editor */}
            <div className="flex-1 relative">
              <textarea
                value={latexContent}
                onChange={(e) => setLatexContent(e.target.value)}
                className="w-full h-full p-4 text-sm text-gray-800 font-mono resize-none border-0 bg-transparent focus:outline-none leading-relaxed"
                placeholder="Enter your LaTeX code here..."
                style={{ lineHeight: '1.6' }}
              />
            </div>
          </ResizablePanel>
        )}

        {/* Center Panel - PDF Viewer */}
        <div className={`flex-1 bg-gray-50 transition-all duration-150 ease-out min-h-0 ${isChatOpen ? 'min-w-0' : 'w-full'}`}>
          <div className="h-full flex flex-col">

            <div className="flex-1 overflow-hidden">
              <LatexToPdfViewer latex={latexContent} className="h-full" onPdfUrlChange={setPdfUrl} />
            </div>
          </div>
        </div>

        {/* Right Panel - Chat Sidebar (Fixed width, always visible) */}
        {isChatOpen && (
          <ResizablePanel
            side="right"
            initialWidth={rightPanelWidth}
            minWidth={200}
            maxWidth={window.innerWidth * 0.35}
            onWidthChange={setRightPanelWidth}
            borderSide="left"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>AI Assistant</span>
              </h3>
              <button
                onClick={toggleChat}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-200"
                title="Hide Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Ask me to help with your task</p>
                <p className="text-xs mt-1 text-gray-500">Ask for LaTeX edits; confirm before applying changes</p>
              </div>

              {/* Chat History */}
              <div className="flex-1 space-y-2 mb-4 overflow-y-auto">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-lg ${
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

              {/* AI confirmation (Apply/Cancel) */}
              {aiProposal && (
                <div className="mb-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <p className="text-xs font-medium text-yellow-900">AI proposed an update</p>
                  <p className="text-sm text-yellow-900 mt-1 font-medium">Confirmation required</p>
                  <p className="text-xs text-yellow-900 mt-2 whitespace-pre-wrap opacity-90">
                    {aiProposal.assistantMessage}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handleApplyAiProposal}
                      disabled={isAgentWorking || isSaving}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Apply updated LaTeX
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAiProposal}
                      disabled={isAgentWorking || isSaving}
                      className="flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleChatSubmit} className="space-y-2">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Ask me to help with your task..."
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={!chatMessage.trim() || isAgentWorking}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 text-sm"
                >
                  <Bot className="h-4 w-4" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </ResizablePanel>
        )}
      </div>

      {/* Toggle Buttons (when panels are closed) */}
      {!isLatexViewerOpen && (
        <button
          onClick={toggleLatexViewer}
          className="fixed left-6 bottom-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Open LaTeX Editor"
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
