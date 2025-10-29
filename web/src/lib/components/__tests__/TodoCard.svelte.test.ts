import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TodoCard from '../TodoCard.svelte';
import type { Todo } from '../../types/Todo';

describe('TodoCard Component', () => {
  const mockTodo: Todo = {
    id: '1',
    text: 'Test todo',
    description: 'Test description',
    status: 'todo',
    priority: 'high',
    project: 'test-project',
    tags: ['bug', 'urgent'],
    assignee: 'john',
    createdBy: 'user',
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-01-01T00:00:00Z',
    dueDate: '2024-01-15T00:00:00Z',
    completedAt: null,
    dependencies: [],
    subtasks: [
      { id: 's1', text: 'Subtask 1', completed: false },
      { id: 's2', text: 'Subtask 2', completed: true }
    ],
    comments: []
  };

  it('should render todo information', () => {
    const { getByText } = render(TodoCard, { todo: mockTodo });

    expect(getByText('Test todo')).toBeTruthy();
    expect(getByText('Test description')).toBeTruthy();
    expect(getByText('High')).toBeTruthy();
  });

  it('should display tags', () => {
    const { getByText } = render(TodoCard, { todo: mockTodo });

    expect(getByText('bug')).toBeTruthy();
    expect(getByText('urgent')).toBeTruthy();
  });

  it('should apply correct priority color classes', () => {
    const { container } = render(TodoCard, { todo: mockTodo });
    const card = container.querySelector('.border-priority-high');

    expect(card).toBeTruthy();
  });

  it('should apply different colors for different priorities', () => {
    const priorities = [
      { priority: 'urgent', class: 'border-priority-urgent' },
      { priority: 'high', class: 'border-priority-high' },
      { priority: 'medium', class: 'border-priority-medium' },
      { priority: 'low', class: 'border-priority-low' }
    ];

    priorities.forEach(({ priority, class: className }) => {
      const todo = { ...mockTodo, priority: priority as Todo['priority'] };
      const { container } = render(TodoCard, { todo });
      const card = container.querySelector(`.${className}`);

      expect(card).toBeTruthy();
    });
  });

  it('should be draggable by default', () => {
    const { container } = render(TodoCard, { todo: mockTodo });
    const card = container.querySelector('[draggable="true"]');

    expect(card).toBeTruthy();
  });

  it('should not be draggable when disabled', () => {
    const { container } = render(TodoCard, { todo: mockTodo, draggable: false });
    const card = container.querySelector('[draggable="false"]');

    expect(card).toBeTruthy();
  });

  it('should show assignee when present', () => {
    const { getByText } = render(TodoCard, { todo: mockTodo });

    expect(getByText('john')).toBeTruthy();
  });

  it('should show due date when present', () => {
    const { getByText } = render(TodoCard, { todo: mockTodo });

    // Check for formatted date (adjust format as needed)
    expect(getByText(/Jan 15/)).toBeTruthy();
  });

  it('should show subtask progress', () => {
    const { getByText } = render(TodoCard, { todo: mockTodo });

    // 1 of 2 subtasks completed
    expect(getByText('1/2')).toBeTruthy();
  });

  it('should emit click event when clicked', async () => {
    const handleClick = vi.fn();
    const { container } = render(TodoCard, {
      todo: mockTodo,
      onclick: handleClick
    });

    const card = container.querySelector('.todo-card');
    if (card) {
      await fireEvent.click(card);
    }

    expect(handleClick).toHaveBeenCalledWith(mockTodo);
  });

  it('should show completed state for done todos', () => {
    const doneTodo = { ...mockTodo, status: 'done' as const, completedAt: '2024-01-10T00:00:00Z' };
    const { container } = render(TodoCard, { todo: doneTodo });

    const card = container.querySelector('.opacity-75');
    expect(card).toBeTruthy();

    const strikethrough = container.querySelector('.line-through');
    expect(strikethrough).toBeTruthy();
  });

  it('should show blocked indicator for blocked todos', () => {
    const blockedTodo = { ...mockTodo, status: 'blocked' as const };
    const { getByText } = render(TodoCard, { todo: blockedTodo });

    expect(getByText('Blocked')).toBeTruthy();
  });

  it('should handle todos without optional fields', () => {
    const minimalTodo: Todo = {
      id: '2',
      text: 'Minimal todo',
      status: 'todo',
      priority: 'medium',
      project: 'test',
      tags: [],
      createdBy: 'user',
      createdAt: '2024-01-01T00:00:00Z',
      modifiedAt: '2024-01-01T00:00:00Z',
      dependencies: [],
      subtasks: [],
      comments: []
    };

    const { getByText, queryByText } = render(TodoCard, { todo: minimalTodo });

    expect(getByText('Minimal todo')).toBeTruthy();
    expect(queryByText('john')).toBeFalsy(); // No assignee
    expect(queryByText(/Jan 15/)).toBeFalsy(); // No due date
  });

  it('should show progress bar for in-progress todos', () => {
    const inProgressTodo = { ...mockTodo, status: 'in-progress' as const };
    const { container } = render(TodoCard, { todo: inProgressTodo, progress: 65 });

    const progressBar = container.querySelector('.bg-blue-500');
    expect(progressBar).toBeTruthy();
    expect(progressBar?.getAttribute('style')).toContain('width: 65%');
  });
});