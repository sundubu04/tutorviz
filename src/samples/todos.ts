export interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate: string;
  urgent: boolean;
  class?: string;
}

export const sampleTodos: TodoItem[] = [
  {
    id: '1',
    title: 'Java Assignment 1',
    description: 'Due tomorrow at 23:59',
    completed: false,
    dueDate: '2024-03-15',
    urgent: true,
    class: 'Java Programming'
  },
  {
    id: '2',
    title: 'OS Quiz',
    description: 'Due in 2 days',
    completed: false,
    dueDate: '2024-03-17',
    urgent: false,
    class: 'Operating Systems'
  },
  {
    id: '3',
    title: 'Python Project',
    description: 'Due next week',
    completed: false,
    dueDate: '2024-03-22',
    urgent: false,
    class: 'Python Development'
  },
  {
    id: '4',
    title: 'C++ Assignment',
    description: 'Due in 3 days',
    completed: true,
    dueDate: '2024-03-18',
    urgent: false,
    class: 'C++ Programming'
  },
  {
    id: '5',
    title: 'Database Design',
    description: 'Due in 5 days',
    completed: false,
    dueDate: '2024-03-20',
    urgent: true,
    class: 'Database Systems'
  }
]; 