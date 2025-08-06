import React from 'react';
import { Bell, Folder, Users, FileText, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface ClassCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  studentCount: number;
  assignmentCount: number;
  onNotificationToggle?: () => void;
  onFilesClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const ClassCard: React.FC<ClassCardProps> = ({
  id,
  name,
  description,
  icon,
  iconColor,
  studentCount,
  assignmentCount,
  onNotificationToggle,
  onFilesClick,
  onEdit,
  onDelete,
  onClick
}) => {

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconColor} shadow-sm`}>
          {icon}
        </div>
        <div className="flex space-x-1">
          {onNotificationToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNotificationToggle();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Toggle notifications"
            >
              <Bell className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {onFilesClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFilesClick();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              title="View files"
            >
              <Folder className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-2 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Edit class"
            >
              <Edit className="w-4 h-4 text-blue-600" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 rounded-lg hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete class"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
        {name}
      </h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{studentCount} Students</span>
        </div>
        <div className="flex items-center space-x-1">
          <FileText className="w-4 h-4" />
          <span>{assignmentCount} Assignments</span>
        </div>
      </div>
    </div>
  );
};

export default ClassCard; 