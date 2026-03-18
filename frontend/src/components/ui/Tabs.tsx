import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = ''
}) => {
  const baseClasses = 'flex space-x-1';
  
  const variantClasses = {
    default: 'border-b border-gray-200',
    pills: 'bg-gray-100 p-1 rounded-lg',
    underline: 'border-b border-gray-200'
  };
  
  const tabClasses = {
    default: 'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
    pills: 'px-3 py-2 text-sm font-medium rounded-md transition-colors',
    underline: 'px-4 py-2 text-sm font-medium border-b-2 transition-colors'
  };
  
  const activeClasses = {
    default: 'border-blue-500 text-blue-600',
    pills: 'bg-white text-gray-900 shadow-sm',
    underline: 'border-blue-500 text-blue-600'
  };
  
  const inactiveClasses = {
    default: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    pills: 'text-gray-600 hover:text-gray-900',
    underline: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
  };
  
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            ${tabClasses[variant]}
            ${activeTab === tab.id ? activeClasses[variant] : inactiveClasses[variant]}
            flex items-center space-x-2
          `}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Tabs; 