import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiClient, CalendarEvent } from '../../../utils/apiClient';
import { useAuth } from '../../../contexts/AuthContext';

interface EventModalProps {
  isOpen: boolean;
  event?: CalendarEvent | null; // Event to edit (null for creation)
  onClose: () => void;
  onSave: () => void;
}

interface Class {
  id: string;
  name: string;
  description: string;
}

const EventModal: React.FC<EventModalProps> = ({ isOpen, event, onClose, onSave }) => {
  const { user, sessionResolved } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classId: '',
    eventType: 'other',
    date: '',
    startTime: '09:00',
    endTime: '10:00'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch classes when modal opens (now works for both authenticated and public users)
  useEffect(() => {
    if (isOpen) {
      fetchClasses();
    }
  }, [isOpen]);

  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      const response = await apiClient.getClasses();
      console.log('Classes response:', response);
      setClasses(response.classes);
      console.log('Classes set:', response.classes.length, 'classes');
    } catch (error) {
      console.error('Error fetching classes:', error);
      // If there's an error, set empty array
      setClasses([]);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (event) {
        // Edit mode - populate form with event data
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);
        
        setFormData({
          title: event.title,
          description: event.description || '',
          classId: event.classId || '',
          eventType: event.eventType,
          date: startDate.toISOString().split('T')[0],
          startTime: startDate.toTimeString().slice(0, 5),
          endTime: endDate.toTimeString().slice(0, 5)
        });
      } else {
        // Create mode - set default values
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        setFormData({
          title: '',
          description: '',
          classId: '',
          eventType: 'other',
          date: tomorrow.toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00'
        });
      }
      setErrors({});
    }
  }, [isOpen, event]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear classId when event type changes from 'class' to something else
      if (field === 'eventType' && value !== 'class' && prev.eventType === 'class') {
        newData.classId = '';
      }
      
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    // Validate that end time is after start time
    if (formData.startTime && formData.endTime) {
      const startTime = new Date(`2000-01-01T${formData.startTime}`);
      const endTime = new Date(`2000-01-01T${formData.endTime}`);
      
      if (startTime >= endTime) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!sessionResolved) {
      alert('Please wait while authentication is loading.');
      return;
    }

    // Check if user is authenticated
    if (!apiClient.isAuthenticated() || !user) {
      alert('Please log in to create events.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create start and end times
      const startDateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = `${formData.date}T${formData.endTime}:00`;

      // Validate ISO8601 format
      console.log('Start DateTime:', startDateTime);
      console.log('End DateTime:', endDateTime);
      console.log('Is valid start date:', !isNaN(new Date(startDateTime).getTime()));
      console.log('Is valid end date:', !isNaN(new Date(endDateTime).getTime()));

      const eventData: any = {
        title: formData.title.trim(),
        startTime: startDateTime,
        endTime: endDateTime,
        eventType: formData.eventType,
        isAllDay: false
      };

      // Only add optional fields if they have values
      if (formData.description.trim()) {
        eventData.description = formData.description.trim();
      }
      
      // Only include classId if event type is 'class' and classId is selected
      if (formData.eventType === 'class' && formData.classId) {
        eventData.classId = formData.classId;
      }


      
      if (event) {
        // Edit existing event
        await apiClient.updateEvent(event.id, eventData);
      } else {
        // Create new event
        await apiClient.createEvent(eventData);
      }
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      alert(`Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {event ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Title - Mandatory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Event title"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Event description (optional)"
            />
          </div>

          {/* Event Type - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type *
            </label>
            <select
              value={formData.eventType}
              onChange={(e) => handleInputChange('eventType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="class">Class</option>
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Class Choice - Only show when event type is 'class' */}
          {formData.eventType === 'class' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class - {classes.length} classes loaded
              </label>
              <select
                value={formData.classId}
                onChange={(e) => handleInputChange('classId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">Loading classes...</p>
              )}
            </div>
          )}

          {/* Date - Mandatory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="text-red-500 text-sm mt-1">{errors.date}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange('endTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.endTime && (
              <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
            )}
          </div>


        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>{event ? 'Update Event' : 'Create Event'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventModal; 