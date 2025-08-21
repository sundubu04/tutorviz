import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TaskMaker } from '../features/task-maker';
import { TaskProvider } from '../contexts/TaskContext';

const TaskMakerPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <TaskProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header with back button */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Task Maker</h1>
          </div>
        </header>

        {/* TaskMaker Component */}
        <div className="h-[calc(100vh-80px)]">
          <TaskMaker />
        </div>
      </div>
    </TaskProvider>
  );
};

export default TaskMakerPage;
