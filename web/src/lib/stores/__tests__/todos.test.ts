import { describe, it, expect, beforeEach, vi } from 'vitest';
import { todoStore } from '../todos.svelte';
import type { Todo } from '../../types/Todo';

// Mock fetch globally
global.fetch = vi.fn();

describe('TodoStore with Svelte 5 Runes', () => {
  beforeEach(() => {
    // Reset store state
    todoStore.reset();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty todos', () => {
      expect(todoStore.todos).toEqual([]);
    });

    it('should initialize with default filters', () => {
      expect(todoStore.filters).toEqual({
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all'
      });
    });

    it('should have loading state as false initially', () => {
      expect(todoStore.loading).toBe(false);
    });

    it('should have no error initially', () => {
      expect(todoStore.error).toBeNull();
    });
  });

  describe('Filtering', () => {
    const mockTodos: Todo[] = [
      {
        id: '1',
        text: 'First todo',
        status: 'todo',
        priority: 'high',
        project: 'frontend',
        tags: ['bug', 'urgent'],
        assignee: 'john',
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '2',
        text: 'Second item',
        status: 'in-progress',
        priority: 'medium',
        project: 'backend',
        tags: ['feature'],
        assignee: 'jane',
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '3',
        text: 'Third todo',
        status: 'done',
        priority: 'low',
        project: 'frontend',
        tags: ['docs'],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      }
    ];

    beforeEach(() => {
      todoStore.todos = mockTodos;
    });

    it('should filter todos by search text', () => {
      todoStore.filters.search = 'first';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter todos by priority', () => {
      todoStore.filters.priority = 'high';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe('high');
    });

    it('should filter todos by project', () => {
      todoStore.filters.project = 'frontend';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.project === 'frontend')).toBe(true);
    });

    it('should filter todos by multiple tags', () => {
      todoStore.filters.tags = new Set(['bug', 'feature']);
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(2);
    });

    it('should filter todos by assignee', () => {
      todoStore.filters.assignee = 'john';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].assignee).toBe('john');
    });

    it('should apply multiple filters simultaneously', () => {
      todoStore.filters.project = 'frontend';
      todoStore.filters.priority = 'high';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should show all todos when filters are set to "all"', () => {
      todoStore.filters.project = 'all';
      todoStore.filters.priority = 'all';
      todoStore.filters.tags = new Set(['all']);
      todoStore.filters.assignee = 'all';
      const filtered = todoStore.filteredTodos;
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Column Grouping', () => {
    const mockTodos: Todo[] = [
      {
        id: '1',
        text: 'Todo 1',
        status: 'todo',
        priority: 'high',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '2',
        text: 'Todo 2',
        status: 'todo',
        priority: 'medium',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '3',
        text: 'In Progress 1',
        status: 'in-progress',
        priority: 'high',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '4',
        text: 'Blocked 1',
        status: 'blocked',
        priority: 'urgent',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      },
      {
        id: '5',
        text: 'Done 1',
        status: 'done',
        priority: 'low',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      }
    ];

    beforeEach(() => {
      todoStore.todos = mockTodos;
    });

    it('should group todos by status columns', () => {
      const columns = todoStore.columnTodos;
      expect(columns.todo).toHaveLength(2);
      expect(columns['in-progress']).toHaveLength(1);
      expect(columns.blocked).toHaveLength(1);
      expect(columns.done).toHaveLength(1);
    });

    it('should apply filters to column grouping', () => {
      todoStore.filters.priority = 'high';
      const columns = todoStore.columnTodos;
      expect(columns.todo).toHaveLength(1);
      expect(columns['in-progress']).toHaveLength(1);
      expect(columns.blocked).toHaveLength(0);
      expect(columns.done).toHaveLength(0);
    });
  });

  describe('API Operations', () => {
    it('should load todos from API', async () => {
      const mockTodos = [
        { id: '1', text: 'Test', status: 'todo' }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todos: mockTodos })
      });

      await todoStore.loadTodos();

      expect(global.fetch).toHaveBeenCalledWith('/api/todos');
      expect(todoStore.todos).toEqual(mockTodos);
      expect(todoStore.loading).toBe(false);
      expect(todoStore.error).toBeNull();
    });

    it('should handle API errors when loading todos', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await todoStore.loadTodos();

      expect(todoStore.error).toBe('Failed to load todos: Network error');
      expect(todoStore.loading).toBe(false);
    });

    it('should create a new todo', async () => {
      const newTodo = {
        text: 'New todo',
        project: 'test',
        priority: 'high' as const
      };

      const createdTodo = {
        id: '123',
        ...newTodo,
        status: 'todo' as const,
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todo: createdTodo })
      });

      await todoStore.createTodo(newTodo);

      expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      });
      expect(todoStore.todos).toContainEqual(createdTodo);
    });

    it('should update todo status', async () => {
      const todo: Todo = {
        id: '1',
        text: 'Test',
        status: 'todo',
        priority: 'medium',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      };

      todoStore.todos = [todo];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          todo: { ...todo, status: 'in-progress' }
        })
      });

      await todoStore.updateTodoStatus('1', 'in-progress');

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in-progress' })
      });
      expect(todoStore.todos[0].status).toBe('in-progress');
    });

    it('should delete a todo', async () => {
      todoStore.todos = [
        { id: '1', text: 'Test 1' } as Todo,
        { id: '2', text: 'Test 2' } as Todo
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await todoStore.deleteTodo('1');

      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE'
      });
      expect(todoStore.todos).toHaveLength(1);
      expect(todoStore.todos[0].id).toBe('2');
    });

    it('should handle optimistic updates with rollback on error', async () => {
      const todo: Todo = {
        id: '1',
        text: 'Test',
        status: 'todo',
        priority: 'medium',
        project: 'test',
        tags: [],
        createdBy: 'user',
        createdAt: '2024-01-01',
        modifiedAt: '2024-01-01',
        dependencies: [],
        subtasks: [],
        comments: []
      };

      todoStore.todos = [todo];

      (global.fetch as any).mockRejectedValueOnce(new Error('Update failed'));

      await todoStore.updateTodoStatus('1', 'done');

      // Should rollback to original status
      expect(todoStore.todos[0].status).toBe('todo');
      expect(todoStore.error).toContain('Failed to update todo status');
    });
  });

  describe('Filter Management', () => {
    it('should set search filter', () => {
      todoStore.setSearchFilter('test search');
      expect(todoStore.filters.search).toBe('test search');
    });

    it('should set project filter', () => {
      todoStore.setProjectFilter('frontend');
      expect(todoStore.filters.project).toBe('frontend');
    });

    it('should toggle tag filter', () => {
      todoStore.toggleTagFilter('bug');
      expect(todoStore.filters.tags.has('bug')).toBe(true);
      expect(todoStore.filters.tags.has('all')).toBe(false);

      todoStore.toggleTagFilter('bug');
      expect(todoStore.filters.tags.has('bug')).toBe(false);
    });

    it('should clear all filters', () => {
      todoStore.filters.search = 'test';
      todoStore.filters.project = 'frontend';
      todoStore.filters.priority = 'high';
      todoStore.filters.tags = new Set(['bug']);
      todoStore.filters.assignee = 'john';

      todoStore.clearFilters();

      expect(todoStore.filters).toEqual({
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all'
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      todoStore.todos = [
        { id: '1', status: 'todo' } as Todo,
        { id: '2', status: 'todo' } as Todo,
        { id: '3', status: 'in-progress' } as Todo,
        { id: '4', status: 'blocked' } as Todo,
        { id: '5', status: 'done' } as Todo,
        { id: '6', status: 'done' } as Todo
      ];
    });

    it('should calculate statistics correctly', () => {
      const stats = todoStore.statistics;
      expect(stats.total).toBe(6);
      expect(stats.byStatus.todo).toBe(2);
      expect(stats.byStatus['in-progress']).toBe(1);
      expect(stats.byStatus.blocked).toBe(1);
      expect(stats.byStatus.done).toBe(2);
      expect(stats.completionRate).toBe(33.33);
    });
  });
});