import React from 'react';
import { Code, Monitor, FileCode, Cpu, Database, Globe } from 'lucide-react';

export interface Class {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  studentCount: number;
  assignmentCount: number;
  type: 'enrolled' | 'teaching';
  progress?: number;
}

export const sampleClasses: Class[] = [
  {
    id: '1',
    name: 'Java Programming',
    description: 'Advanced Java concepts and object-oriented programming principles',
    icon: React.createElement(Code, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-orange-500',
    studentCount: 24,
    assignmentCount: 5,
    type: 'enrolled',
    progress: 75
  },
  {
    id: '2',
    name: 'Operating Systems',
    description: 'Understanding OS concepts, system architecture, and process management',
    icon: React.createElement(Monitor, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-blue-500',
    studentCount: 18,
    assignmentCount: 3,
    type: 'enrolled',
    progress: 60
  },
  {
    id: '3',
    name: 'Python Development',
    description: 'Python programming fundamentals and data science applications',
    icon: React.createElement(FileCode, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-green-500',
    studentCount: 22,
    assignmentCount: 7,
    type: 'teaching',
    progress: 85
  },
  {
    id: '4',
    name: 'C++ Programming',
    description: 'C++ fundamentals, memory management, and advanced programming concepts',
    icon: React.createElement(Cpu, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-purple-500',
    studentCount: 20,
    assignmentCount: 4,
    type: 'teaching',
    progress: 45
  },
  {
    id: '5',
    name: 'Database Systems',
    description: 'SQL, NoSQL databases, and data modeling principles',
    icon: React.createElement(Database, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-red-500',
    studentCount: 16,
    assignmentCount: 6,
    type: 'enrolled',
    progress: 30
  },
  {
    id: '6',
    name: 'Web Development',
    description: 'Modern web technologies, frameworks, and responsive design',
    icon: React.createElement(Globe, { className: "w-6 h-6 text-white" }),
    iconColor: 'bg-indigo-500',
    studentCount: 28,
    assignmentCount: 8,
    type: 'teaching',
    progress: 90
  }
]; 