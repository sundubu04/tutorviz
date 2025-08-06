import React from 'react';
import { 
  Code, 
  Monitor, 
  FileCode, 
  Cpu, 
  Database, 
  Globe,
  BookOpen,
  Calculator,
  Palette,
  Music,
  Camera,
  Heart,
  Zap,
  Star,
  Target
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  'BookOpen': BookOpen,
  'Code': Code,
  'Monitor': Monitor,
  'FileCode': FileCode,
  'Cpu': Cpu,
  'Database': Database,
  'Globe': Globe,
  'Calculator': Calculator,
  'Palette': Palette,
  'Music': Music,
  'Camera': Camera,
  'Heart': Heart,
  'Zap': Zap,
  'Star': Star,
  'Target': Target
};

const normalizeIconName = (iconName: string): string => {
  if (!iconName) return 'BookOpen';
  
  // Convert kebab-case to PascalCase
  return iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

export const getIconComponent = (iconName: string): React.ComponentType<any> => {
  const normalizedName = normalizeIconName(iconName);
  return iconMap[normalizedName] || BookOpen;
};

export const createIconElement = (iconName: string, className: string = "w-6 h-6 text-white"): React.ReactNode => {
  const IconComponent = getIconComponent(iconName);
  return React.createElement(IconComponent, { className });
}; 