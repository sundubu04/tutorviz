import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  File, 
  Calendar, 
  Tag,
  Trash2
} from 'lucide-react';
import { apiClient } from '../../../utils/apiClient';
import { type Assignment, type Class, type Student } from '../../../types';
import { Button } from '../../../components/ui';

interface AssignmentModalProps {
  isOpen: boolean;
  assignment: Assignment | null;
  classes: Class[];
  onClose: () => void;
  onSave: () => void;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  assignment,
  classes,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    dueDate: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    topic: '',
    assignedStudents: [] as string[],
    attachments: [] as File[]
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!assignment;

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened with assignment:', assignment);
      console.log('Is editing:', isEditing);
      
      if (assignment) {
        // Editing existing assignment
        let formattedDueDate = '';
        try {
          // Parse the ISO date string and extract just the date part (YYYY-MM-DD)
          // This avoids timezone issues by treating the date as UTC
          const isoDate = assignment.dueDate;
          if (isoDate && typeof isoDate === 'string') {
            // Extract the date part from ISO string (before the 'T')
            const datePart = isoDate.split('T')[0];
            if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              formattedDueDate = datePart;
            } else {
              // Fallback: parse as Date and format
              const dueDate = new Date(isoDate);
              if (!isNaN(dueDate.getTime())) {
                const year = dueDate.getFullYear();
                const month = String(dueDate.getMonth() + 1).padStart(2, '0');
                const day = String(dueDate.getDate()).padStart(2, '0');
                formattedDueDate = `${year}-${month}-${day}`;
              }
            }
          }
        } catch (error) {
          console.error('Error formatting due date:', error);
          formattedDueDate = '';
        }

        const formDataToSet = {
          title: assignment.title,
          description: assignment.description || '',
          classId: assignment.classId,
          dueDate: formattedDueDate,
          priority: assignment.priority,
          topic: assignment.topic || '',
          assignedStudents: assignment.assignedStudents || [],
          attachments: []
        };
        
