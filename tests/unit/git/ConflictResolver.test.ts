import { ConflictResolver } from '../../../src/git/ConflictResolver';
import { Todo } from '../../../src/types/Todo';
import { uuidv7 } from 'uuidv7';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('Last-Write-Wins merge', () => {
    const createMockTodo = (overrides?: Partial<Todo>): Todo => {
      const now = new Date().toISOString();
      return {
        id: uuidv7(),
        text: 'Test todo',
        description: 'Test description',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: ['test'],
        assignee: 'user-123',
        createdBy: 'user-456',
        createdAt: now,
        modifiedAt: now,
        dueDate: undefined,
        completedAt: null,
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: now,
          status: now,
          priority: now,
          project: now,
          tags: now,
          assignee: now,
          description: now,
          dueDate: undefined,
          completedAt: undefined,
          dependencies: now,
          subtasks: now,
          comments: now
        },
        ...overrides
      };
    };

    it('should prefer remote when remote timestamp is newer', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').toISOString();
      const localTime = new Date('2024-01-01T10:01:00Z').toISOString();
      const remoteTime = new Date('2024-01-01T10:02:00Z').toISOString();

      const local = createMockTodo({
        text: 'Local text',
        status: 'in-progress',
        fieldTimestamps: {
          text: localTime,
          status: localTime,
          priority: baseTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const remote = createMockTodo({
        id: local.id, // Same ID for conflict
        text: 'Remote text',
        status: 'done',
        fieldTimestamps: {
          text: remoteTime,
          status: remoteTime,
          priority: baseTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const merged = resolver.mergeTodo(local, remote);

      expect(merged).not.toBeNull();
      expect(merged!.text).toBe('Remote text');
      expect(merged!.status).toBe('done');
      expect(merged!.fieldTimestamps.text).toBe(remoteTime);
      expect(merged!.fieldTimestamps.status).toBe(remoteTime);
    });

    it('should prefer local when local timestamp is newer', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').toISOString();
      const localTime = new Date('2024-01-01T10:02:00Z').toISOString();
      const remoteTime = new Date('2024-01-01T10:01:00Z').toISOString();

      const local = createMockTodo({
        text: 'Local text',
        priority: 'high',
        fieldTimestamps: {
          text: localTime,
          status: baseTime,
          priority: localTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const remote = createMockTodo({
        id: local.id,
        text: 'Remote text',
        priority: 'low',
        fieldTimestamps: {
          text: remoteTime,
          status: baseTime,
          priority: remoteTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const merged = resolver.mergeTodo(local, remote);

      expect(merged).not.toBeNull();
      expect(merged!.text).toBe('Local text');
      expect(merged!.priority).toBe('high');
      expect(merged!.fieldTimestamps.text).toBe(localTime);
      expect(merged!.fieldTimestamps.priority).toBe(localTime);
    });

    it('should merge non-conflicting fields from both versions', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').toISOString();
      const localTime = new Date('2024-01-01T10:02:00Z').toISOString();
      const remoteTime = new Date('2024-01-01T10:03:00Z').toISOString();

      const local = createMockTodo({
        text: 'Local text',
        priority: 'high',
        fieldTimestamps: {
          text: localTime,
          status: baseTime,
          priority: localTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const remote = createMockTodo({
        id: local.id,
        text: 'Old text',
        status: 'done',
        priority: 'low',
        fieldTimestamps: {
          text: baseTime,
          status: remoteTime,
          priority: baseTime,
          project: baseTime,
          tags: baseTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: baseTime,
          comments: baseTime
        }
      });

      const merged = resolver.mergeTodo(local, remote);

      expect(merged).not.toBeNull();
      expect(merged!.text).toBe('Local text'); // Local is newer
      expect(merged!.status).toBe('done'); // Remote is newer
      expect(merged!.priority).toBe('high'); // Local is newer
    });

    it('should handle missing timestamps gracefully', () => {
      const local = createMockTodo({
        text: 'Local text',
        fieldTimestamps: {} as any // Missing timestamps
      });

      const remote = createMockTodo({
        id: local.id,
        text: 'Remote text',
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          assignee: new Date().toISOString(),
          description: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      });

      const merged = resolver.mergeTodo(local, remote);

      expect(merged).not.toBeNull();
      expect(merged!.text).toBe('Remote text'); // Remote has timestamp, local doesn't
    });

    it('should merge array fields correctly (tags, subtasks)', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').toISOString();
      const localTime = new Date('2024-01-01T10:02:00Z').toISOString();
      const remoteTime = new Date('2024-01-01T10:01:00Z').toISOString();

      const local = createMockTodo({
        tags: ['local1', 'local2'],
        subtasks: [
          { id: uuidv7(), text: 'Local subtask', completed: false }
        ],
        fieldTimestamps: {
          text: baseTime,
          status: baseTime,
          priority: baseTime,
          project: baseTime,
          tags: localTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: localTime,
          comments: baseTime
        }
      });

      const remote = createMockTodo({
        id: local.id,
        tags: ['remote1', 'remote2'],
        subtasks: [
          { id: uuidv7(), text: 'Remote subtask', completed: true }
        ],
        fieldTimestamps: {
          text: baseTime,
          status: baseTime,
          priority: baseTime,
          project: baseTime,
          tags: remoteTime,
          assignee: baseTime,
          description: baseTime,
          dependencies: baseTime,
          subtasks: remoteTime,
          comments: baseTime
        }
      });

      const merged = resolver.mergeTodo(local, remote);

      expect(merged).not.toBeNull();
      expect(merged!.tags).toEqual(['local1', 'local2']); // Local is newer
      expect(merged!.subtasks).toHaveLength(1);
      expect(merged!.subtasks[0].text).toBe('Local subtask'); // Local is newer
    });

    it('should handle deleted todos', () => {
      const local = createMockTodo({
        text: 'Local todo'
      });

      // Remote is null (deleted)
      const merged = resolver.mergeTodo(local, null);

      expect(merged).toBeNull(); // Deletion wins
    });
  });

  describe('edge cases', () => {
    it('should handle corrupt JSON gracefully', () => {
      const validTodo = {
        id: uuidv7(),
        text: 'Valid todo',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        },
        dependencies: [],
        subtasks: [],
        comments: []
      };

      const corruptTodo = {
        id: 'not-a-uuid',
        text: 123, // Wrong type
        status: 'invalid-status',
        // Missing required fields
      } as any;

      // Should handle corrupt data without throwing
      expect(() => {
        resolver.mergeTodo(validTodo as Todo, corruptTodo);
      }).not.toThrow();

      // Should prefer valid data
      const merged = resolver.mergeTodo(validTodo as Todo, corruptTodo);
      expect(merged).toBeTruthy();
      expect(merged?.text).toBe('Valid todo');
    });

    it('should handle missing fields in either version', () => {
      const complete = {
        id: uuidv7(),
        text: 'Complete todo',
        description: 'Has description',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: ['tag1'],
        assignee: 'user-123',
        createdBy: 'user-456',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        completedAt: null,
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          assignee: new Date().toISOString(),
          description: new Date().toISOString(),
          dueDate: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      };

      const partial = {
        id: complete.id,
        text: 'Partial todo',
        status: 'done',
        priority: 'high',
        project: 'personal',
        tags: [],
        createdBy: 'user-789',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date(Date.now() + 1000).toISOString(), // Newer
          status: new Date(Date.now() + 1000).toISOString(),
          priority: new Date(Date.now() + 1000).toISOString(),
          project: new Date(Date.now() + 1000).toISOString(),
          tags: new Date(Date.now() + 1000).toISOString(),
          dependencies: new Date(Date.now() + 1000).toISOString(),
          subtasks: new Date(Date.now() + 1000).toISOString(),
          comments: new Date(Date.now() + 1000).toISOString()
        }
      };

      const merged = resolver.mergeTodo(complete as Todo, partial as Todo);

      expect(merged).not.toBeNull();
      expect(merged!.text).toBe('Partial todo'); // Newer
      expect(merged!.description).toBe('Has description'); // Only in complete
      expect(merged!.assignee).toBe('user-123'); // Only in complete
      expect(merged!.dueDate).toBe(complete.dueDate); // Only in complete
    });

    it('should preserve unknown fields', () => {
      const local = {
        id: uuidv7(),
        text: 'Local todo',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        },
        customField: 'custom value' // Unknown field
      } as any;

      const remote = {
        ...local,
        text: 'Remote todo',
        fieldTimestamps: {
          ...local.fieldTimestamps,
          text: new Date(Date.now() - 1000).toISOString() // Older
        }
      };

      const merged = resolver.mergeTodo(local, remote);

      expect((merged as any).customField).toBe('custom value'); // Preserved
    });
  });

  describe('mergeTodos (batch merge)', () => {
    it('should merge multiple todos correctly', () => {
      const todo1 = {
        id: uuidv7(),
        text: 'Todo 1',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      } as Todo;

      const todo2 = {
        id: uuidv7(),
        text: 'Todo 2',
        status: 'done',
        priority: 'high',
        project: 'personal',
        tags: [],
        createdBy: 'user-456',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      } as Todo;

      const localTodos = [todo1];
      const remoteTodos = [
        { ...todo1, text: 'Updated Todo 1', fieldTimestamps: { ...todo1.fieldTimestamps, text: new Date(Date.now() + 1000).toISOString() } },
        todo2
      ];

      const merged = resolver.mergeTodos(localTodos, remoteTodos as Todo[]);

      expect(merged).toHaveLength(2);
      expect(merged.find(t => t.id === todo1.id)?.text).toBe('Updated Todo 1');
      expect(merged.find(t => t.id === todo2.id)?.text).toBe('Todo 2');
    });

    it('should handle deletions in batch merge', () => {
      const todo1 = {
        id: uuidv7(),
        text: 'Todo 1',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      } as Todo;

      const todo2 = {
        id: uuidv7(),
        text: 'Todo 2',
        status: 'done',
        priority: 'high',
        project: 'personal',
        tags: [],
        createdBy: 'user-456',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        dependencies: [],
        subtasks: [],
        comments: [],
        fieldTimestamps: {
          text: new Date().toISOString(),
          status: new Date().toISOString(),
          priority: new Date().toISOString(),
          project: new Date().toISOString(),
          tags: new Date().toISOString(),
          dependencies: new Date().toISOString(),
          subtasks: new Date().toISOString(),
          comments: new Date().toISOString()
        }
      } as Todo;

      const localTodos = [todo1, todo2];
      const remoteTodos = [todo1]; // todo2 was deleted remotely

      const merged = resolver.mergeTodos(localTodos, remoteTodos);

      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe(todo1.id);
    });
  });
});