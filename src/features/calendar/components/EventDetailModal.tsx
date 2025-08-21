import React from 'react';
import { X, Calendar, Clock, MapPin, BookOpen, User } from 'lucide-react';
import { CalendarEvent } from '../../../utils/apiClient';
import { Button } from '../../../components/ui';

interface EventDetailModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  isOpen, 
  event, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  if (!isOpen || !event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'class': return 'bg-blue-100 text-blue-800';
      case 'assignment': return 'bg-yellow-100 text-yellow-800';
      case 'exam': return 'bg-red-100 text-red-800';
      case 'meeting': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
      case 'class': return 'Class';
      case 'assignment': return 'Assignment';
      case 'exam': return 'Exam';
      case 'meeting': return 'Meeting';
      default: return 'Other';
    }
  };

  const getSubjectLabel = (subjectValue: string) => {
    const subjects = [
      // Group 1: Studies in Language and Literature
      { value: 'english-a-hl', label: 'English A: Literature HL' },
      { value: 'english-a-sl', label: 'English A: Literature SL' },
      { value: 'english-b-hl', label: 'English B HL' },
      { value: 'english-b-sl', label: 'English B SL' },
      
      // Group 2: Language Acquisition
      { value: 'spanish-b-hl', label: 'Spanish B HL' },
      { value: 'spanish-b-sl', label: 'Spanish B SL' },
      { value: 'french-b-hl', label: 'French B HL' },
      { value: 'french-b-sl', label: 'French B SL' },
      { value: 'mandarin-b-hl', label: 'Mandarin B HL' },
      { value: 'mandarin-b-sl', label: 'Mandarin B SL' },
      
      // Group 3: Individuals and Societies
      { value: 'history-hl', label: 'History HL' },
      { value: 'history-sl', label: 'History SL' },
      { value: 'economics-hl', label: 'Economics HL' },
      { value: 'economics-sl', label: 'Economics SL' },
      { value: 'geography-hl', label: 'Geography HL' },
      { value: 'geography-sl', label: 'Geography SL' },
      { value: 'psychology-hl', label: 'Psychology HL' },
      { value: 'psychology-sl', label: 'Psychology SL' },
      { value: 'business-hl', label: 'Business Management HL' },
      { value: 'business-sl', label: 'Business Management SL' },
      
      // Group 4: Sciences
      { value: 'biology-hl', label: 'Biology HL' },
      { value: 'biology-sl', label: 'Biology SL' },
      { value: 'chemistry-hl', label: 'Chemistry HL' },
      { value: 'chemistry-sl', label: 'Chemistry SL' },
      { value: 'physics-hl', label: 'Physics HL' },
      { value: 'physics-sl', label: 'Physics SL' },
      { value: 'computer-science-hl', label: 'Computer Science HL' },
      { value: 'computer-science-sl', label: 'Computer Science SL' },
      { value: 'environmental-systems-hl', label: 'Environmental Systems HL' },
      { value: 'environmental-systems-sl', label: 'Environmental Systems SL' },
      
      // Group 5: Mathematics
      { value: 'mathematics-aa-hl', label: 'Mathematics: Analysis and Approaches HL' },
      { value: 'mathematics-aa-sl', label: 'Mathematics: Analysis and Approaches SL' },
      { value: 'mathematics-ai-hl', label: 'Mathematics: Applications and Interpretation HL' },
      { value: 'mathematics-ai-sl', label: 'Mathematics: Applications and Interpretation SL' },
      
      // Group 6: The Arts
      { value: 'visual-arts-hl', label: 'Visual Arts HL' },
      { value: 'visual-arts-sl', label: 'Visual Arts SL' },
      { value: 'music-hl', label: 'Music HL' },
      { value: 'music-sl', label: 'Music SL' },
      { value: 'theatre-hl', label: 'Theatre HL' },
      { value: 'theatre-sl', label: 'Theatre SL' },
      
      // Core Components
      { value: 'tok', label: 'Theory of Knowledge (TOK)' },
      { value: 'cas', label: 'Creativity, Activity, Service (CAS)' },
      { value: 'ee', label: 'Extended Essay (EE)' }
    ];
    
    const subject = subjects.find(s => s.value === subjectValue);
    return subject ? subject.label : subjectValue;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Event Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {event.title}
            </h3>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
              {getEventTypeLabel(event.eventType)}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(event.startTime)}
                </p>
              </div>
            </div>

            {!event.isAllDay && (
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Time</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                  </p>
                </div>
              </div>
            )}

            {event.isAllDay && (
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Time</p>
                  <p className="text-sm text-gray-600">All day</p>
                </div>
              </div>
            )}

            {/* IB DP Subject */}
            {event.className && (
              <div className="flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">IB DP Subject</p>
                  <p className="text-sm text-gray-600">{getSubjectLabel(event.className)}</p>
                </div>
              </div>
            )}

            {/* Created By */}
            {event.createdBy && (
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Created by</p>
                  <p className="text-sm text-gray-600">
                    {event.createdBy.firstName} {event.createdBy.lastName}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onEdit}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal; 