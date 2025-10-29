import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import KanbanColumn from '../KanbanColumn.svelte';
import type { Todo } from '../../types/Todo';

describe('KanbanColumn Component', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      text: 'First todo',
      description: 'First description',
      status: 'todo',
      priority: 'high',
      project: 'test-project',
      tags: ['bug'],
      assignee: 'john',
      createdBy: 'user',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    },
    {
      id: '2',
      text: 'Second todo',
      status: 'todo',
      priority: 'medium',
      project: 'test-project',
      tags: ['feature'],
      createdBy: 'user',
      createdAt: '2024-01-02T00:00:00Z',
      modifiedAt: '2024-01-02T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    }
  ];

  it('should render column title', () => {
    const { getByText } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    expect(getByText('To Do')).toBeTruthy();
  });

  it('should display todo count', () => {
    const { getByText } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    expect(getByText('2')).toBeTruthy();
  });

  it('should render all todos', () => {
    const { getByText } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    expect(getByText('First todo')).toBeTruthy();
    expect(getByText('Second todo')).toBeTruthy();
  });

  it('should apply correct status color classes', () => {
    const statusColors = [
      { status: 'todo', class: 'bg-gray-100' },
      { status: 'in-progress', class: 'bg-blue-100' },
      { status: 'blocked', class: 'bg-red-100' },
      { status: 'done', class: 'bg-green-100' }
    ];

    statusColors.forEach(({ status, class: className }) => {
      const { container } = render(KanbanColumn, {
        props: {
          title: 'Test',
          status: status as Todo['status'],
          todos: []
        }
      });

      const column = container.querySelector(`.${className}`);
      expect(column).toBeTruthy();
    });
  });

  it('should handle empty todos list', () => {
    const { container, getByText } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: []
      }
    });

    expect(getByText('To Do')).toBeTruthy();
    expect(getByText('0')).toBeTruthy();

    const emptyMessage = container.querySelector('.text-gray-400');
    expect(emptyMessage?.textContent).toContain('No items');
  });

  it('should handle drop events', async () => {
    const handleDrop = vi.fn();
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos,
        ondrop: handleDrop
      }
    });

    const dropZone = container.querySelector('.kanban-column');
    if (dropZone) {
      const dropEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer()
      });
      dropEvent.dataTransfer?.setData('todo-id', '3');

      await fireEvent.drop(dropZone, dropEvent);

      expect(handleDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          todoId: '3',
          targetStatus: 'todo'
        })
      );
    }
  });

  it('should handle dragover events', async () => {
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    const dropZone = container.querySelector('.kanban-column');
    if (dropZone) {
      const dragOverEvent = new DragEvent('dragover');
      await fireEvent.dragOver(dropZone, dragOverEvent);

      // Should prevent default to allow drop
      expect(dragOverEvent.defaultPrevented).toBe(true);
    }
  });

  it('should emit todo click events', async () => {
    const handleTodoClick = vi.fn();
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos,
        ontodoclick: handleTodoClick
      }
    });

    // Click on first todo card
    const firstTodoCard = container.querySelector('.todo-card');
    if (firstTodoCard) {
      await fireEvent.click(firstTodoCard);
      expect(handleTodoClick).toHaveBeenCalledWith(mockTodos[0]);
    }
  });

  it('should show add button when onaddtodo is provided', () => {
    const handleAddTodo = vi.fn();
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos,
        onaddtodo: handleAddTodo
      }
    });

    const addButton = container.querySelector('.add-todo-button');
    expect(addButton).toBeTruthy();
  });

  it('should handle add todo button click', async () => {
    const handleAddTodo = vi.fn();
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos,
        onaddtodo: handleAddTodo
      }
    });

    const addButton = container.querySelector('.add-todo-button');
    if (addButton) {
      await fireEvent.click(addButton);
      expect(handleAddTodo).toHaveBeenCalledWith('todo');
    }
  });

  it('should not show add button when onaddtodo is not provided', () => {
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    const addButton = container.querySelector('.add-todo-button');
    expect(addButton).toBeFalsy();
  });

  it('should apply visual feedback on drag enter', async () => {
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    const dropZone = container.querySelector('.kanban-column');
    if (dropZone) {
      await fireEvent.dragEnter(dropZone);

      const highlightedColumn = container.querySelector('.border-blue-400');
      expect(highlightedColumn).toBeTruthy();
    }
  });

  it('should remove visual feedback on drag leave', async () => {
    const { container } = render(KanbanColumn, {
      props: {
        title: 'To Do',
        status: 'todo',
        todos: mockTodos
      }
    });

    const dropZone = container.querySelector('.kanban-column');
    if (dropZone) {
      await fireEvent.dragEnter(dropZone);
      await fireEvent.dragLeave(dropZone);

      const highlightedColumn = container.querySelector('.border-blue-400');
      expect(highlightedColumn).toBeFalsy();
    }
  });
});