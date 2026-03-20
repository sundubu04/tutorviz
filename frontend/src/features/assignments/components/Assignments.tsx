import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  FileText, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Download,
  Eye
} from 'lucide-react';
import { apiClient, type Class as ApiClass } from '../../../utils/apiClient';
import { type Assignment, type Class } from '../../../types';
import AssignmentModal from './AssignmentModal';
import { Button } from '../../../components/ui';
import { Tabs } from '../../../components/ui';
import { createIconElement } from '../../../utils/iconMapper';

interface AssignmentsProps {
  userRole: 'student' | 'teacher' | 'admin';
  onAssignmentChange?: () => void; // Callback to notify parent of assignment changes
}

const Assignments: React.FC<AssignmentsProps> = ({ userRole, onAssignmentChange }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'createdAt'>('dueDate');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching assignments and classes...');
      
      const [assignmentsResponse, classesResponse] = await Promise.all([
        apiClient.getAssignments(),
        apiClient.getClasses()
      ]);
      
      console.log('Assignments response:', assignmentsResponse);
      console.log('Classes response:', classesResponse);
      
      setAssignments(assignmentsResponse.assignments);
      
      // Transform API classes to match the expected Class type
      const transformedClasses: Class[] = classesResponse.classes.map(apiClass => ({
        ...apiClass,
        icon: createIconElement(apiClass.iconName),
        iconName: apiClass.iconName,
        teacherName: apiClass.teacherName,
        createdAt: apiClass.createdAt
      }));
      setClasses(transformedClasses);
      
      console.log('State updated with assignments:', assignmentsResponse.assignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    setIsModalOpen(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setIsModalOpen(true);
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteAssignment(assignmentId);
      await fetchData();
      // Notify parent component that assignments have changed
      if (onAssignmentChange) {
        onAssignmentChange();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      alert('Failed to delete assignment. Please try again.');
    }
  };

  const handleModalSave = async () => {
    await fetchData();
    setIsModalOpen(false);
    // Notify parent component that assignments have changed
    if (onAssignmentChange) {
      onAssignmentChange();
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClass === 'all' || assignment.classId === filterClass;
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'urgent' && assignment.priority === 'urgent') ||
                      (activeTab === 'overdue' && new Date(assignment.dueDate) < new Date()) ||
                      (activeTab === 'upcoming' && new Date(assignment.dueDate) > new Date());

    return matchesSearch && matchesClass && matchesTab;
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'createdAt':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  const getStatusColor = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.submissionId) {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    
    if (dueDate < now) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    if (assignment.priority === 'urgent') {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    
    if (assignment.priority === 'high') {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    }
    
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  const getStatusText = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.submissionId) {
      return 'Submitted';
    }
    
    if (dueDate < now) {
      return 'Overdue';
    }
    
    return 'Active';
  };

  const getStatusIcon = (assignment: Assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (assignment.submissionId) {
      return <CheckCircle className="w-4 h-4" />;
    }
    
    if (dueDate < now) {
      return <AlertTriangle className="w-4 h-4" />;
    }
    
    return <Clock className="w-4 h-4" />;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="w-3 h-3" />;
      case 'high':
        return <AlertTriangle className="w-3 h-3" />;
      case 'low':
        return <Clock className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Assignments' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'upcoming', label: 'Upcoming' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Class Filter */}
          <div className="lg:w-48">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="lg:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'title' | 'createdAt')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="title">Sort by Title</option>
              <option value="createdAt">Sort by Created</option>
            </select>
          </div>

          {/* Create Assignment Button */}
          {(userRole === 'teacher' || userRole === 'admin') && (
            <div className="lg:w-auto">
              <Button
                onClick={handleCreateAssignment}
                className="flex items-center gap-2 w-full lg:w-auto"
              >
                <Plus className="w-4 h-4" />
                Create Assignment
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
      />

      {/* Assignments List */}
      <div className="space-y-4">
        {sortedAssignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">
              {searchTerm || filterClass !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'No assignments have been created yet'
              }
            </p>
          </div>
        ) : (
          sortedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {assignment.title}
                    </h3>
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(assignment)}`}>
                      {getStatusIcon(assignment)}
                      {getStatusText(assignment)}
                    </span>
                    {/* Priority Badge */}
                    {assignment.priority !== 'normal' && (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                        assignment.priority === 'urgent' 
                          ? 'bg-red-100 text-red-800 border-red-200' 
                          : assignment.priority === 'high'
                          ? 'bg-orange-100 text-orange-800 border-orange-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {getPriorityIcon(assignment.priority)}
                        {assignment.priority === 'urgent' ? 'Urgent' : 
                         assignment.priority === 'high' ? 'High Priority' : 
                         assignment.priority === 'low' ? 'Low Priority' : 'Normal'}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {assignment.description}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {assignment.className}
                    </div>
                    {assignment.submissionCount !== undefined && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {assignment.submissionCount} submissions
                      </div>
                    )}
                    {assignment.topic && (
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {assignment.topic}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => console.log('View assignment:', assignment.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View assignment"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {(userRole === 'teacher' || userRole === 'admin') && (
                    <>
                      <button
                        onClick={() => handleEditAssignment(assignment)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit assignment"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        assignment={editingAssignment}
        classes={classes}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default Assignments; 