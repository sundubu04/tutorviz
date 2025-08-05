import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Classes from './components/Classes';
import TodoSidebar from './components/TodoSidebar';
import { 
  BookOpen, 
  FileText, 
  PlusSquare, 
  BarChart3, 
  Settings
} from 'lucide-react';
import { sampleClasses, sampleTodos } from './samples';
import './App.css';

const menuItems = [
  { id: 'classes', label: 'Classes', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'assignments', label: 'Assignments', icon: <FileText className="w-5 h-5" /> },
  { id: 'task-maker', label: 'Task Maker', icon: <PlusSquare className="w-5 h-5" /> },
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
];

function App() {
  const [activeMenuItem, setActiveMenuItem] = useState('classes');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTodoSidebarOpen, setIsTodoSidebarOpen] = useState(false);
  const [todos, setTodos] = useState(sampleTodos);

  const handleMenuItemClick = (itemId: string) => {
    setActiveMenuItem(itemId);
    setIsMobileMenuOpen(false);
  };

  const handleTodoToggle = (todoId: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleTodoDelete = (todoId: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  };

  const handleAddClass = () => {
    console.log('Add class clicked');
    // TODO: Implement add class modal
  };

  const handleJoinClass = () => {
    console.log('Join class clicked');
    // TODO: Implement join class modal
  };

  const handleNotifications = () => {
    console.log('Notifications clicked');
    // TODO: Implement notifications panel
  };

  const renderContent = () => {
    switch (activeMenuItem) {
      case 'classes':
        return (
          <Classes
            classes={sampleClasses}
            onClassClick={(classId) => console.log('Class clicked:', classId)}
            onNotificationToggle={(classId) => console.log('Notification toggled:', classId)}
            onFilesClick={(classId) => console.log('Files clicked:', classId)}
          />
        );
      case 'assignments':
        return (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Assignments</h3>
            <p className="text-gray-600">Assignment management coming soon...</p>
          </div>
        );
      case 'task-maker':
        return (
          <div className="text-center py-12">
            <PlusSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Task Maker</h3>
            <p className="text-gray-600">Task creation and management coming soon...</p>
          </div>
        );
      case 'overview':
        return (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Overview</h3>
            <p className="text-gray-600">Dashboard overview coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Settings</h3>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <div>Content not found</div>;
    }
  };

  const getPageTitle = () => {
    const menuItem = menuItems.find(item => item.id === activeMenuItem);
    return menuItem ? menuItem.label : 'Dashboard';
  };

  const shouldShowHeaderActions = activeMenuItem === 'classes';

  return (
    <div className="dashboard-container">
      <Sidebar
        menuItems={menuItems}
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileOpen={isMobileMenuOpen}
      />
      
      <div className="main-content">
        <Header
          title={getPageTitle()}
          onAddClass={shouldShowHeaderActions ? handleAddClass : undefined}
          onJoinClass={shouldShowHeaderActions ? handleJoinClass : undefined}
          onNotifications={handleNotifications}
          userName="John Doe"
        />
        
        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      <TodoSidebar
        todos={todos}
        isOpen={isTodoSidebarOpen}
        onToggle={() => setIsTodoSidebarOpen(!isTodoSidebarOpen)}
        onTodoToggle={handleTodoToggle}
        onTodoDelete={handleTodoDelete}
      />
    </div>
  );
}

export default App;
