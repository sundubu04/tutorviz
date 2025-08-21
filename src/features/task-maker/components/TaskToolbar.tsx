import React, { useState } from 'react';
import { useTask } from '../../../contexts/TaskContext';

const TaskToolbar: React.FC = () => {
  const { state } = useTask();
  const { currentTask } = state;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Mock services - will be replaced with actual API calls
  const mockTaskService = {
    saveTask: async (task: any): Promise<any> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Task saved successfully',
        taskId: task.id,
      };
    },
    
    publishTask: async (taskId: string): Promise<any> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Task published successfully',
      };
    },
    
    duplicateTask: async (taskId: string): Promise<any> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        message: 'Task duplicated successfully',
        newTaskId: `duplicate-${taskId}`,
      };
    },
    
    exportTask: async (taskId: string, format: string): Promise<any> => {
      // Simulate export delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        message: `Task exported as ${format} successfully`,
        downloadUrl: `/api/tasks/${taskId}/export/${format}`,
      };
    },
  };

  const handleSaveTask = async () => {
    if (!currentTask) return;

    try {
      const result = await mockTaskService.saveTask(currentTask);
      
      if (result.success) {
        alert(result.message);
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const handlePublishTask = async () => {
    if (!currentTask) return;

    try {
      const result = await mockTaskService.publishTask(currentTask.id);
      
      if (result.success) {
        alert(result.message);
        // In real implementation, update task status
      }
    } catch (error) {
      console.error('Failed to publish task:', error);
      alert('Failed to publish task. Please try again.');
    }
  };

  const handleDuplicateTask = async () => {
    if (!currentTask) return;

    try {
      const result = await mockTaskService.duplicateTask(currentTask.id);
      
      if (result.success) {
        alert(result.message);
        // In real implementation, navigate to duplicated task
      }
    } catch (error) {
      console.error('Failed to duplicate task:', error);
      alert('Failed to duplicate task. Please try again.');
    }
  };

  const handleExportTask = async (format: string) => {
    if (!currentTask) return;

    try {
      const result = await mockTaskService.exportTask(currentTask.id, format);
      
      if (result.success) {
        alert(result.message);
        // In real implementation, trigger download
        if (format === 'pdf') {
          // Simulate PDF download
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = `${currentTask.title}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Failed to export task:', error);
      alert('Failed to export task. Please try again.');
    }
  };

  const handleNewTask = () => {
    // In real implementation, this would create a new empty task
    alert('New task functionality will be implemented in Phase 2');
  };

  const handleOpenTask = () => {
    // In real implementation, this would open a file picker or task browser
    alert('Open task functionality will be implemented in Phase 2');
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Main Action Buttons */}
      <button
        onClick={handleNewTask}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Task
      </button>

      <button
        onClick={handleOpenTask}
        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        Open
      </button>

      {/* Task-specific Actions */}
      {currentTask && (
        <>
          <button
            onClick={handleSaveTask}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          <button
            onClick={handlePublishTask}
            disabled={currentTask.status === 'published'}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Publish
          </button>
        </>
      )}

      {/* Export Menu */}
      {currentTask && (
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
            <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    handleExportTask('pdf');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    handleExportTask('html');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as HTML
                </button>
                <button
                  onClick={() => {
                    handleExportTask('latex');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as LaTeX
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* More Actions Menu */}
      {currentTask && (
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    handleDuplicateTask();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Duplicate Task
                </button>
                <button
                  onClick={() => {
                    alert('Version history will be implemented in Phase 2');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Version History
                </button>
                <button
                  onClick={() => {
                    alert('Share functionality will be implemented in Phase 2');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Share Task
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      alert('Delete functionality will be implemented in Phase 2');
                    }
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete Task
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Menu */}
      <div className="ml-4">
        <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-sm font-medium">User</span>
        </button>
      </div>
    </div>
  );
};

export default TaskToolbar;
