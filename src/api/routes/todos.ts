import { Router, Request, Response } from 'express';
import { MCPClient } from '../mcpClient';

/**
 * Create todo routes with MCP client
 */
export function createTodoRoutes(mcpClient: MCPClient): Router {
  const router = Router();

  // List todos with optional filters
  router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: any = {};

      // Extract query parameters
      if (req.query.status) filters.status = req.query.status;
      if (req.query.priority) filters.priority = req.query.priority;
      if (req.query.project) filters.project = req.query.project;
      if (req.query.assignee) filters.assignee = req.query.assignee;
      if (req.query.sortBy) filters.sortBy = req.query.sortBy;
      if (req.query.limit) filters.limit = req.query.limit;

      // Handle tags array
      if (req.query.tags) {
        filters.tags = Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags];
      }

      const result = await mcpClient.callTool('list_todos', filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search todos
  router.get('/search', async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.query.q || req.query.query;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const result = await mcpClient.callTool('search_todos', { query });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get filter options (projects, tags, assignees, priorities)
  router.get('/filter-options', async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await mcpClient.callTool('get_filter_options', {});
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single todo
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await mcpClient.callTool('get_todo', { id: req.params.id });

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create todo
  router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate required fields
      if (!req.body.text || !req.body.project) {
        res.status(400).json({ error: 'Missing required fields: text and project' });
        return;
      }

      const result = await mcpClient.callTool('create_todo', req.body);

      if (!result.success) {
        res.status(400).json({ error: result.error || 'Failed to create todo' });
        return;
      }

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Batch create todos
  router.post('/batch', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body.todos || !Array.isArray(req.body.todos)) {
        res.status(400).json({ error: 'Todos array is required' });
        return;
      }

      if (req.body.todos.length === 0) {
        res.status(400).json({ error: 'Todos array cannot be empty' });
        return;
      }

      const result = await mcpClient.callTool('batch_create_todos', { todos: req.body.todos });

      if (!result.success) {
        res.status(400).json({ error: result.error || 'Failed to create todos' });
        return;
      }

      res.status(201).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update todo
  router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const updates = { ...req.body, id: req.params.id };
      const result = await mcpClient.callTool('update_todo', updates);

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update todo status
  router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
    try {
      const validStatuses = ['todo', 'in-progress', 'blocked', 'done'];

      if (!req.body.status || !validStatuses.includes(req.body.status)) {
        res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
        return;
      }

      const result = await mcpClient.callTool('update_todo', {
        id: req.params.id,
        status: req.body.status
      });

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Complete todo
  router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await mcpClient.callTool('complete_todo', { id: req.params.id });

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add comment
  router.post('/:id/comment', async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.body.comment) {
        res.status(400).json({ error: 'Comment text is required' });
        return;
      }

      const result = await mcpClient.callTool('add_comment', {
        id: req.params.id,
        comment: req.body.comment
      });

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete todo
  router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await mcpClient.callTool('delete_todo', { id: req.params.id });

      if (!result.success) {
        res.status(404).json({ error: result.error || 'Todo not found' });
        return;
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}