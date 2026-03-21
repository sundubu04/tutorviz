import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Edit, Trash2, Clock, MapPin } from 'lucide-react';
import { apiClient, CalendarEvent } from '../../../utils/apiClient';
import EventModal from './EventModal';
import EventDetailModal from './EventDetailModal';
import { Button } from '../../../components/ui';

interface CalendarProps {
  refreshKey?: number; // Key to force refresh when assignments change
}

const Calendar: React.FC<CalendarProps> = ({ refreshKey }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the first day of the month and the number of days
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayIndex = firstDayOfMonth.getDay();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  useEffect(() => {
    fetchEvents();
  }, [currentDate, refreshKey]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
      
      const params = {
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString()
      };
      
      // Use public method if not authenticated
      const response = apiClient.isAuthenticated() 
        ? await apiClient.getEvents(params)
        : await apiClient.getEventsPublic(params);
      
      setEvents(response.events);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null); // Clear any selected event
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleEditEvent = () => {
    if (!selectedEvent) return;
    
    // Close detail modal and open edit modal
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        // Use public method if not authenticated
        if (apiClient.isAuthenticated()) {
          await apiClient.deleteEvent(selectedEvent.id);
        } else {
          await apiClient.deleteEventPublic(selectedEvent.id);
        }
        await fetchEvents();
        setIsDetailModalOpen(false);
        setSelectedEvent(null);
      } catch (err) {
        console.error('Error deleting event:', err);
        alert('Failed to delete event');
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedEvent(null);
  };

  const handleEventSaved = () => {
    fetchEvents();
    handleModalClose();
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === date.getMonth() && 
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'class': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assignment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'meeting': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchEvents}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      {/* Calendar Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:space-x-4 sm:gap-0">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
            >
              ›
            </Button>
          </div>
        </div>

        <Button onClick={handleCreateEvent} className="flex w-full items-center justify-center space-x-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          <span>Add Event</span>
        </Button>
      </div>

      {/* Calendar Grid — horizontal scroll on very narrow viewports */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <div className="min-w-[560px]">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {dayNames.map(day => (
            <div
              key={day}
              className="calendar-day-header px-3 py-2 text-center text-sm font-medium text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                           currentDate.getMonth() === new Date().getMonth() && 
                           currentDate.getFullYear() === new Date().getFullYear();
            
            return (
              <div
                key={index}
                className={`calendar-day-cell min-h-[120px] border-b border-r border-gray-200 p-2 ${
                  !day ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day}
                    </div>
                    
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                                                 <div
                           key={event.id}
                           className={`text-xs p-1 rounded border cursor-pointer truncate ${getEventTypeColor(event.eventType)}`}
                           onClick={() => handleEventClick(event)}
                           title={event.title}
                         >
                          <div className="font-medium truncate">{event.title}</div>
                          {!event.isAllDay && (
                            <div className="text-xs opacity-75">
                              {formatTime(event.startTime)}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

             {/* Event Modal */}
               <EventModal
          isOpen={isModalOpen}
          event={selectedEvent}
          onClose={handleModalClose}
          onSave={handleEventSaved}
        />

       {/* Event Detail Modal */}
       <EventDetailModal
         isOpen={isDetailModalOpen}
         event={selectedEvent}
         onClose={handleDetailModalClose}
         onEdit={handleEditEvent}
         onDelete={handleDeleteEvent}
       />
     </div>
   );
 };

export default Calendar; 