        console.log('Setting form data for editing:', formDataToSet);
        setFormData(formDataToSet);
      } else {
        // Creating new assignment
        setFormData({
          title: '',
          description: '',
          classId: '',
          dueDate: '',
          priority: 'normal',
          topic: '',
          assignedStudents: [],
          attachments: []
        });
      }
      setErrors({});
    }
  }, [isOpen, assignment, isEditing]);

  useEffect(() => {
    if (formData.classId) {
      fetchStudentsForClass(formData.classId);
    } else {
      setStudents([]);
    }
  }, [formData.classId]);

  const fetchStudentsForClass = async (classId: string) => {
    try {
      const response = await apiClient.getClassStudents(classId);
      setStudents(response.students);
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to mock data if API is not implemented yet
      const mockStudents: Student[] = [
        { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' },
        { id: '3', firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@example.com' },
      ];
      setStudents(mockStudents);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedStudents: prev.assignedStudents.includes(studentId)
        ? prev.assignedStudents.filter(id => id !== studentId)
        : [...prev.assignedStudents, studentId]
    }));
  };

  const selectAllStudents = () => {
    setFormData(prev => ({
      ...prev,
      assignedStudents: students.map(student => student.id)
    }));
  };

  const deselectAllStudents = () => {
    setFormData(prev => ({
      ...prev,
      assignedStudents: []
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.classId) {
      newErrors.classId = 'Please select a class';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
      
      if (selectedDate < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (!formData.topic.trim()) {
      newErrors.topic = 'Topic is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Handle file uploads first if there are any
      if (formData.attachments.length > 0) {
        console.log(`📎 [ASSIGNMENTS] Uploading ${formData.attachments.length} files`);
        
        // For now, we'll simulate file uploads since we need to implement actual file storage
        // See apiClient.ts for detailed specifications on choosing a storage service:
        // - AWS S3 (recommended for production)
        // - Cloudinary (recommended for ease of use)
        // - Firebase Storage (good for Google ecosystem)
        // - Supabase Storage (good for PostgreSQL users)
        // - Local Storage (development only)
        for (const file of formData.attachments) {
          console.log(`📎 [ASSIGNMENTS] File: ${file.name} (${file.size} bytes, ${file.type})`);
          // TODO: Implement actual file upload to storage service
          // const uploadResult = await uploadFileToStorage(file);
          // Then save the file URL to the assignment
        }
      }

      if (isEditing && assignment) {
        console.log('Updating assignment with data:', {
          title: formData.title,
          description: formData.description,
          dueDate: new Date(formData.dueDate + 'T12:00:00Z').toISOString(),
          priority: formData.priority,
          topic: formData.topic,
          assignedStudents: formData.assignedStudents
        });

        const result = await apiClient.updateAssignment(assignment.id, {
          title: formData.title,
          description: formData.description,
          dueDate: new Date(formData.dueDate + 'T12:00:00Z').toISOString(),
          priority: formData.priority,
          topic: formData.topic,
          assignedStudents: formData.assignedStudents
        });

        console.log('Assignment update result:', result);

        // Upload new attachments for existing assignment
        if (formData.attachments.length > 0) {
          console.log(`📎 [ASSIGNMENTS] Updating assignment, uploading ${formData.attachments.length} new attachments`);
          for (const file of formData.attachments) {
            try {
              const uploadResult = await apiClient.uploadAssignmentAttachment(assignment.id, file);
              console.log(`✅ [ASSIGNMENTS] File uploaded: ${uploadResult.attachment.name}`);
            } catch (error) {
              console.error(`❌ [ASSIGNMENTS] File upload failed: ${file.name}`, error);
            }
          }
        }
      } else {
        console.log('Creating new assignment with data:', {
          title: formData.title,
          description: formData.description,
          classId: formData.classId,
          dueDate: new Date(formData.dueDate + 'T12:00:00Z').toISOString(),
          priority: formData.priority,
          topic: formData.topic,
          assignedStudents: formData.assignedStudents
        });

        const result = await apiClient.createAssignment({
          title: formData.title,
          description: formData.description,
          classId: formData.classId,
          dueDate: new Date(formData.dueDate + 'T12:00:00Z').toISOString(),
          priority: formData.priority,
          topic: formData.topic,
          assignedStudents: formData.assignedStudents
        });

        console.log('Assignment creation result:', result);

        // After creating the assignment, upload attachments if any
        if (formData.attachments.length > 0 && result.assignment) {
          console.log(`📎 [ASSIGNMENTS] Assignment created, now uploading ${formData.attachments.length} attachments`);
          for (const file of formData.attachments) {
            try {
              const uploadResult = await apiClient.uploadAssignmentAttachment(result.assignment.id, file);
              console.log(`✅ [ASSIGNMENTS] File uploaded: ${uploadResult.attachment.name}`);
            } catch (error) {
              console.error(`❌ [ASSIGNMENTS] File upload failed: ${file.name}`, error);
            }
          }
        }
      }
      
      onSave();
    } catch (error) {
      console.error('Error saving assignment:', error);
      alert('Failed to save assignment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Assignment' : 'Create New Assignment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter assignment title"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                value={formData.classId}
                onChange={(e) => handleInputChange('classId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.classId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="mt-1 text-sm text-red-600">{errors.classId}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter assignment description..."
            />
          </div>

          {/* Topic and Due Date */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => handleInputChange('topic', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.topic ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Mathematics, Science, History"
                />
              </div>
              {errors.topic && (
                <p className="mt-1 text-sm text-red-600">{errors.topic}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dueDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
              )}
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low Priority</option>
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Student Assignment */}
          {formData.classId && students.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Assign to Students
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllStudents}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop files here, or click to select files
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 cursor-pointer"
              >
                Choose Files
              </label>
            </div>

            {/* File List */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? 'Update Assignment' : 'Create Assignment'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentModal; 