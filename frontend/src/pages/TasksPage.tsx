import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, MoreVertical } from 'lucide-react';
import { getApiBase } from '../config/api';

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
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<{ id: string; title: string } | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  const fetchTasks = async (): Promise<any[]> => {
    try {
      setIsLoadingTasks(true);
      setTasksError(null);

      const token = localStorage.getItem('authToken');
      const res = await fetch(`${getApiBase()}/tasks`, {
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
      const nextTasks = Array.isArray(data) ? data : [];
      // Hide any legacy demo tasks created by earlier UI versions.
      const filteredTasks = nextTasks.filter((t) => t?.title !== 'Demo Project');
      setTasks(filteredTasks);
      return filteredTasks;
    } catch (e: any) {
      setTasksError(e?.message || 'Failed to load tasks');
      return [];
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    void fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!openMenuTaskId) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!optionsMenuRef.current) return;
      if (!optionsMenuRef.current.contains(target)) {
        setOpenMenuTaskId(null);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openMenuTaskId]);

  const startEditTitle = (task: any) => {
    setOpenMenuTaskId(null);
    setEditingTask({ id: task.id, title: task.title || '' });
    setEditingTitle(task.title || '');
  };

  const submitEditTitle = async () => {
    if (!editingTask) return;
    const nextTitle = editingTitle.trim();
    if (!nextTitle) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${getApiBase()}/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errText}`.trim());
      }

      setEditingTask(null);
      setEditingTitle('');
      await fetchTasks();
    } catch (e: any) {
      alert(e?.message || 'Failed to update task title');
    }
  };

  const deleteTask = async (taskId: string) => {
    const confirmed = window.confirm('Delete this task? This will remove it from your list.');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${getApiBase()}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${errText}`.trim());
      }

      await fetchTasks();
    } catch (e: any) {
      alert(e?.message || 'Failed to delete task');
    } finally {
      setOpenMenuTaskId(null);
    }
  };

  const createTaskAndNavigate = async (title: string) => {
    if (isCreatingTask) return;
    setIsCreatingTask(true);

    try {
      const token = localStorage.getItem('authToken');

      const res = await fetch(`${getApiBase()}/tasks`, {
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
              {isLoadingTasks ? null : tasks.map((task) => {
                const createdAt = task?.createdAt ? new Date(task.createdAt) : null;
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task-editor/${task.id}`)}
                    className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden relative"
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
                            setOpenMenuTaskId((prev) => (prev === task.id ? null : task.id));
                          }}
                          aria-label="Task options"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>

                        {openMenuTaskId === task.id && (
                          <div
                            className="absolute mt-2 right-3 bg-white border border-gray-200 rounded-md shadow-sm z-10 w-40"
                            onClick={(e) => e.stopPropagation()}
                            ref={optionsMenuRef}
                          >
                            <button
                              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => startEditTitle(task)}
                              type="button"
                            >
                              Edit title
                            </button>
                            <button
                              className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                              onClick={() => deleteTask(task.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        )}
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

          {editingTask && (
            <div
              className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
              onClick={() => {
                setEditingTask(null);
                setEditingTitle('');
              }}
              role="dialog"
              aria-modal="true"
            >
              <div
                className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-base font-semibold text-gray-900">Edit Task Title</h2>
                <p className="text-sm text-gray-600 mt-1">This only updates the title.</p>

                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="mt-3 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => void submitEditTitle()}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null);
                      setEditingTitle('');
                    }}
                    className="flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksPage;