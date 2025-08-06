import React from 'react';

export interface Class {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconName: string;
  iconColor: string;
  teacherName: string;
  studentCount: number;
  assignmentCount: number;
  type: 'enrolled' | 'teaching';
  createdAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
  urgent: boolean;
  class?: string;
} 