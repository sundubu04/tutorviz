import React, { useState } from 'react';
import { useTask } from '../../../contexts/TaskContext';
import { Task } from '../../../types/task';

const TaskEditor: React.FC = () => {
  const { state, updateTask } = useTask();
  const { currentTask, isLoading } = state;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Mock LaTeX compilation service - will be replaced with actual API calls
  const mockLaTeXService = {
    compile: async (latexCode: string): Promise<any> => {
      // Simulate compilation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock compiled content
      return {
        success: true,
        html: `<div class="compiled-content">
          <h1>${currentTask?.title || 'Generated Task'}</h1>
          <p>${currentTask?.description || 'Task description'}</p>
          <div class="task-content">
            <h2>Instructions</h2>
            <p>This is a sample compiled task. The LaTeX code has been processed and rendered.</p>
            <h2>Task Content</h2>
            <p>Here you would see the actual compiled content from your LaTeX code.</p>
          </div>
        </div>`,
        pdf: null, // Would contain PDF blob in real implementation
      };
    },
  };

  const handleEditStart = () => {
    if (currentTask) {
      setEditTitle(currentTask.title);
      setEditDescription(currentTask.description || '');
      setIsEditing(true);
    }
  };

  const handleEditSave = async () => {
    if (currentTask) {
      const updates: Partial<Task> = {
        title: editTitle,
        description: editDescription,
        updatedAt: new Date(),
      };

      // Mock API call - will be replaced with actual API
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update local state
        updateTask(updates);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update task:', error);
        // In real implementation, show error message to user
      }
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    if (currentTask) {
      setEditTitle(currentTask.title);
      setEditDescription(currentTask.description || '');
    }
  };

  const handleCompileLaTeX = async () => {
    if (!currentTask?.latexContent) return;

    try {
      const result = await mockLaTeXService.compile(currentTask.latexContent);
      
      if (result.success) {
        // Update task with compiled content
        updateTask({
          compiledContent: result.html,
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('LaTeX compilation failed:', error);
      // In real implementation, show error message to user
    }
  };

  const handleExportPDF = async () => {
    if (!currentTask) return;

    // Mock PDF export - will be replaced with actual API
    try {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would trigger PDF download
      console.log('PDF export completed');
      
      // Show success message
      alert('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF export failed. Please try again.');
    }
  };

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Task Selected</h3>
          <p className="text-gray-600">Start a conversation with the AI assistant to create your first task!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Task Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-2xl font-bold text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task title"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-gray-600 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Task description"
                  rows={3}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentTask.title}</h1>
                <p className="text-gray-600 mb-4">{currentTask.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Version {currentTask.version}</span>
                  <span>•</span>
                  <span>Created {currentTask.createdAt.toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="capitalize">{currentTask.status}</span>
                </div>
              </div>
            )}
          </div>
          
          {!isEditing && (
            <button
              onClick={handleEditStart}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Task Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Action Buttons */}
          <div className="flex space-x-3 mb-6">
            <button
              onClick={handleCompileLaTeX}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Compile LaTeX
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={!currentTask.compiledContent}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>

          {/* Compiled Content Display */}
          {currentTask.compiledContent ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compiled Task Preview</h3>
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: currentTask.compiledContent }}
              />
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Available</h3>
              <p className="text-gray-600 mb-4">Click "Compile LaTeX" to generate a preview of your task.</p>
              <button
                onClick={handleCompileLaTeX}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Compile LaTeX
              </button>
            </div>
          )}

          {/* LaTeX Source Code */}
          <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">LaTeX Source Code</h3>
            <pre className="text-sm text-gray-300 overflow-x-auto">
              <code>{currentTask.latexContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskEditor;
