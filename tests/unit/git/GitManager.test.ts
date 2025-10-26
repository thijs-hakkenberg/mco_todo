import { GitManager } from '../../../src/git/GitManager';
import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock simple-git
jest.mock('simple-git');
jest.mock('fs/promises');

describe('GitManager', () => {
  let gitManager: GitManager;
  let mockGit: jest.Mocked<SimpleGit>;
  const testRepoPath = '/test/repo/path';

  beforeEach(() => {
    // Create mock git instance
    mockGit = {
      init: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue({ commit: 'abc123' }),
      push: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue({ files: [], summary: {} }),
      status: jest.fn().mockResolvedValue({
        conflicted: [],
        created: [],
        deleted: [],
        modified: [],
        renamed: [],
        files: [],
        staged: [],
        ahead: 0,
        behind: 0,
        current: 'main',
        tracking: 'origin/main'
      }),
      checkIsRepo: jest.fn().mockResolvedValue(true),
      addRemote: jest.fn().mockResolvedValue(undefined),
      getRemotes: jest.fn().mockResolvedValue([]),
      fetch: jest.fn().mockResolvedValue(undefined),
      branch: jest.fn().mockResolvedValue({ current: 'main', all: ['main'] }),
      checkout: jest.fn().mockResolvedValue(undefined),
      merge: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue({ all: [], latest: null })
    } as any;

    // Mock simpleGit to return our mock
    (simpleGit as jest.Mock).mockReturnValue(mockGit);

    // Mock fs functions
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('{}');
    (fs.rename as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    gitManager = new GitManager(testRepoPath);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize git repository if not exists', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      await gitManager.initialize();

      expect(mockGit.init).toHaveBeenCalled();
    });

    it('should not initialize if already a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);

      await gitManager.initialize();

      expect(mockGit.init).not.toHaveBeenCalled();
    });

    it('should add remote if URL provided and not exists', async () => {
      mockGit.getRemotes.mockResolvedValue([]);

      await gitManager.initialize('https://github.com/user/repo.git');

      expect(mockGit.addRemote).toHaveBeenCalledWith('origin', 'https://github.com/user/repo.git');
    });
  });

  describe('pull operations', () => {
    it('should pull successfully when no conflicts', async () => {
      mockGit.pull.mockResolvedValue({
        files: ['todos.json'],
        summary: { changes: 1, insertions: 10, deletions: 5 }
      } as any);

      const result = await gitManager.pull();

      expect(result.success).toBe(true);
      expect(result.hasConflicts).toBe(false);
      expect(mockGit.pull).toHaveBeenCalled();
    });

    it('should detect merge conflicts', async () => {
      mockGit.pull.mockRejectedValue(new Error('Merge conflict'));
      mockGit.status.mockResolvedValue({
        conflicted: ['todos.json'],
        files: [],
        created: [],
        deleted: [],
        modified: [],
        renamed: [],
        staged: [],
        ahead: 0,
        behind: 0,
        current: 'main',
        tracking: 'origin/main'
      } as any);

      const result = await gitManager.pull();

      expect(result.success).toBe(false);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflictedFiles).toContain('todos.json');
    });

    it('should handle network failures gracefully', async () => {
      mockGit.pull.mockRejectedValue(new Error('Network error: unable to access'));

      const result = await gitManager.pull();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should retry on temporary failures', async () => {
      jest.setTimeout(10000); // Increase timeout for this test

      mockGit.pull
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ files: [], summary: {} } as any);

      const result = await gitManager.pullWithRetry();

      expect(result.success).toBe(true);
      expect(mockGit.pull).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('push operations', () => {
    it('should push successfully', async () => {
      mockGit.push.mockResolvedValue({
        pushed: [],
        branch: { local: 'main', remote: 'origin/main' },
        ref: { local: 'refs/heads/main' },
        remoteMessages: {}
      } as any);

      const result = await gitManager.push();

      expect(result.success).toBe(true);
      expect(mockGit.push).toHaveBeenCalled();
    });

    it('should handle concurrent push (non-fast-forward)', async () => {
      mockGit.push.mockRejectedValue(new Error('non-fast-forward'));

      const result = await gitManager.push();

      expect(result.success).toBe(false);
      expect(result.needsPull).toBe(true);
    });

    it('should retry push after pull', async () => {
      // First push fails
      mockGit.push.mockRejectedValueOnce(new Error('non-fast-forward'));

      // Pull succeeds
      mockGit.pull.mockResolvedValue({ files: [], summary: {} } as any);

      // Second push succeeds
      mockGit.push.mockResolvedValue({
        pushed: [],
        branch: { local: 'main', remote: 'origin/main' },
        ref: { local: 'refs/heads/main' },
        remoteMessages: {}
      } as any);

      const result = await gitManager.syncWithRetry();

      expect(result.success).toBe(true);
      expect(mockGit.pull).toHaveBeenCalled();
      expect(mockGit.push).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockGit.push.mockRejectedValue(new Error('non-fast-forward'));
      mockGit.pull.mockResolvedValue({ files: [], summary: {} } as any);

      const result = await gitManager.syncWithRetry(3);

      expect(result.success).toBe(false);
      expect(mockGit.push).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('atomic file writes', () => {
    it('should write to temp file first', async () => {
      const filePath = path.join(testRepoPath, 'todos.json');
      const content = JSON.stringify({ todos: [] });

      await gitManager.writeFileAtomic(filePath, content);

      // Check that writeFile was called with temp file
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        content,
        'utf-8'
      );
    });

    it('should rename atomically', async () => {
      const filePath = path.join(testRepoPath, 'todos.json');
      const content = JSON.stringify({ todos: [] });

      await gitManager.writeFileAtomic(filePath, content);

      expect(fs.rename).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        filePath
      );
    });

    it('should rollback on failure', async () => {
      const filePath = path.join(testRepoPath, 'todos.json');
      const content = JSON.stringify({ todos: [] });

      // Make rename fail
      (fs.rename as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(gitManager.writeFileAtomic(filePath, content))
        .rejects.toThrow('Permission denied');

      // Temp file should be cleaned up
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('.tmp'));
    });
  });

  describe('commit operations', () => {
    it('should commit with message', async () => {
      await gitManager.commit('Test commit');

      expect(mockGit.add).toHaveBeenCalledWith('.');
      expect(mockGit.commit).toHaveBeenCalledWith('Test commit');
    });

    it('should handle commit failures', async () => {
      mockGit.commit.mockRejectedValue(new Error('Nothing to commit'));

      const result = await gitManager.commit('Test commit');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Nothing to commit');
    });
  });

  describe('status operations', () => {
    it('should get repository status', async () => {
      mockGit.status.mockResolvedValue({
        conflicted: [],
        created: ['new.txt'],
        deleted: [],
        modified: ['todos.json'],
        renamed: [],
        files: [
          { path: 'new.txt', index: 'A', working_dir: ' ' },
          { path: 'todos.json', index: 'M', working_dir: ' ' }
        ],
        staged: ['new.txt', 'todos.json'],
        ahead: 2,
        behind: 1,
        current: 'main',
        tracking: 'origin/main'
      } as any);

      const status = await gitManager.getStatus();

      expect(status.hasChanges).toBe(true);
      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(1);
      expect(status.modified).toContain('todos.json');
      expect(status.created).toContain('new.txt');
    });
  });

  describe('conflict resolution', () => {
    it('should resolve conflicts using ConflictResolver', async () => {
      const localContent = JSON.stringify({
        todos: [{ id: '1', text: 'Local todo' }]
      });
      const remoteContent = JSON.stringify({
        todos: [{ id: '1', text: 'Remote todo' }]
      });

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(localContent)
        .mockResolvedValueOnce(remoteContent);

      await gitManager.resolveConflict('todos.json');

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('todos.json'),
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('branch operations', () => {
    it('should get current branch', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'feature-branch',
        all: ['main', 'feature-branch'],
        branches: {}
      } as any);

      const branch = await gitManager.getCurrentBranch();

      expect(branch).toBe('feature-branch');
    });

    it('should checkout branch', async () => {
      await gitManager.checkout('develop');

      expect(mockGit.checkout).toHaveBeenCalledWith('develop');
    });
  });
});