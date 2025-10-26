import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TodoRepository } from '../data/TodoRepository';
import { SyncManager } from '../git/SyncManager';
import { GitManager } from '../git/GitManager';
import { CreateTodoInput, UpdateTodoInput } from '../types/Todo';
import { addComment } from '../types/Todo';

/**
 * MCP Server implementation for todo operations
 */
export class MCPServer {
  private todoRepo: TodoRepository;
  private syncManager: SyncManager;
  private gitManager: GitManager;

  constructor(
    todoRepo: TodoRepository,
    syncManager: SyncManager,
    gitManager: GitManager
  ) {
    this.todoRepo = todoRepo;
    this.syncManager = syncManager;
    this.gitManager = gitManager;
  }

  /**
   * Get list of available tools
   */
  getTools(): Tool[] {
    return [
      {
        name: 'list_todos',
        description: 'List todos with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'blocked', 'done'],
              description: 'Filter by status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Filter by priority'
            },
            project: {
              type: 'string',
              description: 'Filter by project'
            },
            assignee: {
              type: 'string',
              description: 'Filter by assignee'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags'
            },
            sortBy: {
              type: 'string',
              enum: ['priority', 'createdAt', 'modifiedAt', 'dueDate'],
              description: 'Sort field'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results'
            }
          }
        }
      },
      {
        name: 'get_todo',
        description: 'Get a single todo by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'create_todo',
        description: 'Create a new todo',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Todo text'
            },
            description: {
              type: 'string',
              description: 'Detailed description'
            },
            project: {
              type: 'string',
              description: 'Project name'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Priority level'
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'blocked', 'done'],
              description: 'Initial status'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags'
            },
            assignee: {
              type: 'string',
              description: 'Assignee user ID'
            },
            dueDate: {
              type: 'string',
              description: 'Due date (ISO 8601)'
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of todos this depends on'
            }
          },
          required: ['text', 'project']
        }
      },
      {
        name: 'update_todo',
        description: 'Update an existing todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID'
            },
            text: {
              type: 'string',
              description: 'Updated text'
            },
            description: {
              type: 'string',
              description: 'Updated description'
            },
            status: {
              type: 'string',
              enum: ['todo', 'in-progress', 'blocked', 'done'],
              description: 'Updated status'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Updated priority'
            },
            assignee: {
              type: 'string',
              description: 'Updated assignee'
            },
            dueDate: {
              type: 'string',
              description: 'Updated due date'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated tags'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'delete_todo',
        description: 'Delete (archive) a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'complete_todo',
        description: 'Mark a todo as done',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'add_comment',
        description: 'Add a comment to a todo',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Todo ID'
            },
            comment: {
              type: 'string',
              description: 'Comment text'
            }
          },
          required: ['id', 'comment']
        }
      },
      {
        name: 'search_todos',
        description: 'Search todos by text',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_stats',
        description: 'Get todo statistics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'sync_repository',
        description: 'Manually trigger repository sync',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_history',
        description: 'Get Git history for todos',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of commits',
              default: 10
            }
          }
        }
      }
    ];
  }

  /**
   * Handle tool call
   */
  async handleToolCall(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      switch (name) {
        case 'list_todos':
          return await this.handleListTodos(args);
        case 'get_todo':
          return await this.handleGetTodo(args);
        case 'create_todo':
          return await this.handleCreateTodo(args);
        case 'update_todo':
          return await this.handleUpdateTodo(args);
        case 'delete_todo':
          return await this.handleDeleteTodo(args);
        case 'complete_todo':
          return await this.handleCompleteTodo(args);
        case 'add_comment':
          return await this.handleAddComment(args);
        case 'search_todos':
          return await this.handleSearchTodos(args);
        case 'get_stats':
          return await this.handleGetStats(args);
        case 'sync_repository':
          return await this.handleSyncRepository(args);
        case 'get_history':
          return await this.handleGetHistory(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }

  private async handleListTodos(args: any) {
    const todos = await this.todoRepo.list(args);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todos,
          count: todos.length
        }, null, 2)
      }]
    };
  }

  private async handleGetTodo(args: any) {
    if (!args.id) {
      throw new Error('Missing required parameter: id');
    }

    const todo = await this.todoRepo.get(args.id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todo
        }, null, 2)
      }]
    };
  }

  private async handleCreateTodo(args: any) {
    if (!args.text) {
      throw new Error('Missing required parameter: text');
    }

    if (!args.project) {
      throw new Error('Missing required parameter: project');
    }

    // Validate text is not empty
    if (args.text.trim() === '') {
      throw new Error('Text cannot be empty');
    }

    const input: CreateTodoInput = {
      text: args.text,
      description: args.description,
      project: args.project,
      priority: args.priority || 'medium',
      status: args.status || 'todo',
      tags: args.tags || [],
      assignee: args.assignee,
      dueDate: args.dueDate,
      dependencies: args.dependencies || [],
      createdBy: 'mcp-user'
    };

    const todo = await this.syncManager.createWithSync(input);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todo
        }, null, 2)
      }]
    };
  }

  private async handleUpdateTodo(args: any) {
    if (!args.id) {
      throw new Error('Missing required parameter: id');
    }

    // Verify todo exists
    await this.todoRepo.get(args.id);

    const updates: UpdateTodoInput = {};

    if (args.text !== undefined) updates.text = args.text;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.assignee !== undefined) updates.assignee = args.assignee;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.tags !== undefined) updates.tags = args.tags;

    const todo = await this.syncManager.updateWithSync(args.id, updates);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todo
        }, null, 2)
      }]
    };
  }

  private async handleDeleteTodo(args: any) {
    if (!args.id) {
      throw new Error('Missing required parameter: id');
    }

    // Verify todo exists
    await this.todoRepo.get(args.id);

    await this.syncManager.deleteWithSync(args.id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Todo ${args.id} deleted successfully`
        }, null, 2)
      }]
    };
  }

  private async handleCompleteTodo(args: any) {
    if (!args.id) {
      throw new Error('Missing required parameter: id');
    }

    // Verify todo exists
    await this.todoRepo.get(args.id);

    const todo = await this.todoRepo.complete(args.id);

    // Sync after completion
    await this.syncManager.sync();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todo
        }, null, 2)
      }]
    };
  }

  private async handleAddComment(args: any) {
    if (!args.id) {
      throw new Error('Missing required parameter: id');
    }

    if (!args.comment) {
      throw new Error('Missing required parameter: comment');
    }

    const todo = await this.todoRepo.get(args.id);
    const updatedTodo = addComment(todo, 'mcp-user', args.comment);

    const result = await this.syncManager.updateWithSync(args.id, {
      comments: updatedTodo.comments
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todo: result
        }, null, 2)
      }]
    };
  }

  private async handleSearchTodos(args: any) {
    if (!args.query) {
      throw new Error('Missing required parameter: query');
    }

    if (args.query.trim() === '') {
      throw new Error('Query cannot be empty');
    }

    const todos = await this.todoRepo.search(args.query);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todos,
          count: todos.length
        }, null, 2)
      }]
    };
  }

  private async handleGetStats(_args: any) {
    const stats = await this.todoRepo.getStats();
    const syncStats = this.syncManager.getStats();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          todoStats: stats,
          syncStats
        }, null, 2)
      }]
    };
  }

  private async handleSyncRepository(_args: any) {
    const result = await this.syncManager.sync();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: result.success,
          hasConflicts: result.hasConflicts,
          resolvedConflicts: result.resolvedConflicts,
          error: result.error
        }, null, 2)
      }]
    };
  }

  private async handleGetHistory(args: any) {
    const limit = args.limit || 10;

    // Get git log
    const git = (this.gitManager as any).git;
    const log = await git.log(['-n', limit.toString(), '--', 'todos.json']);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          commits: log.all.map((commit: any) => ({
            hash: commit.hash,
            date: commit.date,
            message: commit.message,
            author: commit.author_name
          }))
        }, null, 2)
      }]
    };
  }
}