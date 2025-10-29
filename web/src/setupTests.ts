import '@testing-library/jest-dom';
import { vi } from 'vitest';

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