/**
 * Test Utilities for Svelte 5 Runes Testing
 *
 * These utilities help with testing Svelte 5 components and stores
 * that use runes ($state, $derived, $effect).
 */

import { flushSync } from 'svelte';
import { createTodoStore } from './stores/todos.svelte';
import type { Todo, TodoFilters } from './types/Todo';

/**
 * Create a fresh store instance for testing.
 * Each test should create its own store to ensure isolation.
 *
 * @example
 * ```typescript
 * let store: ReturnType<typeof createTestStore>;
 *
 * beforeEach(() => {
 *   store = createTestStore();
 * });
 *
 * it('should filter todos', () => {
 *   store.todos = [mockTodo];
 *   expect(store.filteredTodos).toHaveLength(1);
 * });
 * ```
 */
export function createTestStore() {
  return createTodoStore();
}

/**
 * Create mock todo data for testing.
 * Uses reasonable defaults and allows overrides.
 *
 * @param overrides - Partial todo object to override defaults
 * @returns Complete todo object for testing
 *
 * @example
 * ```typescript
 * const todo = createMockTodo({
 *   text: 'Test todo',
 *   status: 'in-progress'
 * });
 * ```
 */
export function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  const baseId = Math.floor(Math.random() * 10000);
  const now = new Date().toISOString();

  return {
    id: `test-${baseId}`,
    text: 'Test todo',
    status: 'todo',
    priority: 'medium',
    project: 'test-project',
    tags: [],
    createdAt: now,
    modifiedAt: now,
    fieldTimestamps: {},
    createdBy: 'test-user',
    ...overrides
  };
}

/**
 * Create multiple mock todos for testing.
 *
 * @param count - Number of todos to create
 * @param overrides - Partial todo object applied to all created todos
 * @returns Array of mock todos
 *
 * @example
 * ```typescript
 * const todos = createMockTodos(5, { project: 'work' });
 * ```
 */
export function createMockTodos(count: number, overrides: Partial<Todo> = {}): Todo[] {
  return Array.from({ length: count }, (_, i) =>
    createMockTodo({
      text: `Test todo ${i + 1}`,
      ...overrides
    })
  );
}

/**
 * Synchronously flush Svelte reactivity updates.
 * Required when testing $derived state that needs immediate updates.
 *
 * @example
 * ```typescript
 * store.todos = [newTodo];
 * flushReactivity();
 * expect(store.filteredTodos).toHaveLength(1);
 * ```
 */
export function flushReactivity(): void {
  flushSync();
}

/**
 * Wait for async operations to complete.
 * Useful for testing API calls and async store methods.
 *
 * @param ms - Milliseconds to wait (default: 0, just yields to event loop)
 *
 * @example
 * ```typescript
 * await store.loadTodos();
 * await waitFor();
 * expect(store.loading).toBe(false);
 * ```
 */
export async function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock filters for testing.
 *
 * @param overrides - Partial filter object to override defaults
 * @returns Complete TodoFilters object
 *
 * @example
 * ```typescript
 * const filters = createMockFilters({
 *   priority: 'high',
 *   includeCompleted: true
 * });
 * ```
 */
export function createMockFilters(overrides: Partial<TodoFilters> = {}): TodoFilters {
  return {
    search: '',
    projects: [],
    priority: 'all',
    tags: [],
    assignee: 'all',
    includeCompleted: false,
    ...overrides
  };
}
