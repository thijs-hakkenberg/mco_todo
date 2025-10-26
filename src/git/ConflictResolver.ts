import { Todo } from '../types/Todo';

/**
 * Resolves conflicts between local and remote todos using Last-Write-Wins (LWW) strategy
 * based on field-level timestamps
 */
export class ConflictResolver {
  /**
   * Merges a single todo using LWW strategy
   * @param local - Local version of the todo
   * @param remote - Remote version of the todo (can be null if deleted)
   * @returns Merged todo or null if deleted
   */
  mergeTodo(local: Todo | null, remote: Todo | null): Todo | null {
    // Handle deletions
    if (!remote) {
      return null; // Remote deletion wins
    }
    if (!local) {
      return remote; // New remote todo
    }

    // Ensure we're working with valid todos
    if (!this.isValidTodo(local) || !this.isValidTodo(remote)) {
      // If one is invalid, prefer the valid one
      if (this.isValidTodo(local)) return local;
      if (this.isValidTodo(remote)) return remote;
      return local; // Both invalid, return local
    }

    // Start with local as base
    const merged: any = { ...local };

    // Ensure fieldTimestamps exist
    const localTimestamps = local.fieldTimestamps || {};
    const remoteTimestamps = remote.fieldTimestamps || {};

    // List of fields to check for LWW merge
    const fields: (keyof Todo)[] = [
      'text', 'description', 'status', 'priority', 'project',
      'tags', 'assignee', 'dueDate', 'completedAt',
      'dependencies', 'subtasks', 'comments'
    ];

    // Merge each field based on timestamps
    for (const field of fields) {
      const localTimestamp = localTimestamps[field as keyof typeof localTimestamps];
      const remoteTimestamp = remoteTimestamps[field as keyof typeof remoteTimestamps];

      // If remote has a newer timestamp (or local has no timestamp), use remote value
      if (this.shouldUseRemoteValue(localTimestamp, remoteTimestamp)) {
        merged[field] = remote[field];

        // Update the field timestamp
        if (!merged.fieldTimestamps) {
          merged.fieldTimestamps = {};
        }
        merged.fieldTimestamps[field] = remoteTimestamp || new Date().toISOString();
      }
    }

    // Always use the most recent modifiedAt
    if (remote.modifiedAt && local.modifiedAt) {
      merged.modifiedAt = new Date(remote.modifiedAt) > new Date(local.modifiedAt)
        ? remote.modifiedAt
        : local.modifiedAt;
    }

    // Preserve any unknown fields from both versions
    const knownFields = new Set([
      'id', 'text', 'description', 'status', 'priority', 'project',
      'tags', 'assignee', 'createdBy', 'createdAt', 'modifiedAt',
      'dueDate', 'completedAt', 'dependencies', 'subtasks', 'comments',
      'fieldTimestamps'
    ]);

    // Add unknown fields from remote if they don't exist in merged
    for (const key in remote) {
      if (!knownFields.has(key) && !(key in merged)) {
        merged[key] = (remote as any)[key];
      }
    }

    return merged as Todo;
  }

  /**
   * Merges multiple todos from local and remote sources
   * @param localTodos - Array of local todos
   * @param remoteTodos - Array of remote todos
   * @returns Array of merged todos
   */
  mergeTodos(localTodos: Todo[], remoteTodos: Todo[]): Todo[] {
    const merged: Todo[] = [];
    const processedIds = new Set<string>();

    // Create maps for quick lookup
    const localMap = new Map(localTodos.map(t => [t.id, t]));
    const remoteMap = new Map(remoteTodos.map(t => [t.id, t]));

    // Get all unique IDs from remote (this represents the current state)
    const remoteIds = new Set(remoteTodos.map(t => t.id));

    // Process todos that exist in both local and remote
    for (const [id, localTodo] of localMap) {
      processedIds.add(id);
      const remoteTodo = remoteMap.get(id);

      if (remoteTodo) {
        // Both exist - merge them
        const mergedTodo = this.mergeTodo(localTodo, remoteTodo);
        if (mergedTodo) {
          merged.push(mergedTodo);
        }
      } else if (remoteIds.size > 0) {
        // Remote has todos but this one is missing - it was deleted remotely
        // Don't add it to merged (deletion wins)
      } else {
        // Remote is empty or this is a new local todo
        merged.push(localTodo);
      }
    }

    // Add todos that only exist remotely
    for (const [id, remoteTodo] of remoteMap) {
      if (!processedIds.has(id)) {
        merged.push(remoteTodo);
      }
    }

    return merged;
  }

  /**
   * Determines if remote value should be used based on timestamps
   */
  private shouldUseRemoteValue(
    localTimestamp: string | undefined,
    remoteTimestamp: string | undefined
  ): boolean {
    // If local has no timestamp, use remote
    if (!localTimestamp) return true;

    // If remote has no timestamp, use local
    if (!remoteTimestamp) return false;

    // Compare timestamps
    try {
      const localDate = new Date(localTimestamp);
      const remoteDate = new Date(remoteTimestamp);
      return remoteDate > localDate;
    } catch {
      // If timestamps are invalid, prefer remote
      return true;
    }
  }

  /**
   * Validates if an object is a valid Todo
   */
  private isValidTodo(todo: any): boolean {
    if (!todo) return false;

    // Check required fields
    const requiredFields = ['id', 'text', 'status', 'priority', 'project', 'createdBy'];
    for (const field of requiredFields) {
      if (!(field in todo)) {
        return false;
      }
    }

    // Check field types
    if (typeof todo.text !== 'string') return false;
    if (!['todo', 'in-progress', 'blocked', 'done'].includes(todo.status)) return false;
    if (!['low', 'medium', 'high', 'urgent'].includes(todo.priority)) return false;

    return true;
  }

  /**
   * Resolves conflicts in a todos.json file content
   * @param localContent - Local file content
   * @param remoteContent - Remote file content
   * @returns Merged content as string
   */
  resolveFileConflict(localContent: string, remoteContent: string): string {
    try {
      const localData = JSON.parse(localContent);
      const remoteData = JSON.parse(remoteContent);

      const localTodos = Array.isArray(localData.todos) ? localData.todos : [];
      const remoteTodos = Array.isArray(remoteData.todos) ? remoteData.todos : [];

      const mergedTodos = this.mergeTodos(localTodos, remoteTodos);

      return JSON.stringify({ todos: mergedTodos }, null, 2);
    } catch (error) {
      // If parsing fails, prefer local content
      console.error('Failed to parse JSON during conflict resolution:', error);
      return localContent;
    }
  }
}