import request from 'supertest';
import express from 'express';
import { createApp } from '../server';
import { MCPClient } from '../mcpClient';

// Mock the MCP client
jest.mock('../mcpClient');

describe('Express API Server', () => {
  let app: express.Application;
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock MCP client
    mockMCPClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      callTool: jest.fn(),
      sendRequest: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn().mockReturnValue(10),
      listeners: jest.fn().mockReturnValue([]),
      rawListeners: jest.fn().mockReturnValue([]),
      listenerCount: jest.fn().mockReturnValue(0),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn().mockReturnValue([]),
      addListener: jest.fn(),
      once: jest.fn(),
      off: jest.fn()
    } as any;

    // Mock the MCPClient constructor
    (MCPClient as jest.MockedClass<typeof MCPClient>).mockImplementation(() => mockMCPClient);

    // Create app
    app = createApp();
  });

  afterEach(() => {
    // Clean up
    if (mockMCPClient.disconnect) {
      mockMCPClient.disconnect();
    }
  });

  describe('Server Setup', () => {
    it('should have CORS enabled', async () => {
      const response = await request(app)
        .options('/api/todos')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle JSON requests', async () => {
      mockMCPClient.callTool.mockResolvedValue({ success: true, todos: [] });

      const response = await request(app)
        .get('/api/todos')
        .set('Accept', 'application/json');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should handle health check endpoint', async () => {
      const response = await request(app)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'healthy',
        mcpConnected: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle MCP connection errors', async () => {
      mockMCPClient.isConnected.mockReturnValue(false);

      const response = await request(app)
        .get('/api/todos');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        error: 'MCP server not connected'
      });
    });

    it('should handle MCP call errors', async () => {
      mockMCPClient.callTool.mockRejectedValue(new Error('MCP error'));

      const response = await request(app)
        .get('/api/todos');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: 'MCP error'
      });
    });

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown');

      expect(response.status).toBe(404);
    });
  });

  describe('Middleware', () => {
    it('should parse JSON bodies', async () => {
      mockMCPClient.callTool.mockResolvedValue({ success: true, todo: { id: '1' } });

      await request(app)
        .post('/api/todos')
        .send({ text: 'Test todo', project: 'test' })
        .set('Content-Type', 'application/json');

      expect(mockMCPClient.callTool).toHaveBeenCalledWith(
        'create_todo',
        expect.objectContaining({
          text: 'Test todo',
          project: 'test'
        })
      );
    });

    it('should handle URL encoded bodies', async () => {
      mockMCPClient.callTool.mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/todos')
        .send('text=Test+todo&project=test')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(201);
    });

    it('should log requests in development', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'development';

      mockMCPClient.callTool.mockResolvedValue({ success: true, todos: [] });

      await request(app).get('/api/todos');

      // In development, we should see request logging
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      delete process.env.NODE_ENV;
    });
  });

  describe('Graceful Shutdown', () => {
    it('should disconnect MCP client on server close', () => {
      const server = app.listen(0);

      server.close();

      // Verify MCP client is disconnected
      expect(mockMCPClient.disconnect).toHaveBeenCalled();
    });
  });
});