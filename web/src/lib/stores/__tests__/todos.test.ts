import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTodoStore } from '../todos.svelte';
import { createMockTodo, createMockTodos } from '../../test-utils';
import type { Todo } from '../../types/Todo';

// Mock fetch globally
global.fetch = vi.fn();

describe('TodoStore with Svelte 5 Runes', () => {
  let store: ReturnType<typeof createTodoStore>;

  beforeEach(() => {
    // Create fresh store instance for each test (factory pattern)
    store = createTodoStore();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with empty todos', () => {
      expect(store.todos).toEqual([]);
    });

    it('should initialize with default filters', () => {
      expect(store.filters).toEqual({
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all',
        includeCompleted: false
      });
    });

    it('should have loading state as false initially', () => {
      expect(store.loading).toBe(false);
    });

    it('should have no error initially', () => {
      expect(store.error).toBeNull();
    });
  });

  describe('Filtering', () => {
    const mockTodos: Todo[] = [
      createMockTodo({
        id: '1',
        text: 'First todo',
        status: 'todo',
        priority: 'high',
        project: 'frontend',
        tags: ['bug', 'urgent'],
        assignee: 'john'
      }),
      createMockTodo({
        id: '2',
        text: 'Second item',
        status: 'in-progress',
        priority: 'medium',
        project: 'backend',
        tags: ['feature'],
        assignee: 'jane'
      }),
      createMockTodo({
        id: '3',
        text: 'Third todo',
        status: 'done',
        priority: 'low',
        project: 'frontend',
        tags: ['docs']
      })
    ];

    beforeEach(() => {
      store.todos = mockTodos;
    });

    it('should filter todos by search text', () => {
      store.filters.search = 'first';
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter todos by priority', () => {
      store.filters.priority = 'high';
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe('high');
    });

    it('should filter todos by project', () => {
      // Enable includeCompleted to see all todos
      store.filters = { ...store.filters, includeCompleted: true };
      store.setProjectsFilter(['frontend']);
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.project === 'frontend')).toBe(true);
    });

    it('should filter todos by multiple tags', () => {
      // Enable includeCompleted to see all todos
      store.filters = { ...store.filters, includeCompleted: true };
      store.setTagsFilter(['bug', 'feature']);
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(2);
    });

    it('should filter todos by assignee', () => {
      store.setAssigneeFilter('john');
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].assignee).toBe('john');
    });

    it('should apply multiple filters simultaneously', () => {
      store.setProjectsFilter(['frontend']);
      store.setPriorityFilter('high');
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should show all non-completed todos when filters are set to default', () => {
      store.filters = {
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all',
        includeCompleted: false
      };
      const filtered = store.filteredTodos;
      // Should exclude 'done' todos by default
      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.status !== 'done')).toBe(true);
    });

    it('should show all todos including completed when includeCompleted is true', () => {
      store.filters = {
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all',
        includeCompleted: true
      };
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(3);
    });

    it('should filter out completed todos by default', () => {
      // Default includeCompleted is false
      const filtered = store.filteredTodos;
      expect(filtered).toHaveLength(2);
      expect(filtered.find(t => t.status === 'done')).toBeUndefined();
    });
  });

  describe('Column Grouping', () => {
    const mockTodos: Todo[] = [
      createMockTodo({
        id: '1',
        text: 'Todo 1',
        status: 'todo',
        priority: 'high',
        project: 'test'
      }),
      createMockTodo({
        id: '2',
        text: 'Todo 2',
        status: 'todo',
        priority: 'medium',
        project: 'test'
      }),
      createMockTodo({
        id: '3',
        text: 'In Progress 1',
        status: 'in-progress',
        priority: 'high',
        project: 'test'
      }),
      createMockTodo({
        id: '4',
        text: 'Blocked 1',
        status: 'blocked',
        priority: 'urgent',
        project: 'test'
      }),
      createMockTodo({
        id: '5',
        text: 'Done 1',
        status: 'done',
        priority: 'low',
        project: 'test'
      })
    ];

    beforeEach(() => {
      store.todos = mockTodos;
      // Enable includeCompleted to see all columns
      store.filters = { ...store.filters, includeCompleted: true };
    });

    it('should group todos by status columns', () => {
      const columns = store.columnTodos;
      expect(columns.todo).toHaveLength(2);
      expect(columns['in-progress']).toHaveLength(1);
      expect(columns.blocked).toHaveLength(1);
      expect(columns.done).toHaveLength(1);
    });

    it('should apply filters to column grouping', () => {
      store.setPriorityFilter('high');
      const columns = store.columnTodos;
      expect(columns.todo).toHaveLength(1);
      expect(columns['in-progress']).toHaveLength(1);
      expect(columns.blocked).toHaveLength(0);
      expect(columns.done).toHaveLength(0);
    });

    it('should exclude done column when includeCompleted is false', () => {
      store.filters = { ...store.filters, includeCompleted: false };
      const columns = store.columnTodos;
      expect(columns.todo).toHaveLength(2);
      expect(columns['in-progress']).toHaveLength(1);
      expect(columns.blocked).toHaveLength(1);
      expect(columns.done).toHaveLength(0); // Done todos excluded
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const mockTodos = [
        createMockTodo({ status: 'todo' }),
        createMockTodo({ status: 'todo' }),
        createMockTodo({ status: 'in-progress' }),
        createMockTodo({ status: 'done' }),
        createMockTodo({ status: 'done' })
      ];
      store.todos = mockTodos;
    });

    it('should calculate correct statistics', () => {
      const stats = store.statistics;
      expect(stats.total).toBe(5);
      expect(stats.byStatus.todo).toBe(2);
      expect(stats.byStatus['in-progress']).toBe(1);
      expect(stats.byStatus.done).toBe(2);
      expect(stats.completionRate).toBe(40); // 2/5 = 40%
    });
  });

  describe('API Operations', () => {
    it('should load todos from API', async () => {
      const mockTodos = [
        createMockTodo({ id: '1', text: 'Test' })
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todos: mockTodos })
      });

      await store.loadTodos();

      expect(global.fetch).toHaveBeenCalledWith('/api/todos?mode=standard&includeCompleted=false');
      expect(store.todos).toHaveLength(1);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should handle API errors when loading todos', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await store.loadTodos();

      expect(store.loading).toBe(false);
      expect(store.error).toContain('Network error');
      expect(store.todos).toEqual([]);
    });

    it('should create a new todo', async () => {
      const newTodo = createMockTodo({ id: '1', text: 'New todo' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todo: newTodo })
      });

      await store.createTodo({
        text: 'New todo',
        project: 'test'
      });

      expect(store.todos).toHaveLength(1);
      expect(store.todos[0].text).toBe('New todo');
    });

    it('should update an existing todo', async () => {
      const existingTodo = createMockTodo({ id: '1', text: 'Original' });
      store.todos = [existingTodo];

      const updatedTodo = { ...existingTodo, text: 'Updated' };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todo: updatedTodo })
      });

      await store.updateTodo('1', { text: 'Updated' });

      expect(store.todos[0].text).toBe('Updated');
    });

    it('should handle optimistic updates with rollback on error', async () => {
      const existingTodo = createMockTodo({ id: '1', status: 'todo' });
      store.todos = [existingTodo];

      (global.fetch as any).mockResolvedValueOnce({
        ok: false
      });

      try {
        await store.updateTodoStatus('1', 'done');
      } catch (error) {
        // Expected error
      }

      // Should rollback to original status
      expect(store.todos[0].status).toBe('todo');
    });

    it('should delete a todo', async () => {
      store.todos = [
        createMockTodo({ id: '1' }),
        createMockTodo({ id: '2' })
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      await store.deleteTodo('1');

      expect(store.todos).toHaveLength(1);
      expect(store.todos[0].id).toBe('2');
    });

    it('should complete a todo', async () => {
      const todo = createMockTodo({ id: '1', status: 'todo' });
      store.todos = [todo];

      const completedTodo = { ...todo, status: 'done' as const };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todo: completedTodo })
      });

      await store.completeTodo('1');

      expect(store.todos[0].status).toBe('done');
    });

    it('should add a comment to a todo', async () => {
      const todo = createMockTodo({ id: '1' });
      store.todos = [todo];

      const todoWithComment = {
        ...todo,
        comments: [{ id: 'c1', text: 'Test comment', timestamp: new Date().toISOString(), user: 'test-user' }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todo: todoWithComment })
      });

      await store.addComment('1', 'Test comment');

      expect(store.todos[0].comments).toHaveLength(1);
      expect(store.todos[0].comments![0].text).toBe('Test comment');
    });
  });

  describe('Filter Management', () => {
    it('should update search filter', () => {
      store.setSearchFilter('test');
      expect(store.filters.search).toBe('test');
    });

    it('should update projects filter', () => {
      store.setProjectsFilter(['project1', 'project2']);
      expect(store.filters.projects).toEqual(['project1', 'project2']);
    });

    it('should update priority filter', () => {
      store.setPriorityFilter('high');
      expect(store.filters.priority).toBe('high');
    });

    it('should update tags filter', () => {
      store.setTagsFilter(['tag1', 'tag2']);
      expect(store.filters.tags).toEqual(['tag1', 'tag2']);
    });

    it('should update assignee filter', () => {
      store.setAssigneeFilter('user-123');
      expect(store.filters.assignee).toBe('user-123');
    });

    it('should update includeCompleted filter and reload todos', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, todos: [] })
      });

      store.setIncludeCompletedFilter(true);

      expect(store.filters.includeCompleted).toBe(true);
      // Should trigger loadTodos()
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should clear all filters', () => {
      store.setSearchFilter('test');
      store.setProjectsFilter(['project1']);
      store.setPriorityFilter('high');
      store.setIncludeCompletedFilter(true);

      store.clearFilters();

      expect(store.filters).toEqual({
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all',
        includeCompleted: false
      });
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state', () => {
      // Set some state
      store.todos = [createMockTodo()];
      store.setSearchFilter('test');
      store.loading = true;
      store.error = 'Some error';

      // Reset
      store.reset();

      // Verify reset
      expect(store.todos).toEqual([]);
      expect(store.filters).toEqual({
        search: '',
        projects: [],
        priority: 'all',
        tags: [],
        assignee: 'all',
        includeCompleted: false
      });
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});
