/**
 * Tests for TodoRepository field selection and projection functionality
 * TDD Phase: RED - These tests should fail until implementation is complete
 */

import { TodoRepository } from '../../src/data/TodoRepository';
import { GitManager } from '../../src/git/GitManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { uuidv7 } from 'uuidv7';

const execPromise = promisify(exec);

describe('TodoRepository Field Selection', () => {
  let repository: TodoRepository;
  let gitManager: GitManager;
  let testDir: string;
  let todosPath: string;

  beforeEach(async () => {
    testDir = path.join(__dirname, '../test-repos', `field-selection-${Date.now()}`);
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

  describe('minimal mode', () => {
    it('should return only id, text, status, priority, project', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'high',
        createdBy: 'test-user',
        tags: ['tag1', 'tag2'],
        assignee: 'user1',
        description: 'Test description',
        dueDate: '2025-12-31T23:59:59Z',
      });

      const todos = await repository.list({ mode: 'minimal' });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include these fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('project');

      // Should NOT include these fields
      expect(result).not.toHaveProperty('tags');
      expect(result).not.toHaveProperty('assignee');
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('dueDate');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('modifiedAt');
      expect(result).not.toHaveProperty('comments');
      expect(result).not.toHaveProperty('subtasks');
      expect(result).not.toHaveProperty('fieldTimestamps');
    });
  });

  describe('standard mode', () => {
    it('should return minimal fields plus tags, assignee, and dates', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'in-progress',
        priority: 'medium',
        createdBy: 'test-user',
        tags: ['tag1'],
        assignee: 'user1',
        dueDate: '2025-12-31T23:59:59Z',
        description: 'Should not appear',
      });

      const todos = await repository.list({ mode: 'standard' });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include minimal fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('project');

      // Should include standard additions
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('assignee');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('modifiedAt');
      expect(result).toHaveProperty('dueDate');

      // Should NOT include heavy fields
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('comments');
      expect(result).not.toHaveProperty('subtasks');
      expect(result).not.toHaveProperty('fieldTimestamps');
      expect(result).not.toHaveProperty('dependencies');
    });

    it('should exclude null dueDate and completedAt by default', async () => {
      await repository.create({
        text: 'Test todo without dates',
        project: 'test-project',
        status: 'todo',
        priority: 'low',
        createdBy: 'test-user',
        // No dueDate or completedAt
      });

      const todos = await repository.list({ mode: 'standard' });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should NOT include null date fields
      expect(result).not.toHaveProperty('dueDate');
      expect(result).not.toHaveProperty('completedAt');
    });

    it('should include dueDate when set', async () => {
      await repository.create({
        text: 'Test todo with due date',
        project: 'test-project',
        status: 'todo',
        priority: 'high',
        createdBy: 'test-user',
        dueDate: '2025-12-31T23:59:59Z',
      });

      const todos = await repository.list({ mode: 'standard' });

      expect(todos).toHaveLength(1);
      expect(todos[0]).toHaveProperty('dueDate');
      expect(todos[0].dueDate).toBe('2025-12-31T23:59:59Z');
    });
  });

  describe('full mode', () => {
    it('should return all fields including comments, subtasks, and fieldTimestamps', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'blocked',
        priority: 'urgent',
        description: 'Full description',
        createdBy: 'test-user',
        tags: ['tag1', 'tag2'],
        assignee: 'user1',
        dueDate: '2025-12-31T23:59:59Z',
        dependencies: [],
        subtasks: [{ id: uuidv7(), text: 'subtask', completed: false }],
      });

      const todos = await repository.list({ mode: 'full' });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include ALL fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('assignee');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('modifiedAt');
      expect(result).toHaveProperty('dueDate');
      expect(result).toHaveProperty('completedAt');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('subtasks');
      expect(result).toHaveProperty('comments');
      expect(result).toHaveProperty('fieldTimestamps');
      expect(result).toHaveProperty('createdBy');
    });

    it('should include null date fields in full mode', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'low',
        createdBy: 'test-user',
        // No dueDate
      });

      const todos = await repository.list({ mode: 'full' });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include null date fields in full mode
      expect(result).toHaveProperty('completedAt');
      expect(result.completedAt).toBeNull();
    });
  });

  describe('custom mode with fields array', () => {
    it('should return only specified fields', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'in-progress',
        priority: 'high',
        createdBy: 'test-user',
        tags: ['tag1'],
        assignee: 'user1',
        description: 'Should not appear',
      });

      const todos = await repository.list({
        fields: ['id', 'text', 'status']
      });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should only include specified fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');

      // Should NOT include other fields
      expect(result).not.toHaveProperty('priority');
      expect(result).not.toHaveProperty('project');
      expect(result).not.toHaveProperty('tags');
      expect(result).not.toHaveProperty('assignee');
      expect(result).not.toHaveProperty('description');
    });

    it('should handle nested field selection', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'low',
        createdBy: 'test-user',
        subtasks: [{ id: uuidv7(), text: 'subtask', completed: false }],
      });

      const todos = await repository.list({
        fields: ['id', 'text', 'subtasks']
      });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('subtasks');
      expect(result.subtasks).toHaveLength(1);
    });
  });

  describe('custom mode with excludeFields array', () => {
    it('should return all fields except excluded ones', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'done',
        priority: 'medium',
        createdBy: 'test-user',
        description: 'Should not appear',
        tags: ['tag1'],
      });

      const todos = await repository.list({
        excludeFields: ['description', 'comments', 'fieldTimestamps']
      });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include most fields
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('tags');

      // Should NOT include excluded fields
      expect(result).not.toHaveProperty('description');
      expect(result).not.toHaveProperty('comments');
      expect(result).not.toHaveProperty('fieldTimestamps');
    });

    it('should work with both fields and excludeFields (fields takes precedence)', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'high',
        createdBy: 'test-user',
        tags: ['tag1'],
      });

      const todos = await repository.list({
        fields: ['id', 'text', 'status', 'tags'],
        excludeFields: ['tags'] // Should be ignored since fields is specified
      });

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // fields takes precedence, so tags should be included
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('tags');

      expect(result).not.toHaveProperty('priority');
      expect(result).not.toHaveProperty('project');
    });
  });

  describe('includeNullDates option', () => {
    it('should exclude null dueDate and completedAt by default', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'low',
        createdBy: 'test-user',
      });

      const todos = await repository.list({ mode: 'standard' });

      expect(todos).toHaveLength(1);
      expect(todos[0]).not.toHaveProperty('dueDate');
      expect(todos[0]).not.toHaveProperty('completedAt');
    });

    it('should include null dates when includeNullDates is true', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'low',
        createdBy: 'test-user',
      });

      const todos = await repository.list({
        mode: 'standard',
        includeNullDates: true
      });

      expect(todos).toHaveLength(1);
      expect(todos[0]).toHaveProperty('completedAt');
      expect(todos[0].completedAt).toBeNull();
      // dueDate might not be present if not in standard mode fields
    });
  });

  describe('default behavior without mode', () => {
    it('should return all fields when no mode is specified (backward compatibility)', async () => {
      await repository.create({
        text: 'Test todo',
        project: 'test-project',
        status: 'todo',
        priority: 'high',
        createdBy: 'test-user',
        description: 'Full description',
      });

      const todos = await repository.list({});

      expect(todos).toHaveLength(1);
      const result = todos[0];

      // Should include all fields for backward compatibility
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('fieldTimestamps');
    });
  });
});
