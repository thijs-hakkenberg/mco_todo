import { uuidv7 } from 'uuidv7';
import { TodoSchema, createTodo, updateTodo } from '../../../src/types/Todo';

describe('Todo Model', () => {
  describe('validation', () => {
    it('should validate a complete todo object', () => {
      const validTodo = {
        id: uuidv7(),
        text: 'Test todo',
        description: 'Test description',
        status: 'todo' as const,
        priority: 'medium' as const,
        project: 'work',
        tags: ['test', 'unit'],
        assignee: 'user-123',
        createdBy: 'user-456',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        completedAt: null,
        dependencies: [],
        subtasks: [
          { id: uuidv7(), text: 'Subtask 1', completed: false }
        ],
        comments: [
          {
            id: uuidv7(),
            user: 'user-789',
            text: 'Test comment',
            timestamp: new Date().toISOString()
          }
        ],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          assignee: new Date().toISOString(),
          description: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      };

      const result = TodoSchema.safeParse(validTodo);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const invalidTodo = {
        id: uuidv7(),
        text: 'Test todo',
        status: 'invalid-status',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        fieldTimestamps: {}
      };

      const result = TodoSchema.safeParse(invalidTodo);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority values', () => {
      const invalidTodo = {
        id: uuidv7(),
        text: 'Test todo',
        status: 'todo',
        priority: 'invalid-priority',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        fieldTimestamps: {}
      };

      const result = TodoSchema.safeParse(invalidTodo);
      expect(result.success).toBe(false);
    });

    it('should require all mandatory fields', () => {
      const incompleteTodo = {
        id: uuidv7(),
        text: 'Test todo'
      };

      const result = TodoSchema.safeParse(incompleteTodo);
      expect(result.success).toBe(false);
    });

    it('should generate UUID if not provided', () => {
      const todoWithoutId = {
        text: 'Test todo',
        status: 'todo' as const,
        priority: 'medium' as const,
        project: 'work',
        tags: [],
        createdBy: 'user-123'
      };

      const todo = createTodo(todoWithoutId);
      expect(todo.id).toBeDefined();
      expect(todo.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should set createdAt timestamp automatically', () => {
      const todoWithoutTimestamp = {
        text: 'Test todo',
        status: 'todo' as const,
        priority: 'medium' as const,
        project: 'work',
        tags: [],
        createdBy: 'user-123'
      };

      const todo = createTodo(todoWithoutTimestamp);
      expect(todo.createdAt).toBeDefined();
      expect(new Date(todo.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('field timestamps', () => {
    it('should initialize fieldTimestamps for all fields', () => {
      const todo = createTodo({
        text: 'Test todo',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: ['test'],
        createdBy: 'user-123'
      });

      expect(todo.fieldTimestamps).toBeDefined();
      expect(todo.fieldTimestamps.text).toBeDefined();
      expect(todo.fieldTimestamps.status).toBeDefined();
      expect(todo.fieldTimestamps.priority).toBeDefined();
      expect(todo.fieldTimestamps.project).toBeDefined();
      expect(todo.fieldTimestamps.tags).toBeDefined();
    });

    it('should update fieldTimestamp when field changes', () => {
      const todo = createTodo({
        text: 'Test todo',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123'
      });

      const originalTextTimestamp = todo.fieldTimestamps.text;
      const originalStatusTimestamp = todo.fieldTimestamps.status;

      // Wait a bit to ensure timestamp difference
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      const updatedTodo = updateTodo(todo, {
        text: 'Updated text'
      });

      expect(updatedTodo.fieldTimestamps.text).not.toBe(originalTextTimestamp);
      expect(updatedTodo.fieldTimestamps.status).toBe(originalStatusTimestamp);

      jest.useRealTimers();
    });

    it('should not update timestamp for unchanged fields', () => {
      const todo = createTodo({
        text: 'Test todo',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123'
      });

      const originalTimestamps = { ...todo.fieldTimestamps };

      const updatedTodo = updateTodo(todo, {
        text: 'Test todo' // Same value
      });

      expect(updatedTodo.fieldTimestamps).toEqual(originalTimestamps);
    });
  });
});