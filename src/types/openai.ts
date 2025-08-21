import { Task, TaskContext } from './task';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  taskId?: string;
  taskContext?: TaskContext;
  responseType?: 'task_generation' | 'task_refinement' | 'general_chat';
}

export interface TaskGenerationRequest {
  prompt: string;
  context?: TaskContext;
  taskType?: string;
  difficultyLevel?: string;
  subjectArea?: string;
}

export interface TaskGenerationResponse {
  success: boolean;
  task: Task;
  latex: string;
  message: string;
  error?: string;
}

export interface TaskRefinementRequest {
  taskId: string;
  feedback: string;
  specificChanges?: string[];
}

export interface TaskRefinementResponse {
  success: boolean;
  updatedTask: Task;
  changes: string[];
  message: string;
  error?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: Message[];
  context: TaskContext;
  createdAt: Date;
  updatedAt: Date;
}

// TaskContext is imported from task.ts
