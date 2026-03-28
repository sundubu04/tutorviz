import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Undo,
  Redo,
  Bot,
  Code,
  X
} from 'lucide-react';
import LatexToPdfViewer from '../components/LatexToPdfViewer';
import ResizablePanel from '../components/resizable/ResizablePanel';
import { getApiBase } from '../config/api';
import { apiClient } from '../utils/apiClient';
import { useMediaQuery } from '../hooks/useMediaQuery';

type MobileEditorTab = 'code' | 'preview' | 'chat';

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
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [latexContent, setLatexContent] = useState(`\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{geometry}

\\geometry{margin=1in}

\\title{Task Document}
\\author{Tutorviz}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Enter your task content here.

\\section{Main Content}
Your main content goes here.

\\end{document}`);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState<string>('');
  const [compileTrigger, setCompileTrigger] = useState<number | null>(null);
  const [hasLoadedTask, setHasLoadedTask] = useState(false);
  const hasInitialCompiledRef = useRef(false);

  const isUuid = (value: unknown): value is string => {
    if (typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  };


  // Panel resizing state - Better proportions like Overleaf
  const [leftPanelWidth, setLeftPanelWidth] = useState(400);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

  const isMobileLayout = useMediaQuery('(max-width: 767px)');
  const [mobileTab, setMobileTab] = useState<MobileEditorTab>('preview');

  const handleBackToTasks = () => {
    navigate('/tasks');
  };

  const handleButtonClick = (buttonName: string) => {
    alert(`${buttonName} functionality to be implemented`);
  };

  const triggerCompile = () => {
    setCompileTrigger((prev) => (prev === null ? 1 : prev + 1));
  };

  const latexForViewer = aiProposal?.updatedLatex ?? latexContent;

  const loadChatHistory = useCallback(async () => {
    if (!taskId) return;
    if (!isUuid(taskId)) {
      setChatHistory([]);
      return;
    }

    try {
      const chatRes = await apiClient.fetchWithAuth(
        `${getApiBase()}/tasks/${taskId}/chat/messages`,
        { method: 'GET' }
      );

      if (!chatRes.ok) return;

      const messages = await chatRes.json();
      if (!Array.isArray(messages)) return;

      setChatHistory(
        messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : '',
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
        }))
      );
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, [taskId]);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const toggleLatexViewer = () => {
    setIsLatexViewerOpen(!isLatexViewerOpen);
  };

  // Load task content on component mount
  useEffect(() => {
    if (taskId && !isUuid(taskId)) {
      // Non-UUID tasks are not supported.
      setIsLoading(false);
      setHasLoadedTask(false);
      hasInitialCompiledRef.current = false;
      navigate('/tasks');
      return;
    }
    setHasLoadedTask(false);
    hasInitialCompiledRef.current = false;

    const loadTaskContent = async () => {
      if (!taskId) return;
      
      try {
        setIsLoading(true);

        const res = await apiClient.fetchWithAuth(`${getApiBase()}/tasks/${taskId}`, {
          method: 'GET',
        });

        if (!res.ok) {
          // Non-UUID ids are not supported; just bail out.
          if (res.status === 404 || res.status === 400) {
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        if (typeof data?.content === 'string' && data.content.trim()) {
          setLatexContent(data.content);
        }

        if (typeof data?.title === 'string') {
          setTaskTitle(data.title);
        }

        // Load persisted AI chat messages for this task.
        await loadChatHistory();
      } catch (error) {
        // Avoid noisy console errors for benign cases.
        // Non-UUID ids will be handled by the `res.status === 404/400` early return above.
        console.error('Error loading task content:', error);
      } finally {
        setIsLoading(false);
        setHasLoadedTask(true);
      }
    };

    loadTaskContent();
  }, [taskId, loadChatHistory, navigate]);

  // Compile once after initial load finishes (so the preview isn't blank).
  useEffect(() => {
    if (!taskId) return;
    if (!hasLoadedTask) return;
    if (!isUuid(taskId)) return;
    if (hasInitialCompiledRef.current) return;

    hasInitialCompiledRef.current = true;
    triggerCompile();
  }, [taskId, hasLoadedTask]);

  // Auto-scroll chat thread to the newest message.
  // We explicitly set `scrollTop = scrollHeight` for reliability with `overflow-y-auto`.
  useLayoutEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    // Wait one frame so layout is up to date (especially after large assistant messages).
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [chatHistory.length, isAgentWorking, aiProposal]);

  const saveLatex = async (contentOverride?: string) => {
    if (!taskId) return;
    if (!isUuid(taskId)) {
      // Only UUID-backed tasks are supported.
      return;
    }

    try {
      setIsSaving(true);
      const nextContent = typeof contentOverride === 'string' ? contentOverride : latexContent;

      const res = await apiClient.fetchWithAuth(`${getApiBase()}/tasks/${taskId}`, {
        method: 'PUT',
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

      const res = await apiClient.fetchWithAuth(
        `${getApiBase()}/tasks/${taskId}/ai/latex-edit`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: userMessage,
            latexContent,
          }),
        }
      );

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

      // AI response is done; compile the proposed LaTeX.
      triggerCompile();

      // Re-sync chat from the persisted backend state.
      await loadChatHistory();
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
    setLatexContent(nextLatex);
    setAiProposal(null);
    if (isUuid(taskId)) {
      await saveLatex(nextLatex);
    }
  };

  const handleCancelAiProposal = () => {
    setAiProposal(null);
    // Revert the preview PDF back to the current editor LaTeX.
    // Without this, the viewer may keep showing the PDF compiled for the proposed LaTeX.
    triggerCompile();
  };

  const renderLatexPanel = ({ showClose }: { showClose: boolean }) => (
    <>
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="flex items-center space-x-2 text-sm font-medium text-gray-900">
          <Code className="h-4 w-4" />
          <span>main.tex</span>
        </h3>
        {showClose && (
          <button
            type="button"
            onClick={toggleLatexViewer}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            title="Hide LaTeX Editor"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <textarea
          value={latexContent}
          onChange={(e) => setLatexContent(e.target.value)}
          className="h-full min-h-[200px] w-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-gray-800 focus:outline-none"
          placeholder="Enter your LaTeX code here..."
          style={{ lineHeight: '1.6' }}
        />
      </div>
    </>
  );

  const renderPdfPanel = () => (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-gray-50">
      <div className="min-h-0 flex-1 overflow-hidden">
        <LatexToPdfViewer
          latex={latexForViewer}
          className="h-full"
          compileTrigger={compileTrigger}
        />
      </div>
    </div>
  );

  const renderChatPanel = ({ showClose }: { showClose: boolean }) => (
    <>
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="flex items-center space-x-2 text-sm font-medium text-gray-900">
          <Bot className="h-4 w-4" />
          <span>AI Assistant</span>
        </h3>
        {showClose && (
          <button
            type="button"
            onClick={toggleChat}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600"
            title="Hide Chat"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-4 flex-shrink-0">
          <p className="text-sm text-gray-600">Ask me to help with your task</p>
          <p className="mt-1 text-xs text-gray-500">Ask for LaTeX edits; confirm before applying changes</p>
        </div>

        <div ref={chatScrollRef} className="mb-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                <p className="mt-1 text-xs opacity-70">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {isAgentWorking && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-gray-100 px-3 py-2 text-gray-900">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600" />
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {aiProposal && (
          <div className="mb-4 flex-shrink-0 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-xs font-medium text-yellow-900">AI proposed an update</p>
            <p className="mt-1 text-sm font-medium text-yellow-900">Confirmation required</p>
            <p className="mt-2 whitespace-pre-wrap text-xs text-yellow-900 opacity-90">
              {aiProposal.assistantMessage}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleApplyAiProposal}
                disabled={isAgentWorking || isSaving}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply updated LaTeX
              </button>
              <button
                type="button"
                onClick={handleCancelAiProposal}
                disabled={isAgentWorking || isSaving}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleChatSubmit} className="flex-shrink-0 space-y-2">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Ask me to help with your task..."
            className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <button
            type="submit"
            disabled={!chatMessage.trim() || isAgentWorking}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Bot className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </>
  );

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
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white shadow-sm">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex min-h-[3.5rem] flex-col gap-2 py-2 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={handleBackToTasks}
                aria-label="Back to tasks"
                className="flex flex-shrink-0 items-center gap-2 rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Tasks</span>
              </button>
              <div className="hidden h-6 w-px bg-gray-300 sm:block" />
              {isEditingTitle ? (
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={async () => {
                    if (!taskId) return;
                    if (!isUuid(taskId)) {
                      setIsEditingTitle(false);
                      return;
                    }
                    const next = titleDraft.trim();
                    if (!next) {
                      setTitleDraft(taskTitle);
                      setIsEditingTitle(false);
                      return;
                    }
                    if (next === taskTitle) {
                      setIsEditingTitle(false);
                      return;
                    }

                    try {
                      const res = await apiClient.fetchWithAuth(
                        `${getApiBase()}/tasks/${taskId}`,
                        {
                          method: 'PUT',
                          body: JSON.stringify({ title: next }),
                        }
                      );
                      if (!res.ok) throw new Error(`HTTP ${res.status}`);
                      setTaskTitle(next);
                      setIsEditingTitle(false);
                    } catch (e) {
                      console.error('Error saving task title:', e);
                      setTitleDraft(taskTitle);
                      setIsEditingTitle(false);
                    }
                  }}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter') return;
                    (e.target as HTMLInputElement).blur();
                  }}
                  className="min-w-0 max-w-[calc(100vw-6rem)] rounded border border-gray-200 bg-transparent px-2 py-1 text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:max-w-md sm:text-xl"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTitleDraft(taskTitle || 'Untitled Task');
                    setIsEditingTitle(true);
                  }}
                  className="min-w-0 truncate text-left text-lg font-semibold text-gray-900 transition-colors hover:text-gray-700 sm:text-xl"
                  title="Click to edit title"
                >
                  {taskTitle?.trim() ? taskTitle : 'Untitled Task'}
                </button>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-1 sm:gap-3">
              <button
                type="button"
                onClick={handleButtonClick.bind(null, 'Undo')}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Undo"
              >
                <Undo className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleButtonClick.bind(null, 'Redo')}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                title="Redo"
              >
                <Redo className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => triggerCompile()}
                disabled={isAgentWorking || isSaving || !latexForViewer.trim()}
                className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                title="Compile LaTeX to PDF"
              >
                Compile
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMobileLayout ? (
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex flex-shrink-0 gap-1 border-b border-gray-200 bg-white px-2 py-2">
            {(['code', 'preview', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                className={`flex-1 rounded-md py-2 text-center text-xs font-medium sm:text-sm ${
                  mobileTab === tab
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'code' ? 'Editor' : tab === 'preview' ? 'Preview' : 'Chat'}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {mobileTab === 'code' && (
              <div className="flex min-h-0 flex-1 flex-col bg-white">{renderLatexPanel({ showClose: false })}</div>
            )}
            {mobileTab === 'preview' && (
              <div className="flex min-h-0 flex-1 flex-col">{renderPdfPanel()}</div>
            )}
            {mobileTab === 'chat' && (
              <div className="flex min-h-0 flex-1 flex-col bg-white">{renderChatPanel({ showClose: false })}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 bg-white">
          {isLatexViewerOpen && (
            <ResizablePanel
              side="left"
              initialWidth={leftPanelWidth}
              minWidth={250}
              maxWidth={window.innerWidth * 0.5}
              onWidthChange={setLeftPanelWidth}
              borderSide="right"
            >
              <div className="flex h-full min-h-0 flex-col">{renderLatexPanel({ showClose: true })}</div>
            </ResizablePanel>
          )}

          <div
            className={`min-h-0 flex-1 bg-gray-50 transition-all duration-150 ease-out ${
              isChatOpen ? 'min-w-0' : 'w-full'
            }`}
          >
            {renderPdfPanel()}
          </div>

          {isChatOpen && (
            <ResizablePanel
              side="right"
              initialWidth={rightPanelWidth}
              minWidth={200}
              maxWidth={window.innerWidth * 0.35}
              onWidthChange={setRightPanelWidth}
              borderSide="left"
            >
              <div className="flex h-full min-h-0 flex-col">{renderChatPanel({ showClose: true })}</div>
            </ResizablePanel>
          )}
        </div>
      )}

      {!isMobileLayout && !isLatexViewerOpen && (
        <button
          type="button"
          onClick={toggleLatexViewer}
          className="fixed bottom-6 left-6 rounded-full bg-blue-600 p-4 text-white shadow-lg transition-colors hover:bg-blue-700"
          title="Open LaTeX Editor"
        >
          <Code className="h-6 w-6" />
        </button>
      )}

      {!isMobileLayout && !isChatOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className="fixed bottom-6 right-6 rounded-full bg-blue-600 p-4 text-white shadow-lg transition-colors hover:bg-blue-700"
          title="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default TaskEditor;
