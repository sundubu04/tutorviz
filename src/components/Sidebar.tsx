import React from 'react';
import { 
  BookOpen, 
  Menu
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

interface SidebarProps {
  menuItems: MenuItem[];
  activeItem: string;
  onItemClick: (itemId: string) => void;
  onMobileToggle?: () => void;
  isMobileOpen?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  activeItem,
  onItemClick,
  onMobileToggle,
  isMobileOpen = false
}) => {
  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay lg:hidden"
          onClick={onMobileToggle}
        />
      )}
      
      {/* Sidebar */}
      <nav className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">TutoriAI</h2>
            </div>
            <button
              onClick={onMobileToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          {/* Menu Items */}
          <div className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onItemClick(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${activeItem === item.id 
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="w-5 h-5">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar; 