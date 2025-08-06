import React, { useState, useEffect } from 'react';
import { X, BookOpen, Code, Monitor, FileCode, Cpu, Database, Globe, Calculator, Palette, Music, Camera, Heart, Zap, Star, Target } from 'lucide-react';
import { apiClient, Class } from '../utils/apiClient';
import Button from './Button';

interface ClassModalProps {
  isOpen: boolean;
  classData?: Class | null;
  onClose: () => void;
  onSave: () => void;
}

const ClassModal: React.FC<ClassModalProps> = ({ isOpen, classData, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    iconName: 'BookOpen',
    iconColor: 'bg-blue-500'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const iconOptions = [
    { name: 'BookOpen', icon: BookOpen, color: 'bg-blue-500' },
    { name: 'Code', icon: Code, color: 'bg-orange-500' },
    { name: 'Monitor', icon: Monitor, color: 'bg-purple-500' },
    { name: 'FileCode', icon: FileCode, color: 'bg-green-500' },
    { name: 'Cpu', icon: Cpu, color: 'bg-indigo-500' },
    { name: 'Database', icon: Database, color: 'bg-red-500' },
    { name: 'Globe', icon: Globe, color: 'bg-teal-500' },
    { name: 'Calculator', icon: Calculator, color: 'bg-yellow-500' },
    { name: 'Palette', icon: Palette, color: 'bg-pink-500' },
    { name: 'Music', icon: Music, color: 'bg-emerald-500' },
    { name: 'Camera', icon: Camera, color: 'bg-cyan-500' },
    { name: 'Heart', icon: Heart, color: 'bg-rose-500' },
    { name: 'Zap', icon: Zap, color: 'bg-amber-500' },
    { name: 'Star', icon: Star, color: 'bg-violet-500' },
    { name: 'Target', icon: Target, color: 'bg-slate-500' }
  ];

  const colorOptions = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-red-500', 'bg-indigo-500', 'bg-teal-500', 'bg-yellow-500',
    'bg-pink-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500',
    'bg-amber-500', 'bg-violet-500', 'bg-slate-500'
  ];

  useEffect(() => {
    if (isOpen) {
      if (classData) {
        // Edit mode
        setFormData({
          name: classData.name,
          description: classData.description,
          iconName: classData.iconName,
          iconColor: classData.iconColor
        });
      } else {
        // Add mode
        setFormData({
          name: '',
          description: '',
          iconName: 'BookOpen',
          iconColor: 'bg-blue-500'
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

          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Icon
            </label>
            <div className="grid grid-cols-5 gap-3">
              {iconOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => handleInputChange('iconName', option.name)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.iconName === option.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 ${option.color} rounded-lg flex items-center justify-center`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleInputChange('iconColor', color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.iconColor === color
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${color}`}
                />
              ))}
            </div>
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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