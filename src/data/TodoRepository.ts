import * as fs from 'fs/promises';
import * as path from 'path';
import { Todo, createTodo, updateTodo, CreateTodoInput, UpdateTodoInput } from '../types/Todo';
import { GitManager } from '../git/GitManager';

export interface ListOptions {
  status?: Todo['status'];
  priority?: Todo['priority'];
  project?: string;
  assignee?: string;
  tags?: string[];
  sortBy?: 'priority' | 'createdAt' | 'modifiedAt' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

export interface TodoWithArchive extends Todo {
  archived?: boolean;
  archivedAt?: string;
}

/**
 * Repository for managing Todo CRUD operations
 */
export class TodoRepository {
  private todosFilePath: string;
  private gitManager: GitManager;
  private todos: TodoWithArchive[] = [];
  private initialized = false;

  constructor(repoPath: string, gitManager: GitManager) {
    this.todosFilePath = path.join(repoPath, 'todos.json');
    this.gitManager = gitManager;
  }

  /**
   * Initialize the repository
   */
  async initialize(): Promise<void> {
    try {
      // Check if todos.json exists
      await fs.access(this.todosFilePath);
      await this.loadTodos();
    } catch {
      // Create initial todos.json
      await this.gitManager.writeFileAtomic(
        this.todosFilePath,
        JSON.stringify({ todos: [] }, null, 2)
      );
      this.todos = [];
    }
    this.initialized = true;
  }

  /**
   * Load todos from file
   */
  private async loadTodos(): Promise<void> {
    const content = await fs.readFile(this.todosFilePath, 'utf-8');
    const data = JSON.parse(content);
    this.todos = data.todos || [];
  }

  /**
   * Save todos to file
   */
  private async saveTodos(): Promise<void> {
    await this.gitManager.writeFileAtomic(
      this.todosFilePath,
      JSON.stringify({ todos: this.todos }, null, 2)
    );
  }

  /**
   * Ensure repository is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Repository not initialized. Call initialize() first.');
    }
  }

  /**
   * Create a new todo
   */
  async create(input: CreateTodoInput): Promise<Todo> {
    this.ensureInitialized();

    const todo = createTodo(input);
    this.todos.push(todo);
    await this.saveTodos();

    return todo;
  }

  /**
   * Update an existing todo
   */
  async update(id: string, updates: UpdateTodoInput): Promise<Todo> {
    this.ensureInitialized();

    const index = this.todos.findIndex(t => t.id === id && !t.archived);
    if (index === -1) {
      throw new Error('Todo not found');
    }

    const updatedTodo = updateTodo(this.todos[index], updates);
    this.todos[index] = updatedTodo;
    await this.saveTodos();

    return updatedTodo;
  }

  /**
   * Get a todo by ID
   */
  async get(id: string): Promise<Todo> {
    this.ensureInitialized();

    const todo = this.todos.find(t => t.id === id && !t.archived);
    if (!todo) {
      throw new Error('Todo not found');
    }

    return todo;
  }

  /**
   * List todos with filters
   */
  async list(options: ListOptions = {}): Promise<Todo[]> {
    this.ensureInitialized();

    let filtered = this.todos.filter(t => options.includeArchived || !t.archived);

    // Apply filters
    if (options.status) {
      filtered = filtered.filter(t => t.status === options.status);
    }

    if (options.priority) {
      filtered = filtered.filter(t => t.priority === options.priority);
    }

    if (options.project) {
      filtered = filtered.filter(t => t.project === options.project);
    }

    if (options.assignee) {
      filtered = filtered.filter(t => t.assignee === options.assignee);
    }

    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(t =>
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Sort
    if (options.sortBy) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (options.sortBy) {
          case 'priority':
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            aVal = priorityOrder[a.priority];
            bVal = priorityOrder[b.priority];
            break;
          case 'createdAt':
          case 'modifiedAt':
          case 'dueDate':
            aVal = a[options.sortBy] ? new Date(a[options.sortBy]!).getTime() : Infinity;
            bVal = b[options.sortBy] ? new Date(b[options.sortBy]!).getTime() : Infinity;
            break;
          default:
            return 0;
        }

        const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return options.sortOrder === 'desc' ? -result : result;
      });
    }

