import { TodoRepository } from '../../../src/data/TodoRepository';
import { GitManager } from '../../../src/git/GitManager';
import { Todo, createTodo } from '../../../src/types/Todo';
import * as fs from 'fs/promises';
import * as path from 'path';
import { uuidv7 } from 'uuidv7';

// Mock dependencies
jest.mock('../../../src/git/GitManager');
jest.mock('fs/promises');

describe('TodoRepository', () => {
  let repo: TodoRepository;
  let mockGitManager: jest.Mocked<GitManager>;
  const testRepoPath = '/test/repo/path';
  const todosFilePath = path.join(testRepoPath, 'todos.json');

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock GitManager
    mockGitManager = {
      writeFileAtomic: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue({ success: true }),
      syncWithRetry: jest.fn().mockResolvedValue({ success: true })
    } as any;

    // Mock fs functions
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ todos: [] }));
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    // Create repository instance and initialize
    repo = new TodoRepository(testRepoPath, mockGitManager);
    await repo.initialize();
  });

  describe('create', () => {
    it('should create todo with generated ID', async () => {
      const input = {
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123'
      };

      const todo = await repo.create(input);

      expect(todo.id).toBeDefined();
      expect(todo.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(todo.text).toBe('Test todo');
    });

    it('should set createdAt timestamp', async () => {
      const input = {
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123'
      };

      const before = Date.now();
      const todo = await repo.create(input);
      const after = Date.now();

      const createdTime = new Date(todo.createdAt).getTime();
      expect(createdTime).toBeGreaterThanOrEqual(before);
      expect(createdTime).toBeLessThanOrEqual(after);
    });

    it('should initialize all field timestamps', async () => {
      const input = {
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123',
        tags: ['test']
      };

      const todo = await repo.create(input);

      expect(todo.fieldTimestamps).toBeDefined();
      expect(todo.fieldTimestamps.text).toBeDefined();
      expect(todo.fieldTimestamps.project).toBeDefined();
      expect(todo.fieldTimestamps.tags).toBeDefined();
    });

    it('should validate input data', async () => {
      const invalidInput = {
        text: '', // Empty text should fail validation
        project: 'work',
        createdBy: 'user-123'
      };

      await expect(repo.create(invalidInput)).rejects.toThrow();
    });

    it('should persist to todos.json', async () => {
      const input = {
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123'
      };

      const todo = await repo.create(input);

      expect(mockGitManager.writeFileAtomic).toHaveBeenCalledWith(
        todosFilePath,
        expect.stringContaining(todo.id)
      );
    });
  });

  describe('update', () => {
    let existingTodo: Todo;

    beforeEach(async () => {
      existingTodo = createTodo({
        id: uuidv7(),
        text: 'Original text',
        status: 'todo',
        priority: 'medium',
        project: 'work',
        tags: [],
        createdBy: 'user-123'
      });

      // Re-initialize repo with existing todo
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos: [existingTodo] })
      );
      await repo.reload();
    });

    it('should update only specified fields', async () => {
      const updates = {
        text: 'Updated text',
        priority: 'high' as const
      };

      const updated = await repo.update(existingTodo.id, updates);

      expect(updated.text).toBe('Updated text');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo'); // Unchanged
      expect(updated.project).toBe('work'); // Unchanged
    });

    it('should update field timestamps for changed fields', async () => {
      const originalTextTimestamp = existingTodo.fieldTimestamps.text;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await repo.update(existingTodo.id, {
        text: 'New text'
      });

      expect(updated.fieldTimestamps.text).not.toBe(originalTextTimestamp);
      expect(new Date(updated.fieldTimestamps.text).getTime())
        .toBeGreaterThan(new Date(originalTextTimestamp).getTime());
    });

    it('should not update timestamps for unchanged fields', async () => {
      const originalTimestamps = { ...existingTodo.fieldTimestamps };

      const updated = await repo.update(existingTodo.id, {
        text: existingTodo.text // Same value
      });

      expect(updated.fieldTimestamps).toEqual(originalTimestamps);
    });

    it('should validate partial updates', async () => {
      await expect(repo.update(existingTodo.id, {
        status: 'invalid-status' as any
      })).rejects.toThrow();
    });

    it('should handle concurrent updates', async () => {
      // Simulate concurrent updates
      const update1 = repo.update(existingTodo.id, { text: 'Update 1' });
      const update2 = repo.update(existingTodo.id, { priority: 'high' as const });

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both updates should succeed (last one wins for file write)
      expect(result1.text).toBe('Update 1');
      expect(result2.priority).toBe('high');
    });

    it('should throw error if todo not found', async () => {
      await expect(repo.update('non-existent-id', { text: 'New text' }))
        .rejects.toThrow('Todo not found');
    });
  });

  describe('list', () => {
    let todos: Todo[];

    beforeEach(async () => {
      todos = [
        createTodo({
          text: 'Todo 1',
          status: 'todo',
          priority: 'high',
          project: 'work',
          tags: ['backend'],
          assignee: 'user-123',
          createdBy: 'user-456'
        }),
        createTodo({
          text: 'Todo 2',
          status: 'done',
          priority: 'low',
          project: 'personal',
          tags: ['frontend'],
          assignee: 'user-789',
          createdBy: 'user-456'
        }),
        createTodo({
          text: 'Todo 3',
          status: 'in-progress',
          priority: 'medium',
          project: 'work',
          tags: ['backend', 'urgent'],
          assignee: 'user-123',
          createdBy: 'user-456'
        })
      ];

      // Re-initialize repo with todos
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos })
      );
      await repo.reload();
    });

    it('should filter by status', async () => {
      const result = await repo.list({ status: 'todo' });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Todo 1');
    });

    it('should filter by project', async () => {
      const result = await repo.list({ project: 'work' });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.text)).toContain('Todo 1');
      expect(result.map(t => t.text)).toContain('Todo 3');
    });

    it('should filter by assignee', async () => {
      const result = await repo.list({ assignee: 'user-123' });

      expect(result).toHaveLength(2);
      expect(result.every(t => t.assignee === 'user-123')).toBe(true);
    });

    it('should filter by tags', async () => {
      const result = await repo.list({ tags: ['backend'] });

      expect(result).toHaveLength(2);
      expect(result.map(t => t.text)).toContain('Todo 1');
      expect(result.map(t => t.text)).toContain('Todo 3');
    });

    it('should combine multiple filters', async () => {
      const result = await repo.list({
        project: 'work',
        status: 'in-progress',
        tags: ['backend']
      });

      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Todo 3');
    });

    it('should sort by priority', async () => {
      // Add a todo with urgent priority
      const urgentTodo = createTodo({
        text: 'Urgent Todo',
        status: 'todo',
        priority: 'urgent',
        project: 'work',
        tags: [],
        createdBy: 'user-456'
      });

      todos.push(urgentTodo);
      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos })
      );
      await repo.reload();

      const result = await repo.list({ sortBy: 'priority' });

      expect(result[0].priority).toBe('urgent');
      expect(result[1].priority).toBe('high');
      expect(result[2].priority).toBe('medium');
      expect(result[3].priority).toBe('low');
    });

    it('should paginate results', async () => {
      const page1 = await repo.list({ limit: 2, offset: 0 });
      const page2 = await repo.list({ limit: 2, offset: 2 });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0]?.id);
    });
  });

  describe('delete', () => {
    let existingTodo: Todo;

    beforeEach(async () => {
      existingTodo = createTodo({
        id: uuidv7(),
        text: 'Todo to delete',
        project: 'work',
        createdBy: 'user-123'
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos: [existingTodo] })
      );
      await repo.reload();
    });

    it('should soft delete (archive) by default', async () => {
      await repo.delete(existingTodo.id);

      // Check that todo is marked as archived
      const writeCall = mockGitManager.writeFileAtomic.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      const archivedTodo = writtenData.todos.find((t: any) => t.id === existingTodo.id);
      expect(archivedTodo.archived).toBe(true);
    });

    it('should update archived timestamp', async () => {
      const before = Date.now();
      await repo.delete(existingTodo.id);
      const after = Date.now();

      const writeCall = mockGitManager.writeFileAtomic.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      const archivedTodo = writtenData.todos.find((t: any) => t.id === existingTodo.id);

      const archivedTime = new Date(archivedTodo.archivedAt).getTime();
      expect(archivedTime).toBeGreaterThanOrEqual(before);
      expect(archivedTime).toBeLessThanOrEqual(after);
    });

    it('should remove from active list', async () => {
      await repo.delete(existingTodo.id);

      // List should not include archived todos by default
      const activeTodos = await repo.list();
      expect(activeTodos).toHaveLength(0);
    });

    it('should throw error if todo not found', async () => {
      await expect(repo.delete('non-existent-id'))
        .rejects.toThrow('Todo not found');
    });
  });

  describe('get', () => {
    let existingTodo: Todo;

    beforeEach(async () => {
      existingTodo = createTodo({
        id: uuidv7(),
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123'
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos: [existingTodo] })
      );
      await repo.reload();
    });

    it('should get todo by ID', async () => {
      const todo = await repo.get(existingTodo.id);

      expect(todo).toBeDefined();
      expect(todo.id).toBe(existingTodo.id);
      expect(todo.text).toBe('Test todo');
    });

    it('should throw error if todo not found', async () => {
      await expect(repo.get('non-existent-id'))
        .rejects.toThrow('Todo not found');
    });
  });

  describe('initialization', () => {
    it('should create todos.json if not exists', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));

      await repo.initialize();

      expect(mockGitManager.writeFileAtomic).toHaveBeenCalledWith(
        todosFilePath,
        JSON.stringify({ todos: [] }, null, 2)
      );
    });

    it('should not overwrite existing todos.json', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await repo.initialize();

      expect(mockGitManager.writeFileAtomic).not.toHaveBeenCalled();
    });
  });

  describe('sync operations', () => {
    it('should reload todos after sync', async () => {
      const originalTodos = [createTodo({
        text: 'Original',
        project: 'work',
        createdBy: 'user-123'
      })];

      const newTodos = [createTodo({
        text: 'Updated after sync',
        project: 'work',
        createdBy: 'user-123'
      })];

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify({ todos: originalTodos }))
        .mockResolvedValueOnce(JSON.stringify({ todos: newTodos }));

      await repo.initialize();
      const beforeSync = await repo.list();
      expect(beforeSync[0].text).toBe('Original');

      await repo.reload();
      const afterSync = await repo.list();
      expect(afterSync[0].text).toBe('Updated after sync');
    });
  });

  describe('search', () => {
    let todos: Todo[];

    beforeEach(async () => {
      todos = [
        createTodo({
          text: 'Implement search functionality',
          description: 'Add full-text search to the application',
          project: 'work',
          tags: ['backend', 'feature'],
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Fix search bug',
          description: 'Search results are not sorted correctly',
          project: 'work',
          tags: ['bug'],
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Write tests',
          description: 'Add unit tests for new features',
          project: 'work',
          tags: ['testing'],
          createdBy: 'user-123'
        })
      ];

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos })
      );
      await repo.reload();
    });

    it('should search in text field', async () => {
      const results = await repo.search('search');

      expect(results).toHaveLength(2);
      expect(results.map(t => t.text)).toContain('Implement search functionality');
      expect(results.map(t => t.text)).toContain('Fix search bug');
    });

    it('should search in description field', async () => {
      const results = await repo.search('sorted');

      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Fix search bug');
    });

    it('should be case insensitive', async () => {
      const results = await repo.search('SEARCH');

      expect(results).toHaveLength(2);
    });
  });

  describe('filter options', () => {
    beforeEach(async () => {
      const todos = [
        createTodo({
          text: 'Frontend task 1',
          project: 'frontend',
          priority: 'high',
          tags: ['ui', 'react'],
          assignee: 'alice',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Backend task 1',
          project: 'backend',
          priority: 'urgent',
          tags: ['api', 'nodejs'],
          assignee: 'bob',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Frontend task 2',
          project: 'frontend',
          priority: 'medium',
          tags: ['ui', 'css'],
          assignee: 'alice',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'DevOps task',
          project: 'infrastructure',
          priority: 'low',
          tags: ['docker', 'ci'],
          createdBy: 'user-123'
        })
      ];

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({ todos })
      );
      await repo.reload();
    });

    describe('getProjects', () => {
      it('should return distinct projects sorted alphabetically', async () => {
        const projects = await repo.getProjects();

        expect(projects).toEqual(['backend', 'frontend', 'infrastructure']);
      });

      it('should return empty array when no todos exist', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos: [] })
        );
        await repo.reload();

        const projects = await repo.getProjects();

        expect(projects).toEqual([]);
      });

      it('should not include archived todos', async () => {
        const todos = [
          createTodo({
            text: 'Active',
            project: 'active-project',
            createdBy: 'user-123'
          }),
          {
            ...createTodo({
              text: 'Archived',
              project: 'archived-project',
              createdBy: 'user-123'
            }),
            archived: true
          }
        ];

        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos })
        );
        await repo.reload();

        const projects = await repo.getProjects();

        expect(projects).toEqual(['active-project']);
      });
    });

    describe('getTags', () => {
      it('should return distinct tags sorted alphabetically', async () => {
        const tags = await repo.getTags();

        expect(tags).toEqual(['api', 'ci', 'css', 'docker', 'nodejs', 'react', 'ui']);
      });

      it('should flatten tags from multiple todos', async () => {
        const todos = [
          createTodo({
            text: 'Task 1',
            project: 'project1',
            tags: ['a', 'b'],
            createdBy: 'user-123'
          }),
          createTodo({
            text: 'Task 2',
            project: 'project1',
            tags: ['b', 'c'],
            createdBy: 'user-123'
          })
        ];

        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos })
        );
        await repo.reload();

        const tags = await repo.getTags();

        expect(tags).toEqual(['a', 'b', 'c']);
      });

      it('should return empty array when no todos have tags', async () => {
        const todos = [
          createTodo({
            text: 'Task without tags',
            project: 'project1',
            createdBy: 'user-123'
          })
        ];

        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos })
        );
        await repo.reload();

        const tags = await repo.getTags();

        expect(tags).toEqual([]);
      });
    });

    describe('getAssignees', () => {
      it('should return distinct assignees sorted alphabetically', async () => {
        const assignees = await repo.getAssignees();

        expect(assignees).toEqual(['alice', 'bob']);
      });

      it('should not include undefined assignees', async () => {
        const todos = [
          createTodo({
            text: 'Assigned task',
            project: 'project1',
            assignee: 'charlie',
            createdBy: 'user-123'
          }),
          createTodo({
            text: 'Unassigned task',
            project: 'project1',
            createdBy: 'user-123'
          })
        ];

        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos })
        );
        await repo.reload();

        const assignees = await repo.getAssignees();

        expect(assignees).toEqual(['charlie']);
      });

      it('should return empty array when no todos are assigned', async () => {
        const todos = [
          createTodo({
            text: 'Unassigned',
            project: 'project1',
            createdBy: 'user-123'
          })
        ];

        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos })
        );
        await repo.reload();

        const assignees = await repo.getAssignees();

        expect(assignees).toEqual([]);
      });
    });

    describe('getPriorities', () => {
      it('should return all priority levels', async () => {
        const priorities = await repo.getPriorities();

        expect(priorities).toEqual(['urgent', 'high', 'medium', 'low']);
      });
    });

    describe('getFilterOptions', () => {
      it('should return all filter options', async () => {
        const options = await repo.getFilterOptions();

        expect(options).toEqual({
          projects: ['backend', 'frontend', 'infrastructure'],
          tags: ['api', 'ci', 'css', 'docker', 'nodejs', 'react', 'ui'],
          assignees: ['alice', 'bob'],
          priorities: ['urgent', 'high', 'medium', 'low']
        });
      });

      it('should return empty arrays when no todos exist', async () => {
        (fs.readFile as jest.Mock).mockResolvedValue(
          JSON.stringify({ todos: [] })
        );
        await repo.reload();

        const options = await repo.getFilterOptions();

        expect(options).toEqual({
          projects: [],
          tags: [],
          assignees: [],
          priorities: ['urgent', 'high', 'medium', 'low']
        });
      });
    });
  });
});