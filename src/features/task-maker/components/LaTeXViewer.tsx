import React, { useState, useEffect } from 'react';
import { useTask } from '../../../contexts/TaskContext';

const LaTeXViewer: React.FC = () => {
  const { state, updateTask } = useTask();
  const { currentTask } = state;
  const [latexCode, setLatexCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [originalCode, setOriginalCode] = useState('');

  useEffect(() => {
    if (currentTask) {
      setLatexCode(currentTask.latexContent);
      setOriginalCode(currentTask.latexContent);
    }
  }, [currentTask]);

  // Mock LaTeX validation service - will be replaced with actual API calls
  const mockLaTeXService = {
    validate: async (code: string): Promise<any> => {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simple validation logic for demo
      const hasDocumentClass = code.includes('\\documentclass');
      const hasBeginDocument = code.includes('\\begin{document}');
      const hasEndDocument = code.includes('\\end{document}');
      
      return {
        success: hasDocumentClass && hasBeginDocument && hasEndDocument,
        errors: [],
        warnings: [],
        suggestions: hasDocumentClass && hasBeginDocument && hasEndDocument ? [] : [
          'Make sure to include \\documentclass{article}',
          'Ensure you have \\begin{document} and \\end{document}',
        ],
      };
    },
    
    format: async (code: string): Promise<any> => {
      // Simulate formatting delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Basic formatting for demo
      const formatted = code
        .replace(/\\begin\{([^}]+)\}/g, '\n\\begin{$1}')
        .replace(/\\end\{([^}]+)\}/g, '\\end{$1}\n')
        .replace(/\\section\{([^}]+)\}/g, '\n\\section{$1}')
        .replace(/\\subsection\{([^}]+)\}/g, '\n\\subsection{$1}');
      
      return {
        success: true,
        formattedCode: formatted,
      };
    },
  };

  const handleEditStart = () => {
    setIsEditing(true);
    setOriginalCode(latexCode);
  };

  const handleEditSave = async () => {
    if (!currentTask) return;

    try {
      // Validate LaTeX code
      const validation = await mockLaTeXService.validate(latexCode);
      
      if (validation.success) {
        // Update task with new LaTeX code
        updateTask({
          latexContent: latexCode,
          updatedAt: new Date(),
        });
        setIsEditing(false);
      } else {
        // Show validation errors
        alert(`LaTeX validation failed:\n${validation.suggestions.join('\n')}`);
      }
    } catch (error) {
      console.error('Failed to save LaTeX code:', error);
      alert('Failed to save LaTeX code. Please try again.');
    }
  };

  const handleEditCancel = () => {
    setLatexCode(originalCode);
    setIsEditing(false);
  };

  const handleFormatCode = async () => {
    try {
      const result = await mockLaTeXService.format(latexCode);
      
      if (result.success) {
        setLatexCode(result.formattedCode);
      }
    } catch (error) {
      console.error('Failed to format LaTeX code:', error);
      alert('Failed to format LaTeX code. Please try again.');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      alert('LaTeX code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = latexCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('LaTeX code copied to clipboard!');
    }
  };

  const handleValidateCode = async () => {
    try {
      const result = await mockLaTeXService.validate(latexCode);
      
      if (result.success) {
        alert('LaTeX code is valid! ✅');
      } else {
        alert(`LaTeX validation failed:\n${result.suggestions.join('\n')}`);
      }
    } catch (error) {
      console.error('LaTeX validation failed:', error);
      alert('Failed to validate LaTeX code. Please try again.');
    }
  };

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Selected</h3>
          <p className="text-gray-600">Select a task to view its LaTeX code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">LaTeX Code</h3>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={handleEditStart}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleEditSave}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex space-x-2">
          <button
            onClick={handleValidateCode}
            className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
            title="Validate LaTeX syntax"
          >
            <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Validate
          </button>
          
          <button
            onClick={handleFormatCode}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
            title="Format LaTeX code"
          >
            <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Format
          </button>
          
          <button
            onClick={handleCopyToClipboard}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-3 h-3 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
        </div>
      </div>

      {/* LaTeX Code Editor */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <textarea
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm text-gray-800 bg-white border-0 resize-none focus:outline-none focus:ring-0"
            placeholder="Enter your LaTeX code here..."
            spellCheck={false}
          />
        ) : (
          <div className="h-full overflow-auto">
            <pre className="p-4 font-mono text-sm text-gray-800 bg-white">
              <code>{latexCode}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        {isEditing ? (
          <span>Editing mode - Press Ctrl+S to save or use the Save button</span>
        ) : (
          <span>View mode - Click Edit to modify the LaTeX code</span>
        )}
      </div>
    </div>
  );
};

export default LaTeXViewer;
