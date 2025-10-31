/**
 * Tests for TodoRepository default filtering behavior (includeCompleted)
 * TDD Phase: RED - These tests should fail until implementation is complete
 */

import { TodoRepository } from '../../src/data/TodoRepository';
import { GitManager } from '../../src/git/GitManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

describe('TodoRepository Default Filters', () => {
  let repository: TodoRepository;
  let gitManager: GitManager;
  let testDir: string;
  let todosPath: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../test-repos', `default-filters-${Date.now()}`);
    todosPath = path.join(testDir, 'todos.json');

    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(todosPath, JSON.stringify({ todos: [] }));

    gitManager = new GitManager(testDir);
    await gitManager.initialize();

    // Configure git user for commits
    await execPromise(`cd "${testDir}" && git config user.email "test@example.com" && git config user.name "Test User"`);

    repository = new TodoRepository(testDir, gitManager);
    await repository.initialize();
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('includeCompleted option', () => {
    beforeEach(async () => {
      // Create a mix of todos with different statuses
      await repository.create({
        text: 'Todo task',
        project: 'test',
        status: 'todo',
        priority: 'medium',
        createdBy: 'test-user',
      });

      await repository.create({
        text: 'In progress task',
        project: 'test',
        status: 'in-progress',
        priority: 'high',
        createdBy: 'test-user',
      });

      await repository.create({
        text: 'Blocked task',
        project: 'test',
        status: 'blocked',
        priority: 'low',
        createdBy: 'test-user',
      });

      await repository.create({
        text: 'Done task 1',
        project: 'test',
        status: 'done',
        priority: 'medium',
        createdBy: 'test-user',
      });

      await repository.create({
        text: 'Done task 2',
        project: 'test',
        status: 'done',
        priority: 'high',
        createdBy: 'test-user',
      });
    });

    it('should exclude done todos when includeCompleted is false', async () => {
      const todos = await repository.list({ includeCompleted: false });

      expect(todos).toHaveLength(3);

      const statuses = todos.map(t => t.status);
      expect(statuses).toContain('todo');
      expect(statuses).toContain('in-progress');
      expect(statuses).toContain('blocked');
      expect(statuses).not.toContain('done');
    });

    it('should include done todos when includeCompleted is true', async () => {
      const todos = await repository.list({ includeCompleted: true });

      expect(todos).toHaveLength(5);

      const statuses = todos.map(t => t.status);
      expect(statuses).toContain('todo');
      expect(statuses).toContain('in-progress');
      expect(statuses).toContain('blocked');
      expect(statuses).toContain('done');
    });

    it('should include all todos when includeCompleted is not specified (backward compatibility)', async () => {
      const todos = await repository.list({});

      expect(todos).toHaveLength(5);

      const statuses = todos.map(t => t.status);
      expect(statuses).toContain('done');
    });

    it('should work with other filters combined', async () => {
      const todos = await repository.list({
        includeCompleted: false,
        priority: 'high'
      });

      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe('In progress task');
      expect(todos[0].status).toBe('in-progress');
      expect(todos[0].priority).toBe('high');
    });

    it('should work with status filter (status filter takes precedence)', async () => {
      // When both includeCompleted: false and status: 'done' are set,
      // the explicit status filter should take precedence
      const todos = await repository.list({
        includeCompleted: false,
        status: 'done'
      });

      // Status filter takes precedence, so should return done todos
      expect(todos).toHaveLength(2);
      expect(todos.every(t => t.status === 'done')).toBe(true);
    });

    it('should work with field selection modes', async () => {
      const todos = await repository.list({
        includeCompleted: false,
        mode: 'minimal'
      });

      expect(todos).toHaveLength(3);

      // Should only have minimal fields
      expect(todos[0]).toHaveProperty('id');
      expect(todos[0]).toHaveProperty('text');
      expect(todos[0]).toHaveProperty('status');
      expect(todos[0]).not.toHaveProperty('fieldTimestamps');

      // Should not include done todos
      expect(todos.every(t => t.status !== 'done')).toBe(true);
    });

    it('should work with sorting', async () => {
      const todos = await repository.list({
        includeCompleted: false,
        sortBy: 'priority',
        sortOrder: 'desc'
      });

      expect(todos).toHaveLength(3);
      expect(todos[0].priority).toBe('high');
      expect(todos[1].priority).toBe('medium');
      expect(todos[2].priority).toBe('low');
    });

    it('should work with pagination', async () => {
      const todos = await repository.list({
        includeCompleted: false,
        limit: 2,
        offset: 0
      });

      expect(todos).toHaveLength(2);
      expect(todos.every(t => t.status !== 'done')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when all todos are done and includeCompleted is false', async () => {
      await repository.create({
        text: 'Done task',
        project: 'test',
        status: 'done',
        priority: 'low',
        createdBy: 'test-user',
      });

      const todos = await repository.list({ includeCompleted: false });

      expect(todos).toHaveLength(0);
    });

    it('should work with empty repository', async () => {
      const todos = await repository.list({ includeCompleted: false });

      expect(todos).toHaveLength(0);
    });

    it('should handle null/undefined includeCompleted as true (backward compatibility)', async () => {
      await repository.create({
        text: 'Done task',
        project: 'test',
        status: 'done',
        priority: 'low',
        createdBy: 'test-user',
      });

      const todosUndefined = await repository.list({ includeCompleted: undefined });
      const todosNull = await repository.list({ includeCompleted: null as any });

      expect(todosUndefined).toHaveLength(1);
      expect(todosNull).toHaveLength(1);
    });
  });
});
