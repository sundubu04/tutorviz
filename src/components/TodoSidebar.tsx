import React, { useState } from 'react';
import { X, CheckCircle, Circle, Clock, BookOpen } from 'lucide-react';
import { type TodoItem } from '../types';

interface TodoSidebarProps {
  todos: TodoItem[];
  isOpen: boolean;
  onToggle: () => void;
  onTodoToggle?: (todoId: string) => void;
  onTodoDelete?: (todoId: string) => void;
}

// Todo Item Component
interface TodoItemProps {
  todo: TodoItem;
  onToggle: () => void;
  onDelete: () => void;
}

const TodoItemComponent: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete }) => {
  return (
    <div className={`
      p-4 rounded-lg border transition-colors
      ${todo.completed 
        ? 'bg-gray-50 border-gray-200' 
        : todo.urgent 
          ? 'bg-red-50 border-red-200' 
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }
    `}>
      <div className="flex items-start space-x-3">
        <button
          onClick={onToggle}
          className="flex-shrink-0 mt-0.5"
        >
          {todo.completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <h4 className={`
            text-sm font-medium mb-1
            ${todo.completed ? 'text-gray-500 line-through' : 'text-gray-900'}
          `}>
            {todo.title}
          </h4>
          <p className={`
            text-xs mb-2
            ${todo.completed ? 'text-gray-400' : 'text-gray-600'}
          `}>
            {todo.description}
          </p>
          {todo.class && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <BookOpen className="w-3 h-3" />
              <span>{todo.class}</span>
            </div>
          )}
        </div>
        
        <button
          onClick={onDelete}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
};

const TodoSidebar: React.FC<TodoSidebarProps> = ({
  todos,
  isOpen,
  onToggle,
  onTodoToggle,
  onTodoDelete
}) => {
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const urgentTodos = todos.filter(todo => todo.urgent);
  const completedTodos = todos.filter(todo => todo.completed);
  const pendingTodos = todos.filter(todo => !todo.completed);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          fixed right-6 bottom-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300
          ${isOpen ? 'bg-red-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}
        `}
      >
        <div className="relative">
          <Clock className="w-6 h-6" />
          {pendingTodos.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingTodos.length}
            </span>
          )}
        </div>
      </button>

      {/* Sidebar */}
      {isVisible && (
        <div
          className={`
            fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-40
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">To Do</h3>
                <p className="text-sm text-gray-500">{pendingTodos.length} pending tasks</p>
              </div>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {urgentTodos.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-red-600 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Urgent ({urgentTodos.length})
                  </h4>
                  <div className="space-y-3">
                    {urgentTodos.map((todo) => (
                      <TodoItemComponent
                        key={todo.id}
                        todo={todo}
                        onToggle={() => onTodoToggle?.(todo.id)}
                        onDelete={() => onTodoDelete?.(todo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {pendingTodos.filter(todo => !todo.urgent).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    Pending ({pendingTodos.filter(todo => !todo.urgent).length})
                  </h4>
                  <div className="space-y-3">
                    {pendingTodos.filter(todo => !todo.urgent).map((todo) => (
                      <TodoItemComponent
                        key={todo.id}
                        todo={todo}
                        onToggle={() => onTodoToggle?.(todo.id)}
                        onDelete={() => onTodoDelete?.(todo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {completedTodos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Completed ({completedTodos.length})
                  </h4>
                  <div className="space-y-3">
                    {completedTodos.map((todo) => (
                      <TodoItemComponent
                        key={todo.id}
                        todo={todo}
                        onToggle={() => onTodoToggle?.(todo.id)}
                        onDelete={() => onTodoDelete?.(todo.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {todos.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No todos yet!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TodoSidebar; 