# Claude Code Configuration & Examples

This guide provides comprehensive examples for using the Git-Based MCP Todo Server with Claude Code and Claude Desktop.

## Table of Contents

1. [Configuration Examples](#configuration-examples)
2. [Basic Tool Usage](#basic-tool-usage)
3. [Common Workflows](#common-workflows)
4. [Advanced Patterns](#advanced-patterns)
5. [Integration with Web UI](#integration-with-web-ui)
6. [Testing with MCP Inspector](#testing-with-mcp-inspector)
7. [Troubleshooting](#troubleshooting)

## Configuration Examples

### Claude Desktop Configuration

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

#### Minimal Configuration (No Auto-Sync)

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["/Users/you/our_todo/dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "/Users/you/my-todos",
        "GIT_USER_NAME": "Your Name",
        "GIT_USER_EMAIL": "you@example.com"
      }
    }
  }
}
```

#### Full Configuration (With Auto-Sync)

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["/Users/you/our_todo/dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "/Users/you/my-todos",
        "TODO_REPO_URL": "https://github.com/yourteam/todos.git",
        "GIT_USER_NAME": "Your Name",
        "GIT_USER_EMAIL": "you@example.com",
        "AUTO_SYNC": "true",
        "SYNC_INTERVAL_SECONDS": "300"
      }
    }
  }
}
```

#### Team Collaboration Configuration

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["/Users/you/our_todo/dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "/Users/you/work-todos",
        "TODO_REPO_URL": "git@github.com:company/team-todos.git",
        "GIT_USER_NAME": "Jane Developer",
        "GIT_USER_EMAIL": "jane@company.com",
        "AUTO_SYNC": "true",
        "SYNC_INTERVAL_SECONDS": "180"
      }
    }
  }
}
```

### Claude Code Configuration

**Location**: `.claude/config.json` in your project directory

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "./todos",
        "GIT_USER_NAME": "Claude Code",
        "GIT_USER_EMAIL": "claude@project.local"
      }
    }
  }
}
```

## Basic Tool Usage

### Creating Todos

#### Simple Todo

```
User: Create a todo to "Fix authentication bug" in the "backend" project with high priority
```

Claude will use:
```typescript
mcp__git-todo__create_todo({
  text: "Fix authentication bug",
  project: "backend",
  priority: "high"
})
```

#### Todo with Full Details

```
User: Create a todo for "Implement user dashboard" in the "frontend" project.
      Make it medium priority, assign to Sarah, tag it with "ui" and "feature",
      and add description "Create responsive dashboard with user stats and activity feed"
```

Claude will use:
```typescript
mcp__git-todo__create_todo({
  text: "Implement user dashboard",
  project: "frontend",
  priority: "medium",
  assignee: "Sarah",
  tags: ["ui", "feature"],
  description: "Create responsive dashboard with user stats and activity feed"
})
```

### Listing and Filtering Todos

#### List All Active Todos

```
User: Show me all my todos
```

```typescript
mcp__git-todo__list_todos({})
```

#### Filter by Status

```
User: Show me all todos that are in progress
```

```typescript
mcp__git-todo__list_todos({
  status: "in-progress"
})
```

#### Filter by Priority

```
User: Show me all high and urgent priority tasks
```

Claude will make two calls or use search:
```typescript
mcp__git-todo__list_todos({
  priority: "high"
})
```

#### Filter by Project and Status

```
User: Show me all blocked tasks in the backend project
```

```typescript
mcp__git-todo__list_todos({
  project: "backend",
  status: "blocked"
})
```

#### Filter by Assignee

```
User: Show me all todos assigned to Sarah
```

```typescript
mcp__git-todo__list_todos({
  assignee: "Sarah"
})
```

### Updating Todos

#### Update Status

```
User: Mark todo {id} as in progress
```

```typescript
mcp__git-todo__update_todo({
  id: "{id}",
  status: "in-progress"
})
```

#### Update Multiple Fields

```
User: Update todo {id} - change priority to urgent, assign to Mike, and add tag "critical"
```

```typescript
mcp__git-todo__update_todo({
  id: "{id}",
  priority: "urgent",
  assignee: "Mike",
  tags: ["existing-tag", "critical"]
})
```

### Completing and Deleting Todos

#### Complete a Todo

```
User: Mark todo {id} as done
```

```typescript
mcp__git-todo__complete_todo({
  id: "{id}"
})
```

#### Delete a Todo

```
User: Delete todo {id}
```

```typescript
mcp__git-todo__delete_todo({
  id: "{id}"
})
```

### Searching

#### Full-Text Search

```
User: Find all todos mentioning "database migration"
```

```typescript
mcp__git-todo__search_todos({
  query: "database migration"
})
```

### Statistics

#### Get Project Statistics

```
User: Give me statistics on my todos
```

```typescript
mcp__git-todo__get_stats({})
```

Returns:
```json
{
  "total": 45,
  "byStatus": {
    "todo": 12,
    "in-progress": 8,
    "blocked": 3,
    "done": 22
  },
  "completionRate": 48.89
}
```

## Common Workflows

### Daily Standup Workflow

```
User: Show me what I worked on yesterday and what I'm working on today

Claude will:
1. List completed todos: mcp__git-todo__list_todos({ status: "done" })
2. List in-progress todos: mcp__git-todo__list_todos({ status: "in-progress" })
3. Check history: mcp__git-todo__get_history({ limit: 20 })
4. Format a nice summary
```

### Sprint Planning Workflow

```
User: Help me plan the next sprint. Show me all unstarted backend tasks grouped by priority

Claude will:
1. List todos: mcp__git-todo__list_todos({ project: "backend", status: "todo" })
2. Group by priority
3. Show estimated workload
4. Suggest assignments based on tags/descriptions
```

### Bug Triage Workflow

```
User: Create todos for these bugs: [list of bugs]

Claude will:
1. Use batch_create_todos for efficiency
2. Automatically tag with "bug"
3. Set appropriate priorities based on severity
4. Add detailed descriptions
```

```typescript
mcp__git-todo__batch_create_todos({
  todos: [
    {
      text: "Login fails on Safari",
      project: "frontend",
      priority: "high",
      tags: ["bug", "browser-compatibility"],
      description: "Users report login button unresponsive in Safari 17+"
    },
    {
      text: "API timeout on /users endpoint",
      project: "backend",
      priority: "urgent",
      tags: ["bug", "performance"],
      description: "Users experiencing 504 errors during peak hours"
    }
  ]
})
```

### Code Review Workflow

```
User: I'm reviewing PR #123. Create todos for the issues I found

Claude will:
1. Create parent todo: "Review PR #123"
2. Create child todos with dependencies
3. Link to specific code locations in descriptions
4. Tag appropriately (code-quality, refactoring, etc.)
```

## Advanced Patterns

### Hierarchical Todo Creation

Create a parent task with subtasks in a single operation:

```typescript
mcp__git-todo__batch_create_todos({
  todos: [
    {
      text: "Implement authentication system",
      project: "backend",
      priority: "high",
      description: "Complete OAuth2 implementation"
    },
    {
      text: "Set up OAuth2 provider",
      project: "backend",
      priority: "high",
      parentIndex: 0,
      tags: ["setup"]
    },
    {
      text: "Implement token refresh logic",
      project: "backend",
      priority: "medium",
      parentIndex: 0,
      tags: ["logic"]
    },
    {
      text: "Add integration tests",
      project: "backend",
      priority: "medium",
      parentIndex: 0,
      tags: ["testing"]
    }
  ]
})
```

### Project Migration Workflow

Moving todos from one project to another:

```
User: Move all frontend todos tagged "refactoring" to the "tech-debt" project

Claude will:
1. Search: mcp__git-todo__list_todos({ project: "frontend" })
2. Filter by tag "refactoring"
3. Batch update each with project: "tech-debt"
4. Add comment documenting the migration
```

### Dependency Management

```
User: Create a todo for "Deploy to production" that depends on two other todos being done first

Claude will:
1. Get IDs of prerequisite todos
2. Create new todo with dependencies array
3. Check status of dependencies before marking ready
```

```typescript
mcp__git-todo__create_todo({
  text: "Deploy to production",
  project: "ops",
  priority: "high",
  dependencies: ["{test-todo-id}", "{review-todo-id}"],
  description: "Deploy v2.0.0 after tests pass and review is approved"
})
```

### Git History Analysis

```
User: Who has been most active on todos in the last week?

Claude will:
1. Get history: mcp__git-todo__get_history({ limit: 100 })
2. Parse commit messages
3. Analyze by author and date
4. Generate activity report
```

## Integration with Web UI

### Concurrent Usage Pattern

You can use both Claude and the Web UI simultaneously:

1. **Claude** - Create and manage todos via conversation
2. **Web UI** - Visual kanban board for drag-and-drop and filtering
3. **Git** - Single source of truth for both interfaces

### Typical Workflow

```
Morning (Claude Desktop):
User: Show me what I need to work on today
Claude: [Lists in-progress and high-priority todos]

During Work (Web UI):
- Drag todos between columns as you work
- Use filters to focus on specific projects
- Double-click cards to view/edit details

End of Day (Claude Desktop):
User: Update my todo {id} with a summary of progress
Claude: [Adds comment, updates status if needed]
```

### Web UI Features Available via MCP

All web UI features have MCP equivalents:

| Web UI Action | MCP Tool |
|--------------|----------|
| Create todo (+ button) | `create_todo` |
| Drag to column | `update_todo` (change status) |
| Edit modal | `update_todo` |
| Filter bar | `list_todos` with filters |
| Search | `search_todos` |
| Statistics header | `get_stats` |
| Double-click details | `get_todo` |

## Testing with MCP Inspector

The MCP Inspector is a debugging tool for MCP servers.

### Setup

```bash
npm install -g @modelcontextprotocol/inspector
```

### Run Inspector

```bash
# Set environment variables
export TODO_REPO_PATH="/Users/you/my-todos"
export GIT_USER_NAME="Test User"
export GIT_USER_EMAIL="test@example.com"

# Run inspector
mcp-inspector node dist/index.js
```

### Test Tool Calls

In the inspector UI:

1. **Test create_todo**:
```json
{
  "text": "Test todo",
  "project": "test",
  "priority": "medium"
}
```

2. **Test list_todos**:
```json
{
  "status": "todo"
}
```

3. **Test update_todo**:
```json
{
  "id": "{id-from-previous-call}",
  "status": "done"
}
```

## Troubleshooting

### Claude Not Seeing MCP Tools

**Symptom**: Claude says "I don't have access to todo management tools"

**Solutions**:
1. Restart Claude Desktop after config changes
2. Verify config file path is correct
3. Check that `dist/index.js` exists (run `npm run build`)
4. Check Claude Desktop logs:
   - macOS: `~/Library/Logs/Claude/`
   - Windows: `%LOCALAPPDATA%\Claude\logs\`

### MCP Server Not Starting

**Symptom**: "Failed to connect to MCP server" in logs

**Solutions**:
1. Check `TODO_REPO_PATH` exists and is a Git repository
2. Verify Node.js version is 20+
3. Run manually to see errors:
   ```bash
   export TODO_REPO_PATH="/Users/you/my-todos"
   export GIT_USER_NAME="Your Name"
   export GIT_USER_EMAIL="you@example.com"
   node dist/index.js
   ```
4. Check for port conflicts if using API server

### Todos Not Syncing

**Symptom**: Changes in Claude not appearing in Web UI (or vice versa)

**Solutions**:
1. Check that both use the same `TODO_REPO_PATH`
2. Restart API server: `npm run dev:api`
3. Hard refresh web browser (Cmd+Shift+R / Ctrl+Shift+R)
4. Check Git status in `TODO_REPO_PATH`:
   ```bash
   cd $TODO_REPO_PATH
   git status
   git log --oneline -5
   ```

### Auto-Sync Issues

**Symptom**: "Failed to sync with remote" errors

**Solutions**:
1. Verify `TODO_REPO_URL` is correct
2. Check Git credentials:
   ```bash
   cd $TODO_REPO_PATH
   git fetch
   ```
3. Ensure SSH keys are configured (for `git@` URLs)
4. Try manual sync:
   ```bash
   cd $TODO_REPO_PATH
   git pull --rebase
   git push
   ```
5. Use `sync_repository` tool in Claude to trigger manual sync

### Permission Errors

**Symptom**: "EACCES: permission denied" errors

**Solutions**:
1. Check file permissions on `TODO_REPO_PATH`
2. Ensure user has write access to `todos.json`
3. Check Git config:
   ```bash
   cd $TODO_REPO_PATH
   git config user.name
   git config user.email
   ```

### Performance Issues

**Symptom**: Slow response times, especially with many todos

**Solutions**:
1. Archive completed todos periodically
2. Use field selection in API calls (`mode: "minimal"`)
3. Use filters to reduce result sets
4. Consider splitting into multiple repositories by project
5. Check Git repository size:
   ```bash
   cd $TODO_REPO_PATH
   du -sh .git
   ```

## Best Practices

### 1. Descriptive Todo Text
Use clear, actionable text for todos:
- ✅ "Fix login timeout on mobile Safari"
- ❌ "Bug fix"

### 2. Consistent Project Naming
Use lowercase, hyphenated project names:
- ✅ "backend", "frontend", "mobile-app"
- ❌ "Backend", "Front End", "Mobile_App"

### 3. Tag Strategically
Use tags for cross-cutting concerns:
- Type: `bug`, `feature`, `refactoring`
- Area: `ui`, `api`, `database`, `auth`
- Priority indicators: `critical`, `quick-win`

### 4. Leverage Batch Operations
When creating multiple related todos, use `batch_create_todos` for:
- Better performance
- Atomic operations
- Hierarchical relationships

### 5. Use Comments for Updates
Add comments to document progress:
```
User: Add a comment to todo {id} saying "Completed API integration, ready for testing"
```

### 6. Regular Syncing
If using team collaboration:
- Enable `AUTO_SYNC`
- Keep `SYNC_INTERVAL_SECONDS` between 180-600
- Use meaningful Git commit messages (handled automatically)

### 7. Archive Completed Work
Periodically archive or delete old completed todos:
```
User: Archive all todos completed more than 30 days ago
```

## Additional Resources

- **Main Documentation**: See `README.md` in project root
- **API Reference**: See `QUICKSTART.md` for API server setup
- **Testing Guide**: See `TEST_GUIDE.md` for testing instructions
- **Testing Limitations**: See `TESTING_LIMITATIONS.md` for known issues
- **Architecture Decisions**: See `docs/adr/` for ADRs
- **Changelog**: See `CHANGELOG.md` for version history
