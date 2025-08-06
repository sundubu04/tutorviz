import React, { useState } from 'react';
import Tabs from './Tabs';
import ClassCard from './ClassCard';
import { Code } from 'lucide-react';
import { type Class } from '../types';

interface ClassesProps {
  classes: Class[];
  onClassClick?: (classId: string) => void;
  onNotificationToggle?: (classId: string) => void;
  onFilesClick?: (classId: string) => void;
  onEditClass?: (classData: Class) => void;
  onDeleteClass?: (classId: string) => void;
}

const Classes: React.FC<ClassesProps> = ({
  classes,
  onClassClick,
  onNotificationToggle,
  onFilesClick,
  onEditClass,
  onDeleteClass
}) => {
  const [activeTab, setActiveTab] = useState('enrolled');

  const tabs = [
    { id: 'enrolled', label: 'Enrolled to' },
    { id: 'teaching', label: 'Teaching' }
  ];

  const filteredClasses = classes.filter(cls => cls.type === activeTab);

  return (
    <div className="space-y-6">
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="default"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => (
          <ClassCard
            key={cls.id}
            id={cls.id}
            name={cls.name}
            description={cls.description}
            icon={cls.icon}
            iconColor={cls.iconColor}
            studentCount={cls.studentCount}
            assignmentCount={cls.assignmentCount}
            onNotificationToggle={() => onNotificationToggle?.(cls.id)}
            onFilesClick={() => onFilesClick?.(cls.id)}
            onEdit={() => onEditClass?.(cls)}
            onDelete={() => onDeleteClass?.(cls.id)}
            onClick={() => onClassClick?.(cls.id)}
          />
        ))}
      </div>
      
      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Code className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {activeTab === 'enrolled' ? 'enrolled' : 'teaching'} classes
          </h3>
          <p className="text-gray-600">
            {activeTab === 'enrolled' 
              ? 'You haven\'t enrolled in any classes yet.' 
              : 'You haven\'t created any classes yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Classes; 