import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Task, TaskElement, TaskVersion } from '../types/task';

interface TaskState {
  currentTask: Task | null;
  taskElements: TaskElement[];
  taskVersions: TaskVersion[];
  isLaTeXSidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

type TaskAction =
  | { type: 'SET_CURRENT_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> }
  | { type: 'SET_TASK_ELEMENTS'; payload: TaskElement[] }
  | { type: 'ADD_TASK_ELEMENT'; payload: TaskElement }
  | { type: 'UPDATE_TASK_ELEMENT'; payload: { id: string; updates: Partial<TaskElement> } }
  | { type: 'REMOVE_TASK_ELEMENT'; payload: string }
  | { type: 'SET_TASK_VERSIONS'; payload: TaskVersion[] }
  | { type: 'TOGGLE_LATEX_SIDEBAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialState: TaskState = {
  currentTask: null,
  taskElements: [],
  taskVersions: [],
  isLaTeXSidebarOpen: false,
  isLoading: false,
  error: null,
};

function taskReducer(state: TaskState, action: TaskAction): TaskState {
  switch (action.type) {
    case 'SET_CURRENT_TASK':
      return { ...state, currentTask: action.payload };
    
    case 'UPDATE_TASK':
      return {
        ...state,
        currentTask: state.currentTask ? { ...state.currentTask, ...action.payload } : null,
      };
    
    case 'SET_TASK_ELEMENTS':
      return { ...state, taskElements: action.payload };
    
    case 'ADD_TASK_ELEMENT':
      return { ...state, taskElements: [...state.taskElements, action.payload] };
    
    case 'UPDATE_TASK_ELEMENT':
      return {
        ...state,
        taskElements: state.taskElements.map(element =>
          element.id === action.payload.id
            ? { ...element, ...action.payload.updates }
            : element
        ),
      };
    
    case 'REMOVE_TASK_ELEMENT':
      return {
        ...state,
        taskElements: state.taskElements.filter(element => element.id !== action.payload),
      };
    
    case 'SET_TASK_VERSIONS':
      return { ...state, taskVersions: action.payload };
    
    case 'TOGGLE_LATEX_SIDEBAR':
      return { ...state, isLaTeXSidebarOpen: !state.isLaTeXSidebarOpen };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

interface TaskContextType {
  state: TaskState;
  dispatch: React.Dispatch<TaskAction>;
  // Convenience methods
  setCurrentTask: (task: Task) => void;
  updateTask: (updates: Partial<Task>) => void;
  toggleLaTeXSidebar: () => void;
  clearError: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);

  const setCurrentTask = (task: Task) => {
    dispatch({ type: 'SET_CURRENT_TASK', payload: task });
  };

  const updateTask = (updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: updates });
  };

  const toggleLaTeXSidebar = () => {
    dispatch({ type: 'TOGGLE_LATEX_SIDEBAR' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: TaskContextType = {
    state,
    dispatch,
    setCurrentTask,
    updateTask,
    toggleLaTeXSidebar,
    clearError,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
}
