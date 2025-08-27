import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import { Classes, ClassModal } from './features/classes';
import { Calendar } from './features/calendar';
import { Assignments } from './features/assignments';
import { TodoSidebar } from './features/todos';
import TasksPage from './pages/TasksPage';
import TaskEditor from './pages/TaskEditor';
import { AuthWrapper } from './features/auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// TaskProvider removed
import { 
  BookOpen, 
  FileText, 
  PlusSquare,
  BarChart3, 
  Settings,
  Calendar as CalendarIcon
} from 'lucide-react';
import { apiClient } from './utils/apiClient';
import { type Class, type TodoItem } from './types';
import { classesService } from './services';
import { type Class as ApiClass } from './utils/apiClient';
import './App.css';

const menuItems = [
  { id: 'classes', label: 'Classes', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-5 h-5" /> },
  { id: 'assignments', label: 'Assignments', icon: <FileText className="w-5 h-5" /> },
  { id: 'taskmaker', label: 'TaskMaker', icon: <PlusSquare className="w-5 h-5" /> },
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
];

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState('classes');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTodoSidebarOpen, setIsTodoSidebarOpen] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ApiClass | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0); // Key to force calendar refresh

  // Fetch classes and assignments
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch classes using the service
      const apiClasses = await classesService.fetchClasses();
      setClasses(apiClasses);

      // Fetch assignments as todos
      const assignmentsResponse = await apiClient.getAssignments();
      const assignmentTodos: TodoItem[] = assignmentsResponse.assignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        description: `Due ${new Date(assignment.dueDate).toLocaleDateString()}`,
        completed: false, // TODO: Get actual completion status from API
        dueDate: assignment.dueDate,
        urgent: assignment.priority === 'urgent' || assignment.priority === 'high',
        class: assignment.className
      }));
      setTodos(assignmentTodos);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error
      setClasses([]);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch classes and assignments on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleMenuItemClick = (itemId: string) => {
    if (itemId === 'taskmaker') {
      // Navigate to tasks page instead of rendering it in dashboard
      navigate('/tasks');
      return;
    }
    setActiveMenuItem(itemId);
    setIsMobileMenuOpen(false);
  };

  const handleTodoToggle = (todoId: string) => {
    setTodos((prev: TodoItem[]) => prev.map((todo: TodoItem) => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleTodoDelete = (todoId: string) => {
    setTodos((prev: TodoItem[]) => prev.filter((todo: TodoItem) => todo.id !== todoId));
  };

  const handleAssignmentChange = () => {
    // Force calendar refresh when assignments change
    setCalendarRefreshKey(prev => prev + 1);
    // Also refresh todos since they include assignments
    fetchData();
  };

  const handleAddClass = () => {
    const accessValidation = classesService.validateClassAccess(user?.role);
    if (!accessValidation.canAccess) {
      alert(accessValidation.message);
      return;
    }
    
    setEditingClass(null);
    setIsClassModalOpen(true);
  };

  const handleEditClass = (classData: Class) => {
    // Convert Class type to ApiClass type for editing using the service
    const apiClass = classesService.convertClassToApiClass(classData);
    setEditingClass(apiClass);
    setIsClassModalOpen(true);
  };

  const handleDeleteClass = async (classId: string) => {
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    try {
      await classesService.deleteClass(classId);
      // Refresh classes after deletion
      const apiClasses = await classesService.fetchClasses();
      setClasses(apiClasses);
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class. Please try again.');
    }
  };

  const handleClassModalSave = async () => {
    // Refresh classes after save
    try {
      const apiClasses = await classesService.fetchClasses();
      setClasses(apiClasses);
    } catch (error) {
      console.error('Error refreshing classes:', error);
    }
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
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    switch (activeMenuItem) {
      case 'classes':
        return (
          <Classes
            classes={classes}
            onClassClick={(classId) => console.log('Class clicked:', classId)}
            onNotificationToggle={(classId) => console.log('Notification toggled:', classId)}
            onFilesClick={(classId) => console.log('Files clicked:', classId)}
            onEditClass={handleEditClass}
            onDeleteClass={handleDeleteClass}
          />
        );
      case 'calendar':
        return <Calendar refreshKey={calendarRefreshKey} />;
      case 'assignments':
        return <Assignments userRole={user?.role || 'student'} onAssignmentChange={handleAssignmentChange} />;
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

  const shouldShowHeaderActions = activeMenuItem === 'classes' || activeMenuItem === 'calendar';

  return (
    <div className="dashboard-container">
      <Sidebar
        menuItems={menuItems}
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileOpen={isMobileMenuOpen}
        isOpen={isSidebarOpen}
      />
      
      <div className={`main-content ${!isSidebarOpen ? 'sidebar-hidden' : ''}`}>
        <Header
          title={getPageTitle()}
          onAddClass={shouldShowHeaderActions ? handleAddClass : undefined}
          onJoinClass={shouldShowHeaderActions ? handleJoinClass : undefined}
          onNotifications={handleNotifications}
          onLogout={logout}
          userName={`${user?.firstName} ${user?.lastName}`}
          userRole={user?.role}
          isAuthenticated={apiClient.isAuthenticated()}
          onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
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

      <ClassModal
        isOpen={isClassModalOpen}
        classData={editingClass}
        onClose={() => setIsClassModalOpen(false)}
        onSave={handleClassModalSave}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
              <Router>
          <AuthWrapper>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/task-editor/:taskId" element={<TaskEditor />} />
            </Routes>
          </AuthWrapper>
        </Router>
    </AuthProvider>
  );
}

export default App;
