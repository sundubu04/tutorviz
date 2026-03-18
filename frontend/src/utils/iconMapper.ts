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

// Icon mapping with consistent naming
export const ICONS = {
  BookOpen,
  Code,
  Monitor,
  FileCode,
  Cpu,
  Database,
  Globe,
  Calculator,
  Palette,
  Music,
  Camera,
  Heart,
  Zap,
  Star,
  Target
} as const;

export type IconName = keyof typeof ICONS;

// Normalize icon name to handle different formats
const normalizeIconName = (iconName: string): IconName => {
  if (!iconName) return 'BookOpen';
  
  // If the icon name is already in PascalCase, return as is
  if (/^[A-Z][a-zA-Z]*$/.test(iconName) && iconName in ICONS) {
    return iconName as IconName;
  }
  
  // Convert kebab-case to PascalCase
  const normalized = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
    
  return (normalized in ICONS ? normalized : 'BookOpen') as IconName;
};

// Create icon element with default styling
export const createIconElement = (
  iconName: string, 
  className: string = "w-6 h-6 text-white"
): React.ReactNode => {
  const normalizedName = normalizeIconName(iconName);
  const IconComponent = ICONS[normalizedName];
  return React.createElement(IconComponent, { className });
};

// Get icon component directly (useful for custom rendering)
export const getIconComponent = (iconName: string): React.ComponentType<any> => {
  const normalizedName = normalizeIconName(iconName);
  return ICONS[normalizedName];
};

// Get all available icon names
export const getAvailableIconNames = (): IconName[] => {
  return Object.keys(ICONS) as IconName[];
}; 