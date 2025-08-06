import React from 'react';
import Button from './Button';
import { Plus, LogIn, Bell, User, LogOut } from 'lucide-react';

interface HeaderProps {
  title: string;
  onAddClass?: () => void;
  onJoinClass?: () => void;
  onNotifications?: () => void;
  onLogout?: () => void;
  userName?: string;
  userAvatar?: string;
  userRole?: string;
  isAuthenticated?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  onAddClass,
  onJoinClass,
  onNotifications,
  onLogout,
  userName = 'John',
  userAvatar,
  userRole,
  isAuthenticated
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
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
              <div className="flex flex-col">
                <span className="font-medium text-sm">{userName}</span>
                {userRole && (
                  <span className="text-xs text-gray-300 capitalize">{userRole}</span>
                )}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1 rounded hover:bg-white/20 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 