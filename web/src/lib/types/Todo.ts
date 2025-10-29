export interface Todo {
  id: string;
  text: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project: string;
  tags: string[];
  assignee?: string;
  createdBy: string;
  createdAt: string;
  modifiedAt: string;
  dueDate?: string;
  completedAt?: string | null;
  dependencies: string[];
  subtasks: Subtask[];
  comments: Comment[];
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export interface CreateTodoInput {
  text: string;
  description?: string;
  project: string;
  priority?: Todo['priority'];
  status?: Todo['status'];
  tags?: string[];
  assignee?: string;
  dueDate?: string;
  dependencies?: string[];
}

export interface UpdateTodoInput {
  text?: string;
  description?: string;
  status?: Todo['status'];
  priority?: Todo['priority'];
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

export interface TodoFilters {
  search: string;
  project: string;
  priority: string;
  tags: Set<string>;
  assignee: string;
  status?: string;
}