import type { Todo, CreateTodoInput, UpdateTodoInput, TodoFilters } from '../types/Todo';

/**
 * Todo Store using Svelte 5 Runes
 */
class TodoStore {
  // State using $state rune
  todos = $state<Todo[]>([]);
  filters = $state<TodoFilters>({
    search: '',
    projects: [], // Empty = all
    priority: 'all',
    tags: [], // Empty = all
    assignee: 'all'
  });
  loading = $state(false);
  error = $state<string | null>(null);

  // Derived state using $derived rune
  filteredTodos = $derived.by(() => {
    let filtered = [...this.todos];

    // Search filter
    if (this.filters.search) {
      const searchLower = this.filters.search.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.text.toLowerCase().includes(searchLower) ||
        todo.description?.toLowerCase().includes(searchLower) ||
        todo.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Projects filter (empty array = all)
    if (this.filters.projects.length > 0) {
      filtered = filtered.filter(todo => this.filters.projects.includes(todo.project));
    }

    // Priority filter
    if (this.filters.priority !== 'all') {
      filtered = filtered.filter(todo => todo.priority === this.filters.priority);
    }

    // Tags filter (empty array = all)
    if (this.filters.tags.length > 0) {
      filtered = filtered.filter(todo =>
        todo.tags.some(tag => this.filters.tags.includes(tag))
      );
    }

    // Assignee filter
    if (this.filters.assignee !== 'all') {
      if (this.filters.assignee === 'unassigned') {
        filtered = filtered.filter(todo => !todo.assignee);
      } else {
        filtered = filtered.filter(todo => todo.assignee === this.filters.assignee);
      }
    }

    // Status filter (if provided)
    if (this.filters.status) {
      filtered = filtered.filter(todo => todo.status === this.filters.status);
    }

    return filtered;
  });

  columnTodos = $derived.by(() => {
    const filtered = this.filteredTodos;
    return {
      'todo': filtered.filter(t => t.status === 'todo'),
      'in-progress': filtered.filter(t => t.status === 'in-progress'),
      'blocked': filtered.filter(t => t.status === 'blocked'),
      'done': filtered.filter(t => t.status === 'done')
    };
  });

  statistics = $derived.by(() => {
    const total = this.todos.length;
    const byStatus = {
      'todo': this.todos.filter(t => t.status === 'todo').length,
      'in-progress': this.todos.filter(t => t.status === 'in-progress').length,
      'blocked': this.todos.filter(t => t.status === 'blocked').length,
      'done': this.todos.filter(t => t.status === 'done').length
    };
    const completionRate = total > 0
      ? Math.round((byStatus.done / total) * 10000) / 100
      : 0;

    return {
      total,
      byStatus,
      completionRate
    };
  });

  // API Methods
  async loadTodos(): Promise<void> {
    console.log('[TodoStore] loadTodos called');
    this.loading = true;
    this.error = null;

    try {
      console.log('[TodoStore] Fetching from /api/todos');
      const response = await fetch('/api/todos');
      console.log('[TodoStore] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[TodoStore] Data received:', { success: data.success, count: data.todos?.length });

      if (data.success) {
        this.todos = data.todos;
        console.log('[TodoStore] Todos set to:', this.todos.length, 'items');
      } else {
        throw new Error(data.error || 'Failed to load todos');
      }
    } catch (error: any) {
      this.error = `Failed to load todos: ${error.message}`;
      console.error('[TodoStore] Error loading todos:', error);
    } finally {
      this.loading = false;
      console.log('[TodoStore] Loading complete. Total todos:', this.todos.length);
    }
  }

  async createTodo(input: CreateTodoInput): Promise<void> {
    this.error = null;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.todos = [...this.todos, data.todo];
      } else {
        throw new Error(data.error || 'Failed to create todo');
      }
    } catch (error: any) {
      this.error = `Failed to create todo: ${error.message}`;
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  async updateTodo(id: string, updates: UpdateTodoInput): Promise<void> {
    this.error = null;

    // Optimistic update
    const originalTodo = this.todos.find(t => t.id === id);
    if (!originalTodo) return;

    const todoIndex = this.todos.findIndex(t => t.id === id);
    const updatedTodo = { ...originalTodo, ...updates };
    this.todos[todoIndex] = updatedTodo;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.todos[todoIndex] = data.todo;
      } else {
        throw new Error(data.error || 'Failed to update todo');
      }
    } catch (error: any) {
      // Rollback on error
      this.todos[todoIndex] = originalTodo;
      this.error = `Failed to update todo: ${error.message}`;
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async updateTodoStatus(id: string, status: Todo['status']): Promise<void> {
    this.error = null;

    // Optimistic update
    const originalTodo = this.todos.find(t => t.id === id);
    if (!originalTodo) return;

    const todoIndex = this.todos.findIndex(t => t.id === id);
    this.todos[todoIndex] = { ...originalTodo, status };

    try {
      const response = await fetch(`/api/todos/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.todos[todoIndex] = data.todo;
      } else {
        throw new Error(data.error || 'Failed to update todo status');
      }
    } catch (error: any) {
      // Rollback on error
      this.todos[todoIndex] = originalTodo;
      this.error = `Failed to update todo status: ${error.message}`;
      console.error('Error updating todo status:', error);
    }
  }

  async deleteTodo(id: string): Promise<void> {
    this.error = null;

    // Optimistic update
    const originalTodos = [...this.todos];
    this.todos = this.todos.filter(t => t.id !== id);

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete todo');
      }
    } catch (error: any) {
      // Rollback on error
      this.todos = originalTodos;
      this.error = `Failed to delete todo: ${error.message}`;
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  async completeTodo(id: string): Promise<void> {
    await this.updateTodoStatus(id, 'done');
  }

  async addComment(id: string, comment: string): Promise<void> {
    this.error = null;

    try {
      const response = await fetch(`/api/todos/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const todoIndex = this.todos.findIndex(t => t.id === id);
        if (todoIndex !== -1) {
          this.todos[todoIndex] = data.todo;
        }
      } else {
        throw new Error(data.error || 'Failed to add comment');
      }
    } catch (error: any) {
      this.error = `Failed to add comment: ${error.message}`;
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  // Filter Management
  setSearchFilter(search: string): void {
    this.filters.search = search;
  }

  setProjectsFilter(projects: string[]): void {
    this.filters.projects = projects;
  }

  setPriorityFilter(priority: string): void {
    this.filters.priority = priority;
  }

  setTagsFilter(tags: string[]): void {
    this.filters.tags = tags;
  }

  setAssigneeFilter(assignee: string): void {
    this.filters.assignee = assignee;
  }

  clearFilters(): void {
    this.filters = {
      search: '',
      projects: [],
      priority: 'all',
      tags: [],
      assignee: 'all'
    };
  }

  // Reset store (for testing)
  reset(): void {
    this.todos = [];
    this.filters = {
      search: '',
      projects: [],
      priority: 'all',
      tags: [],
      assignee: 'all'
    };
    this.loading = false;
    this.error = null;
  }
}

// Export singleton instance
export const todoStore = new TodoStore();