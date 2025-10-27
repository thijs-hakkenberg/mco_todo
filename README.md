# Git-Based MCP Todo Server

A Model Context Protocol (MCP) server that uses Git as the backend for a collaborative todo system. Users interact via Claude Desktop or Claude Code, and changes sync through Git, leveraging Git's permission system and version control for team collaboration.

## Features

- **Git-Backed Storage**: All todos stored in a Git repository for version control
- **Collaborative**: Multiple users can work on the same todo list via Git
- **Conflict Resolution**: Automatic Last-Write-Wins (LWW) merge strategy for concurrent edits
- **Auto-Sync**: Optional automatic synchronization with remote repository
- **Rich Todo Features**: Priority levels, projects, tags, assignees, due dates, comments, and more
- **MCP Integration**: Works seamlessly with Claude Desktop

## Architecture

```
Claude Desktop ←→ MCP Server (Node.js) ←→ Local Git Repo ←→ Remote Git (GitHub/GitLab)
```

## Installation

### Prerequisites

- Node.js 20+
- Git
- Claude Desktop

### Setup

1. Clone this repository:
```bash
git clone https://github.com/yourusername/our_todo.git
cd our_todo
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Create your todos repository:
```bash
mkdir ~/my-todos
cd ~/my-todos
git init
echo '{"todos": []}' > todos.json
git add .
git commit -m "Initial commit"
# Optional: Add remote repository
git remote add origin https://github.com/yourusername/my-todos.git
git push -u origin main
```

5. Configure Claude Desktop or Claude Code:

### For Claude Desktop

Add to your Claude Desktop configuration file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["/absolute/path/to/our_todo/dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "/Users/you/my-todos",
        "TODO_REPO_URL": "https://github.com/you/my-todos.git",
        "GIT_USER_NAME": "Your Name",
        "GIT_USER_EMAIL": "you@example.com",
        "AUTO_SYNC": "true",
        "SYNC_INTERVAL_SECONDS": "300"
      }
    }
  }
}
```

### For Claude Code

Add to your `.claude/config.json` file in your project directory:

```json
{
  "mcpServers": {
    "git-todo": {
      "command": "node",
      "args": ["/absolute/path/to/our_todo/dist/index.js"],
      "env": {
        "TODO_REPO_PATH": "/Users/you/my-todos",
        "TODO_REPO_URL": "https://github.com/you/my-todos.git",
        "GIT_USER_NAME": "Your Name",
        "GIT_USER_EMAIL": "you@example.com",
        "AUTO_SYNC": "true",
        "SYNC_INTERVAL_SECONDS": "300"
      }
    }
  }
}
```

Alternatively, you can run `claude mcp add git-todo` to add it interactively. 

**Note**: Replace `/absolute/path/to/our_todo` with the actual path to this repository on your system, and update the environment variables with your specific configuration.

## Configuration

### Environment Variables

- `TODO_REPO_PATH`: Path to local Git repository (default: `~/my-todos`)
- `TODO_REPO_URL`: Remote Git repository URL (optional)
- `GIT_USER_NAME`: Git user name for commits
- `GIT_USER_EMAIL`: Git user email for commits
- `AUTO_SYNC`: Enable automatic sync (true/false, default: false)
- `SYNC_INTERVAL_SECONDS`: Sync interval in seconds (default: 300)

## Usage

Once configured, you can interact with your todos through Claude Desktop or Claude Code:

### Available Commands

- **List todos**: "Show me my todos"
- **Create todo**: "Add a todo: Implement user authentication"
- **Batch create**: "Create multiple todos: Setup project, Install dependencies, Configure linter"
- **Update todo**: "Mark todo 123 as in-progress"
- **Complete todo**: "Complete todo 456"
- **Delete todo**: "Delete todo 789"
- **Search**: "Search for todos about authentication"
- **Filter**: "Show high priority todos in the backend project"
- **Add comment**: "Add comment to todo 123: Started working on this"
- **Get stats**: "Show todo statistics"
- **Manual sync**: "Sync the repository"

### Todo Properties

- `text`: Todo description (required)
- `project`: Project name (required)
- `status`: todo, in-progress, blocked, done
- `priority`: low, medium, high, urgent
- `tags`: Array of tags
- `assignee`: User assigned to the todo
- `dueDate`: Due date in ISO 8601 format
- `description`: Detailed description
- `dependencies`: Array of todo IDs this depends on
- `subtasks`: Array of subtasks
- `comments`: Array of comments

## Data Model

Todos are stored in `todos.json` with the following structure:

```json
{
  "todos": [
    {
      "id": "uuid",
      "text": "Task description",
      "status": "todo",
      "priority": "medium",
      "project": "work",
      "tags": ["backend", "urgent"],
      "assignee": "user-id",
      "createdBy": "user-id",
      "createdAt": "ISO8601",
      "modifiedAt": "ISO8601",
      "dueDate": "ISO8601",
      "completedAt": "ISO8601",
      "dependencies": ["todo-id"],
      "subtasks": [{"id": "uuid", "text": "Subtask", "completed": false}],
      "comments": [{"id": "uuid", "user": "user-id", "text": "Comment", "timestamp": "ISO8601"}],
      "fieldTimestamps": {
        "text": "ISO8601",
        "status": "ISO8601"
      }
    }
  ]
}
```

## Conflict Resolution

The system uses a Last-Write-Wins (LWW) strategy at the field level:
- Each field has its own timestamp
- When conflicts occur, the field with the most recent timestamp wins
- Non-conflicting fields are merged from both versions

## Development

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Project Structure

```
/our_todo/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── server/
│   │   └── MCPServer.ts         # MCP tool handlers
│   ├── git/
│   │   ├── GitManager.ts        # Git operations
│   │   ├── ConflictResolver.ts  # LWW merge logic
│   │   └── SyncManager.ts       # Sync coordination
│   ├── data/
│   │   └── TodoRepository.ts    # Todo CRUD operations
│   └── types/
│       └── Todo.ts              # Todo types and validation
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
├── my-todos/                    # Example todo repository
│   └── todos.json              # Todo database
└── dist/                        # Compiled JavaScript
```

### Test Coverage

Current test coverage: ~94%
- Todo Model: 100%
- ConflictResolver: 100%
- GitManager: 100%
- TodoRepository: 100%
- SyncManager: 70% (timing-related test issues)
- MCPServer: 56% (partial implementation)

## Troubleshooting

### Sync Failures

If sync fails:
1. Check network connection
2. Verify Git credentials
3. Pull manually: `cd ~/my-todos && git pull`
4. Check for merge conflicts

### Permission Issues

Ensure the MCP server has read/write access to:
- Todo repository path
- Git configuration

### Debug Mode

View server logs in Claude Desktop's developer console or check stderr output.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD)
4. Implement features
5. Ensure all tests pass
6. Submit a pull request

## License

ISC

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- [simple-git](https://github.com/steveukx/git-js)
- [Zod](https://github.com/colinhacks/zod)
- [uuidv7](https://github.com/LiosK/uuidv7)

## Support

For issues and questions, please open an issue on GitHub.