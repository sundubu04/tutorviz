import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, MoreVertical } from 'lucide-react';

const DEFAULT_LATEX_CONTENT = `\\documentclass{article}
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

\\end{document}`;

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoadingTasks(true);
        setTasksError(null);

        const token = localStorage.getItem('authToken');
        const res = await fetch('http://localhost:5001/api/tasks', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${errText}`.trim());
        }

        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setTasksError(e?.message || 'Failed to load tasks');
      } finally {
        setIsLoadingTasks(false);
      }
    };

    loadTasks();
  }, []);

  const createTaskAndNavigate = async (title: string) => {
    if (isCreatingTask) return;
    setIsCreatingTask(true);

    try {
      const token = localStorage.getItem('authToken');

      const res = await fetch('http://localhost:5001/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          description: '',
          content: DEFAULT_LATEX_CONTENT,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errText}`.trim());
      }

      const data = await res.json();
      const taskId = data?.id;
      if (!taskId || typeof taskId !== 'string') {
        throw new Error('Task creation succeeded but task id was missing');
      }

      navigate(`/task-editor/${taskId}`);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNewTask = () => {
    void createTaskAndNavigate('Untitled Task');
  };

  const handleDemoTaskClick = () => {
    void createTaskAndNavigate('Demo Project');
  };

  return (
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
          <h1 className="text-2xl font-bold text-gray-900">TaskMaker</h1>
        </div>
      </header>

      {/* Main Content - Google Docs Style */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Top Section */}
          <div className="mb-8"></div>

          {/* Tasks Grid - Google Docs Style */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Tasks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Demo Task Card */}
              <div
                onClick={handleDemoTaskClick}
                className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
                  <div className="h-full bg-white rounded shadow-sm p-3 text-xs text-gray-600 leading-relaxed">
                    <div className="font-semibold text-gray-800 mb-2">Demo Project</div>
                    <div className="space-y-1">
                      <div className="h-2 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-200 rounded w-1/2" />
                      <div className="h-2 bg-gray-200 rounded w-2/3" />
                      <div className="h-2 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="h-1.5 bg-blue-200 rounded w-full" />
                      <div className="h-1.5 bg-blue-200 rounded w-4/5" />
                    </div>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        Demo Task
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Created today</p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Task options menu');
                      }}
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <FileText className="w-3 h-3 mr-1" />
                      Task
                    </span>
                  </div>
                </div>
              </div>

              {isLoadingTasks ? null : tasks.map((task) => {
                const createdAt = task?.createdAt ? new Date(task.createdAt) : null;
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task-editor/${task.id}`)}
                    className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border-b border-gray-100">
                      <div className="h-full bg-white rounded shadow-sm p-3 text-xs text-gray-600 leading-relaxed">
                        <div className="font-semibold text-gray-800 mb-2">{task.title || 'Untitled'}</div>
                        <div className="space-y-1">
                          <div className="h-2 bg-gray-200 rounded w-3/4" />
                          <div className="h-2 bg-gray-200 rounded w-1/2" />
                        </div>
                        <div className="mt-3 space-y-1">
                          <div className="h-1.5 bg-blue-200 rounded w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {task.title || 'Untitled'}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {createdAt ? createdAt.toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('Task options menu');
                          }}
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <FileText className="w-3 h-3 mr-1" />
                          Task
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* New Task Placeholder Card */}
              <div 
                onClick={handleNewTask}
                className="group bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className="aspect-[3/4] flex flex-col items-center justify-center p-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <Plus className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 group-hover:text-blue-700 transition-colors text-center">
                    {isCreatingTask ? 'Creating...' : 'Create New Task'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Empty State for Additional Content */}
          {isLoadingTasks ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading tasks…</div>
          ) : tasksError ? (
            <div className="text-center py-8 text-red-600 text-sm">{tasksError}</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <FileText className="w-12 h-12 mx-auto" />
              </div>
              <p className="text-gray-500 text-sm">
                You have no saved tasks yet. Create your first task to get started.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;