    // Paginate
    if (options.offset !== undefined || options.limit !== undefined) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      filtered = filtered.slice(start, end);
    }

    return filtered;
  }

  /**
   * Delete (archive) a todo
   */
  async delete(id: string, hardDelete: boolean = false): Promise<void> {
    this.ensureInitialized();

    const index = this.todos.findIndex(t => t.id === id && !t.archived);
    if (index === -1) {
      throw new Error('Todo not found');
    }

    if (hardDelete) {
      this.todos.splice(index, 1);
    } else {
      // Soft delete - mark as archived
      this.todos[index] = {
        ...this.todos[index],
        archived: true,
        archivedAt: new Date().toISOString()
      };
    }

    await this.saveTodos();
  }

  /**
   * Search todos by text
   */
  async search(query: string): Promise<Todo[]> {
    this.ensureInitialized();

    const lowerQuery = query.toLowerCase();

    return this.todos.filter(t => {
      if (t.archived) return false;

      return (
        t.text.toLowerCase().includes(lowerQuery) ||
        (t.description && t.description.toLowerCase().includes(lowerQuery)) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Complete a todo
   */
  async complete(id: string): Promise<Todo> {
    return this.update(id, {
      status: 'done',
      completedAt: new Date().toISOString()
    });
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<Todo['status'], number>;
    byPriority: Record<Todo['priority'], number>;
    byProject: Record<string, number>;
    completed: number;
    completionRate: number;
  }> {
    this.ensureInitialized();

    const activeTodos = this.todos.filter(t => !t.archived);

    const stats = {
      total: activeTodos.length,
      byStatus: {
        'todo': 0,
        'in-progress': 0,
        'blocked': 0,
        'done': 0
      },
      byPriority: {
        'low': 0,
        'medium': 0,
        'high': 0,
        'urgent': 0
      },
      byProject: {} as Record<string, number>,
      completed: 0,
      completionRate: 0
    };

    for (const todo of activeTodos) {
      stats.byStatus[todo.status]++;
      stats.byPriority[todo.priority]++;

      if (!stats.byProject[todo.project]) {
        stats.byProject[todo.project] = 0;
      }
      stats.byProject[todo.project]++;

      if (todo.status === 'done') {
        stats.completed++;
      }
    }

    stats.completionRate = stats.total > 0
      ? (stats.completed / stats.total) * 100
      : 0;

    return stats;
  }

  /**
   * Reload todos from file (useful after sync)
   */
  async reload(): Promise<void> {
    await this.loadTodos();
  }

  /**
   * Get todos by project
   */
  async getByProject(project: string): Promise<Todo[]> {
    return this.list({ project });
  }

  /**
   * Get todos by assignee
   */
  async getByAssignee(assignee: string): Promise<Todo[]> {
    return this.list({ assignee });
  }

  /**
   * Get overdue todos
   */
  async getOverdue(): Promise<Todo[]> {
    this.ensureInitialized();

    const now = new Date();
    return this.todos.filter(t =>
      !t.archived &&
      t.dueDate &&
      new Date(t.dueDate) < now &&
      t.status !== 'done'
    );
  }

  /**
   * Get todos due today
   */
  async getDueToday(): Promise<Todo[]> {
    this.ensureInitialized();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.todos.filter(t =>
      !t.archived &&
      t.dueDate &&
      new Date(t.dueDate) >= today &&
      new Date(t.dueDate) < tomorrow
    );
  }

  /**
   * Get todos due this week
   */
  async getDueThisWeek(): Promise<Todo[]> {
    this.ensureInitialized();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return this.todos.filter(t =>
      !t.archived &&
      t.dueDate &&
      new Date(t.dueDate) >= today &&
      new Date(t.dueDate) < nextWeek
    );
  }
}