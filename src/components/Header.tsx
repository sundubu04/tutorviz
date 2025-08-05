import React from 'react';
import Button from './Button';
import { Plus, LogIn, Bell, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  onAddClass?: () => void;
  onJoinClass?: () => void;
  onNotifications?: () => void;
  userName?: string;
  userAvatar?: string;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onAddClass,
  onJoinClass,
  onNotifications,
  userName = 'John',
  userAvatar
}) => {
  return (
    <header className="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {onAddClass && (
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={onAddClass}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Add Class
            </Button>
          )}
          
          {onJoinClass && (
            <Button
              variant="secondary"
              icon={<LogIn className="w-4 h-4" />}
              onClick={onJoinClass}
              className="bg-white/20 hover:bg-white/30"
            >
              Join Class
            </Button>
          )}
          
          <div className="flex items-center space-x-3">
            {onNotifications && (
              <button
                onClick={onNotifications}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg border border-white/20">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="font-medium">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 