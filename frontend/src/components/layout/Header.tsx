import React from 'react';
import { Button } from '../ui';
import { Plus, LogIn, Bell, User, LogOut, Menu } from 'lucide-react';

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
  onSidebarToggle?: () => void;
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
  isAuthenticated,
  onSidebarToggle
}) => {
  return (
    <header className="header px-3 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="flex-shrink-0 rounded-lg p-2 text-white/90 transition-colors hover:bg-white/10"
              title="Toggle menu"
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="truncate text-lg font-semibold sm:text-2xl">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
          {onAddClass && (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={onAddClass}
              aria-label="Add class"
              className="bg-blue-600 px-2.5 hover:bg-blue-700 sm:px-4 [&>span:first-child]:mr-0 sm:[&>span:first-child]:mr-2"
            >
              <span className="hidden sm:inline">Add Class</span>
            </Button>
          )}

          {onJoinClass && (
            <Button
              variant="secondary"
              icon={<LogIn className="h-4 w-4" />}
              onClick={onJoinClass}
              aria-label="Join class"
              className="bg-white/20 px-2.5 hover:bg-white/30 sm:px-4 [&>span:first-child]:mr-0 sm:[&>span:first-child]:mr-2"
            >
              <span className="hidden sm:inline">Join Class</span>
            </Button>
          )}

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-initial sm:gap-3">
            {onNotifications && (
              <button
                onClick={onNotifications}
                className="rounded-lg p-2 text-white/90 transition-colors hover:bg-white/20"
                title="Notifications"
                type="button"
              >
                <Bell className="h-5 w-5" />
              </button>
            )}

            <div className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 sm:max-w-none sm:gap-2 sm:px-3 sm:py-2">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{userName}</span>
                {userRole && (
                  <span className="hidden text-xs capitalize text-gray-200 sm:block">
                    {userRole}
                  </span>
                )}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex-shrink-0 rounded p-1 text-white/90 transition-colors hover:bg-white/20"
                  title="Logout"
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
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