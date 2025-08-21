import React from 'react';
import { useTask } from '../../../contexts/TaskContext';
import ChatSidebar from './ChatSidebar';
import TaskEditor from './TaskEditor';
import LaTeXViewer from './LaTeXViewer';
import TaskToolbar from './TaskToolbar';

const TaskMaker: React.FC = () => {
  const { state, toggleLaTeXSidebar } = useTask();
  const { isLaTeXSidebarOpen } = state;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Task Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <TaskToolbar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* LaTeX Viewer Sidebar (Left) - Optional */}
        <div className={`transition-all duration-300 ease-in-out ${
          isLaTeXSidebarOpen 
            ? 'w-1/4 min-w-[300px]' 
            : 'w-0 min-w-0'
        }`}>
          {isLaTeXSidebarOpen && (
            <div className="h-full border-r border-gray-200 bg-white">
              <LaTeXViewer />
            </div>
          )}
        </div>

        {/* LaTeX Sidebar Toggle Button */}
        <button
          onClick={toggleLaTeXSidebar}
          className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-300 ${
            isLaTeXSidebarOpen 
              ? 'bg-blue-600 text-white left-[calc(25%-20px)]' 
              : 'bg-gray-600 text-white left-4'
          } hover:scale-110`}
          title={isLaTeXSidebarOpen ? 'Hide LaTeX Code' : 'Show LaTeX Code'}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isLaTeXSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            )}
          </svg>
        </button>

        {/* Task Editor (Center) - Dynamic Width */}
        <div className={`flex-1 transition-all duration-300 ease-in-out ${
          isLaTeXSidebarOpen ? 'ml-0' : 'ml-0'
        }`}>
          <div className="h-full bg-white">
            <TaskEditor />
          </div>
        </div>

        {/* Chat Sidebar (Right) - Fixed Width */}
        <div className="w-1/5 min-w-[280px] border-l border-gray-200 bg-white">
          <ChatSidebar />
        </div>
      </div>
    </div>
  );
};

export default TaskMaker;
