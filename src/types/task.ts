export interface Task {
  id: string;
  title: string;
  description: string;
  latexContent: string;
  compiledContent: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  subjectArea?: string;
  estimatedTime?: number; // in minutes
}

export interface TaskElement {
  id: string;
  type: 'text' | 'math' | 'image' | 'table' | 'question';
  content: any;
  positionOrder: number;
  latexCode: string;
  elementMetadata?: Record<string, any>;
}

export interface TaskStructure {
  id: string;
  taskId: string;
  parentElementId?: string;
  elementId: string;
  structureType: 'section' | 'subsection' | 'question' | 'answer' | 'hint';
  level: number;
  sortOrder: number;
}

export interface TaskVersion {
  id: string;
  taskId: string;
  versionNumber: number;
  latexContent: string;
  compiledContent?: string;
  changeSummary?: string;
  createdBy: string;
  createdAt: Date;
}

export interface TaskContext {
  subjectArea?: string;
  difficultyLevel?: string;
  taskType?: string;
  gradeLevel?: string;
  learningObjectives?: string[];
}
