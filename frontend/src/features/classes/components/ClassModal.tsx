import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient, Class } from '../../../utils/apiClient';
import { Button } from '../../../components/ui';

interface ClassModalProps {
  isOpen: boolean;
  classData?: Class | null;
  onClose: () => void;
  onSave: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, classData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (classData) {
        // Edit mode
        setFormData({
          name: classData.name,
          description: classData.description || ''
        });
      } else {
        // Add mode
        setFormData({
          name: '',
          description: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, classData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check if user is authenticated
      if (!apiClient.isAuthenticated()) {
        throw new Error('You must be logged in to create classes. Please log in as a teacher.');
      }

      console.log('Creating class with data:', formData);
      
      if (classData) {
        // Update existing class
        await apiClient.updateClass(classData.id, formData);
      } else {
        // Create new class
        await apiClient.createClass(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving class:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save class. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!classData) return;
    
    if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.deleteClass(classData.id);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error deleting class:', error);
      setErrors({ submit: 'Failed to delete class. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {classData ? 'Edit Class' : 'Add New Class'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Class Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter class name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter class description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {classData && (
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                >
                  Delete
                </Button>
              )}
            </div>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              {isLoading ? 'Saving...' : classData ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClassModal; 