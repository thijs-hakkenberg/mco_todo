import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { flushSync as svelteFlushSync } from 'svelte';

// Re-export flushSync for convenient test imports
// Use this when testing $derived state updates that need to be synchronous
// Example:
//   store.todos = [newTodo];
//   flushSync();
//   expect(store.filteredTodos).toHaveLength(1);
export { svelteFlushSync as flushSync };

// Mock fetch for tests
global.fetch = vi.fn();

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})) as any;

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});