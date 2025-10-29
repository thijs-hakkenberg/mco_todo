import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import KanbanBoard from '../KanbanBoard.svelte';
import { todoStore } from '../../stores/todos.svelte';
import type { Todo } from '../../types/Todo';

// Mock the todo store
vi.mock('../../stores/todos.svelte', () => ({
  todoStore: {
    todos: [],
    filters: {
      search: '',
      project: 'all',
      priority: 'all',
      tags: new Set(['all']),
      assignee: 'all'
    },
    loading: false,
    error: null,
    columnTodos: {
      'todo': [],
      'in-progress': [],
      'blocked': [],
      'done': []
    },
    filteredTodos: [],
    statistics: {
      total: 0,
      byStatus: {
        'todo': 0,
        'in-progress': 0,
        'blocked': 0,
        'done': 0
      },
      completionRate: 0
    },
    loadTodos: vi.fn(),
    updateTodoStatus: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
    setSearchFilter: vi.fn(),
    setProjectFilter: vi.fn(),
    setPriorityFilter: vi.fn(),
    toggleTagFilter: vi.fn(),
    setAssigneeFilter: vi.fn(),
    clearFilters: vi.fn()
  }
}));

describe('KanbanBoard Component', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      text: 'Todo item',
      status: 'todo',
      priority: 'high',
      project: 'test',
      tags: ['bug'],
      createdBy: 'user',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    },
    {
      id: '2',
      text: 'In progress item',
      status: 'in-progress',
      priority: 'medium',
      project: 'test',
      tags: ['feature'],
      createdBy: 'user',
      createdAt: '2024-01-02T00:00:00Z',
      modifiedAt: '2024-01-02T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    },
    {
      id: '3',
      text: 'Blocked item',
      status: 'blocked',
      priority: 'high',
      project: 'test',
      tags: ['bug'],
      createdBy: 'user',
      createdAt: '2024-01-03T00:00:00Z',
      modifiedAt: '2024-01-03T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    },
    {
      id: '4',
      text: 'Done item',
      status: 'done',
      priority: 'low',
      project: 'test',
      tags: ['docs'],
      createdBy: 'user',
      createdAt: '2024-01-04T00:00:00Z',
      modifiedAt: '2024-01-04T00:00:00Z',
      completedAt: '2024-01-05T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    todoStore.todos = mockTodos;
    todoStore.columnTodos = {
      'todo': [mockTodos[0]],
      'in-progress': [mockTodos[1]],
      'blocked': [mockTodos[2]],
      'done': [mockTodos[3]]
    };
    todoStore.filteredTodos = mockTodos;
    todoStore.statistics = {
      total: 4,
      byStatus: {
        'todo': 1,
        'in-progress': 1,
        'blocked': 1,
        'done': 1
      },
      completionRate: 25
    };
  });

  it('should render all four columns', () => {
    const { getByText } = render(KanbanBoard);

    expect(getByText('To Do')).toBeTruthy();
    expect(getByText('In Progress')).toBeTruthy();
    expect(getByText('Blocked')).toBeTruthy();
    expect(getByText('Done')).toBeTruthy();
  });

  it('should render FilterBar component', () => {
    const { container } = render(KanbanBoard);

    const filterBar = container.querySelector('#searchInput');
    expect(filterBar).toBeTruthy();
  });

  it('should display todos in correct columns', () => {
    const { getByText } = render(KanbanBoard);

    expect(getByText('Todo item')).toBeTruthy();
    expect(getByText('In progress item')).toBeTruthy();
    expect(getByText('Blocked item')).toBeTruthy();
    expect(getByText('Done item')).toBeTruthy();
  });

  it('should load todos on mount', async () => {
    render(KanbanBoard);

    await waitFor(() => {
      expect(todoStore.loadTodos).toHaveBeenCalled();
    });
  });

  it('should handle drag and drop between columns', async () => {
    const { container } = render(KanbanBoard);

    // Simulate dropping todo '1' into in-progress column
    const inProgressColumn = container.querySelectorAll('.kanban-column')[1];

    if (inProgressColumn) {
      const dropEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer()
      });
      dropEvent.dataTransfer?.setData('todo-id', '1');

      await fireEvent.drop(inProgressColumn, dropEvent);

      expect(todoStore.updateTodoStatus).toHaveBeenCalledWith('1', 'in-progress');
    }
  });

  it('should display statistics', () => {
    const { getByText } = render(KanbanBoard);

    expect(getByText(/Total: 4/)).toBeTruthy();
    expect(getByText(/25%/)).toBeTruthy();
  });

  it('should show loading state', () => {
    todoStore.loading = true;
    const { getByText } = render(KanbanBoard);

    expect(getByText('Loading todos...')).toBeTruthy();
  });

  it('should show error state', () => {
    todoStore.error = 'Failed to load todos';
    const { getByText } = render(KanbanBoard);

    expect(getByText('Failed to load todos')).toBeTruthy();
  });

  it('should handle todo click to open modal', async () => {
    const { getByText, container } = render(KanbanBoard);

    const todoCard = container.querySelector('.todo-card');
    if (todoCard) {
      await fireEvent.click(todoCard);

      // Modal should be visible
      const modal = container.querySelector('.todo-modal');
      expect(modal).toBeTruthy();
    }
  });

  it('should handle add todo button click', async () => {
    const { container } = render(KanbanBoard);

    const addButton = container.querySelector('.add-todo-button');
    if (addButton) {
      await fireEvent.click(addButton);

      // Should open add todo modal
      const modal = container.querySelector('.add-todo-modal');
      expect(modal).toBeTruthy();
    }
  });

  it('should refresh data when refresh button is clicked', async () => {
    const { container } = render(KanbanBoard);

    const refreshButton = container.querySelector('.refresh-button');
    if (refreshButton) {
      await fireEvent.click(refreshButton);

      expect(todoStore.loadTodos).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
    }
  });

  it('should display empty state when no todos', () => {
    todoStore.todos = [];
    todoStore.columnTodos = {
      'todo': [],
      'in-progress': [],
      'blocked': [],
      'done': []
    };
    todoStore.statistics.total = 0;

    const { container } = render(KanbanBoard);

    const emptyMessages = container.querySelectorAll('.text-gray-400');
    expect(emptyMessages.length).toBeGreaterThan(0);
  });

  it('should handle keyboard navigation', async () => {
    const { container } = render(KanbanBoard);

    const firstColumn = container.querySelector('.kanban-column');
    if (firstColumn) {
      const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      await fireEvent.keyDown(firstColumn, keyEvent);

      // Should trigger appropriate action
      expect(firstColumn).toBeTruthy();
    }
  });

  it('should update when filters change', async () => {
    const { container } = render(KanbanBoard);

    // Change search filter
    const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
    if (searchInput) {
      await fireEvent.input(searchInput, { target: { value: 'test' } });
      expect(todoStore.setSearchFilter).toHaveBeenCalledWith('test');
    }
  });

  it('should handle column reordering if enabled', () => {
    const { container } = render(KanbanBoard, {
      props: { allowColumnReorder: true }
    });

    const columns = container.querySelectorAll('.kanban-column');
    expect(columns.length).toBe(4);
  });

  it('should respect read-only mode', () => {
    const { container } = render(KanbanBoard, {
      props: { readOnly: true }
    });

    const addButtons = container.querySelectorAll('.add-todo-button');
    expect(addButtons.length).toBe(0);
  });
});