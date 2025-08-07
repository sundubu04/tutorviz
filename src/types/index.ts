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

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  className: string;
  classId: string;
  submissionCount?: number;
  submissionId?: string;
  submittedAt?: string;
  grade?: number;
  createdAt: string;
  topic?: string;
  attachments?: AssignmentAttachment[];
  assignedStudents?: string[];
}

export interface AssignmentAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

export interface CreateAssignmentData {
  title: string;
  description: string;
  classId: string;
  dueDate: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  topic: string;
  assignedStudents: string[];
  attachments: File[];
} 