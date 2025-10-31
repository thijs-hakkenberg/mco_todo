import { MCPServer } from '../../../../src/server/MCPServer';
import { TodoRepository } from '../../../../src/data/TodoRepository';
import { SyncManager } from '../../../../src/git/SyncManager';
import { GitManager } from '../../../../src/git/GitManager';
import { createTodo } from '../../../../src/types/Todo';
import { uuidv7 } from 'uuidv7';

// Mock dependencies
jest.mock('../../../../src/data/TodoRepository');
jest.mock('../../../../src/git/SyncManager');
jest.mock('../../../../src/git/GitManager');

describe('Todo MCP Tools', () => {
  let mcpServer: MCPServer;
  let mockTodoRepo: jest.Mocked<TodoRepository>;
  let mockSyncManager: jest.Mocked<SyncManager>;
  let mockGitManager: jest.Mocked<GitManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mocks
    mockTodoRepo = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
      list: jest.fn(),
      search: jest.fn(),
      complete: jest.fn(),
      getStats: jest.fn(),
      getOverdue: jest.fn(),
      getDueToday: jest.fn(),
      getDueThisWeek: jest.fn()
    } as any;

    mockSyncManager = {
      sync: jest.fn().mockResolvedValue({ success: true }),
      createWithSync: jest.fn(),
      updateWithSync: jest.fn(),
      deleteWithSync: jest.fn(),
      isSyncing: jest.fn().mockReturnValue(false),
      getLastSyncTime: jest.fn(),
      getStats: jest.fn()
    } as any;

    mockGitManager = {
      getStatus: jest.fn(),
      getCurrentBranch: jest.fn(),
      commit: jest.fn(),
      push: jest.fn()
    } as any;

    mcpServer = new MCPServer(mockTodoRepo, mockSyncManager, mockGitManager);
  });

  describe('create_todo', () => {
    it('should validate required parameters', async () => {
      const result = await mcpServer.handleToolCall('create_todo', {});

      expect(result.content[0].text).toContain('Missing required parameter: text');
    });

    it('should create todo via repository', async () => {
      const newTodo = createTodo({
        id: uuidv7(),
        text: 'Test todo',
        project: 'work',
        createdBy: 'mcp-user'
      });

      mockSyncManager.createWithSync.mockResolvedValue(newTodo);

      const result = await mcpServer.handleToolCall('create_todo', {
        text: 'Test todo',
        project: 'work',
        priority: 'medium'
      });

      expect(mockSyncManager.createWithSync).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Test todo',
          project: 'work',
          priority: 'medium'
        })
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo.text).toBe('Test todo');
    });

    it('should trigger sync after creation', async () => {
      const newTodo = createTodo({
        text: 'Test todo',
        project: 'work',
        createdBy: 'mcp-user'
      });

      mockSyncManager.createWithSync.mockResolvedValue(newTodo);

      await mcpServer.handleToolCall('create_todo', {
        text: 'Test todo',
        project: 'work'
      });

      expect(mockSyncManager.createWithSync).toHaveBeenCalled();
    });

    it('should return formatted MCP response', async () => {
      const newTodo = createTodo({
        id: uuidv7(),
        text: 'Test todo',
        project: 'work',
        createdBy: 'mcp-user'
      });

      mockSyncManager.createWithSync.mockResolvedValue(newTodo);

      const result = await mcpServer.handleToolCall('create_todo', {
        text: 'Test todo',
        project: 'work'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo).toBeDefined();
    });

    it('should handle validation errors', async () => {
      const result = await mcpServer.handleToolCall('create_todo', {
        text: '',  // Empty text should fail
        project: 'work'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameter: text');
    });

    it('should handle sync failures', async () => {
      mockSyncManager.createWithSync.mockRejectedValue(new Error('Sync failed'));

      const result = await mcpServer.handleToolCall('create_todo', {
        text: 'Test todo',
        project: 'work'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Sync failed');
    });
  });

  describe('list_todos', () => {
    it('should accept filter parameters', async () => {
      const todos = [
        createTodo({
          text: 'Todo 1',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Todo 2',
          status: 'done',
          project: 'personal',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        status: 'todo',
        project: 'work'
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        status: 'todo',
        project: 'work'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toHaveLength(2);
    });

    it('should return filtered results', async () => {
      const todos = [
        createTodo({
          text: 'Filtered todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        status: 'todo'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.todos).toHaveLength(1);
      expect(response.todos[0].text).toBe('Filtered todo');
    });

    it('should format as MCP response', async () => {
      mockTodoRepo.list.mockResolvedValue([]);

      const result = await mcpServer.handleToolCall('list_todos', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toEqual([]);
    });

    it('should handle empty results', async () => {
      mockTodoRepo.list.mockResolvedValue([]);

      const result = await mcpServer.handleToolCall('list_todos', {
        status: 'done'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toEqual([]);
      expect(response.count).toBe(0);
    });

    // TDD Phase RED: New tests for field selection
    it('should accept mode parameter for field selection', async () => {
      const todos = [
        createTodo({
          text: 'Test todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        mode: 'minimal'
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        mode: 'minimal'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toHaveLength(1);
    });

    it('should accept fields parameter for custom field selection', async () => {
      const todos = [
        createTodo({
          text: 'Test todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        fields: ['id', 'text', 'status']
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        fields: ['id', 'text', 'status']
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should accept excludeFields parameter', async () => {
      const todos = [
        createTodo({
          text: 'Test todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        excludeFields: ['comments', 'fieldTimestamps']
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        excludeFields: ['comments', 'fieldTimestamps']
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should accept includeCompleted parameter', async () => {
      const todos = [
        createTodo({
          text: 'Active todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        includeCompleted: false
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        includeCompleted: false
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toHaveLength(1);
    });

    it('should accept includeNullDates parameter', async () => {
      const todos = [
        createTodo({
          text: 'Test todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        includeNullDates: true
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        includeNullDates: true
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should accept sortOrder parameter (currently missing)', async () => {
      const todos = [
        createTodo({
          text: 'Todo 1',
          status: 'todo',
          project: 'work',
          priority: 'high',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Todo 2',
          status: 'todo',
          project: 'work',
          priority: 'low',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should accept offset parameter (currently missing)', async () => {
      const todos = [
        createTodo({
          text: 'Test todo',
          status: 'todo',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        limit: 10,
        offset: 5
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        limit: 10,
        offset: 5
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should combine multiple filter options', async () => {
      const todos = [
        createTodo({
          text: 'Active high priority todo',
          status: 'in-progress',
          project: 'work',
          priority: 'high',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.list.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('list_todos', {
        mode: 'standard',
        includeCompleted: false,
        priority: 'high',
        project: 'work'
      });

      expect(mockTodoRepo.list).toHaveBeenCalledWith({
        mode: 'standard',
        includeCompleted: false,
        priority: 'high',
        project: 'work'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toHaveLength(1);
    });
  });

  describe('update_todo', () => {
    it('should validate todo ID exists', async () => {
      mockTodoRepo.get.mockRejectedValue(new Error('Todo not found'));

      const result = await mcpServer.handleToolCall('update_todo', {
        id: 'non-existent',
        text: 'Updated text'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Todo not found');
    });

    it('should accept partial updates', async () => {
      const todoId = uuidv7();
      const existingTodo = createTodo({
        id: todoId,
        text: 'Original text',
        status: 'todo',
        project: 'work',
        createdBy: 'user-123'
      });

      const updatedTodo = {
        ...existingTodo,
        text: 'Updated text'
      };

      mockTodoRepo.get.mockResolvedValue(existingTodo);
      mockSyncManager.updateWithSync.mockResolvedValue(updatedTodo);

      const result = await mcpServer.handleToolCall('update_todo', {
        id: todoId,
        text: 'Updated text'
      });

      expect(mockSyncManager.updateWithSync).toHaveBeenCalledWith(todoId, {
        text: 'Updated text'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo.text).toBe('Updated text');
    });

    it('should trigger sync after update', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'Updated',
        project: 'work',
        createdBy: 'user-123'
      });

      mockTodoRepo.get.mockResolvedValue(todo);
      mockSyncManager.updateWithSync.mockResolvedValue(todo);

      await mcpServer.handleToolCall('update_todo', {
        id: todoId,
        status: 'done'
      });

      expect(mockSyncManager.updateWithSync).toHaveBeenCalled();
    });

    it('should handle concurrent updates', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'Test',
        project: 'work',
        createdBy: 'user-123'
      });

      mockTodoRepo.get.mockResolvedValue(todo);
      mockSyncManager.updateWithSync
        .mockRejectedValueOnce(new Error('Concurrent update detected'))
        .mockResolvedValueOnce(todo);

      const result1 = mcpServer.handleToolCall('update_todo', {
        id: todoId,
        text: 'Update 1'
      });

      const result2 = mcpServer.handleToolCall('update_todo', {
        id: todoId,
        text: 'Update 2'
      });

      const [res1, res2] = await Promise.all([result1, result2]);

      const response1 = JSON.parse(res1.content[0].text);
      expect(response1.success).toBe(false);

      const response2 = JSON.parse(res2.content[0].text);
      expect(response2.success).toBe(true);
    });
  });

  describe('delete_todo', () => {
    it('should validate todo ID exists', async () => {
      mockTodoRepo.get.mockRejectedValue(new Error('Todo not found'));

      const result = await mcpServer.handleToolCall('delete_todo', {
        id: 'non-existent'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Todo not found');
    });

    it('should soft delete by default', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'To delete',
        project: 'work',
        createdBy: 'user-123'
      });

      mockTodoRepo.get.mockResolvedValue(todo);
      mockSyncManager.deleteWithSync.mockResolvedValue(undefined);

      const result = await mcpServer.handleToolCall('delete_todo', {
        id: todoId
      });

      expect(mockSyncManager.deleteWithSync).toHaveBeenCalledWith(todoId);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    it('should trigger sync after delete', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'To delete',
        project: 'work',
        createdBy: 'user-123'
      });

      mockTodoRepo.get.mockResolvedValue(todo);
      mockSyncManager.deleteWithSync.mockResolvedValue(undefined);

      await mcpServer.handleToolCall('delete_todo', {
        id: todoId
      });

      expect(mockSyncManager.deleteWithSync).toHaveBeenCalled();
    });
  });

  describe('complete_todo', () => {
    it('should mark todo as done', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'To complete',
        status: 'in-progress',
        project: 'work',
        createdBy: 'user-123'
      });

      const completedTodo = {
        ...todo,
        status: 'done' as const,
        completedAt: new Date().toISOString()
      };

      mockTodoRepo.get.mockResolvedValue(todo);
      mockTodoRepo.complete.mockResolvedValue(completedTodo);
      mockSyncManager.sync.mockResolvedValue({ success: true, hasConflicts: false });

      const result = await mcpServer.handleToolCall('complete_todo', {
        id: todoId
      });

      expect(mockTodoRepo.complete).toHaveBeenCalledWith(todoId);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo.status).toBe('done');
      expect(response.todo.completedAt).toBeDefined();
    });
  });

  describe('get_todo', () => {
    it('should get single todo by ID', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123'
      });

      mockTodoRepo.get.mockResolvedValue(todo);

      const result = await mcpServer.handleToolCall('get_todo', {
        id: todoId
      });

      expect(mockTodoRepo.get).toHaveBeenCalledWith(todoId);

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo.id).toBe(todoId);
      expect(response.todo.text).toBe('Test todo');
    });

    it('should handle not found', async () => {
      mockTodoRepo.get.mockRejectedValue(new Error('Todo not found'));

      const result = await mcpServer.handleToolCall('get_todo', {
        id: 'non-existent'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Todo not found');
    });
  });

  describe('search_todos', () => {
    it('should search todos by query', async () => {
      const todos = [
        createTodo({
          text: 'Implement search feature',
          project: 'work',
          createdBy: 'user-123'
        }),
        createTodo({
          text: 'Fix search bug',
          project: 'work',
          createdBy: 'user-123'
        })
      ];

      mockTodoRepo.search.mockResolvedValue(todos);

      const result = await mcpServer.handleToolCall('search_todos', {
        query: 'search'
      });

      expect(mockTodoRepo.search).toHaveBeenCalledWith('search');

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todos).toHaveLength(2);
    });

    it('should handle empty query', async () => {
      const result = await mcpServer.handleToolCall('search_todos', {
        query: ''
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parameter: query');
    });
  });

  describe('add_comment', () => {
    it('should add comment to todo', async () => {
      const todoId = uuidv7();
      const todo = createTodo({
        id: todoId,
        text: 'Test todo',
        project: 'work',
        createdBy: 'user-123',
        comments: []
      });

      const todoWithComment = {
        ...todo,
        comments: [{
          id: uuidv7(),
          user: 'mcp-user',
          text: 'Test comment',
          timestamp: new Date().toISOString()
        }]
      };

      mockTodoRepo.get.mockResolvedValue(todo);
      mockSyncManager.updateWithSync.mockResolvedValue(todoWithComment);

      const result = await mcpServer.handleToolCall('add_comment', {
        id: todoId,
        comment: 'Test comment'
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.todo.comments).toHaveLength(1);
      expect(response.todo.comments[0].text).toBe('Test comment');
    });
  });
});