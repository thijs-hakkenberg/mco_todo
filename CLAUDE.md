# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Git-Based MCP Todo Server - A Model Context Protocol server for managing todos with Git version control. **Currently ~20% complete** with only documentation and structure in place - no actual implementation code exists yet.

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run watch

# Run tests (none exist yet)
npm test
```

## Architecture

The project follows a layered architecture:

1. **MCP Server** (`src/index.ts`) - Handles MCP protocol via stdio, registers tools, routes requests
2. **TodoManager** (`src/todoManager.ts`) - CRUD operations, validation, filtering
3. **GitHandler** (`src/gitHandler.ts`) - Git operations, commits, history
4. **Types** (`src/types.ts`) - TypeScript interfaces and type definitions

Data flows from MCP Client → Server → TodoManager → GitHandler → File System/Git.

## MCP Tools to Implement

- `create_todo` - Create todo with title, description, priority, tags
- `list_todos` - List with optional filters (status, priority, tags)
- `update_todo` - Update existing todo properties
- `delete_todo` - Delete by ID
- `get_todo_history` - Get Git history for a todo

## Critical Implementation Notes

1. **Empty Source Files**: All files in `src/` contain only placeholder comments - complete implementation needed
2. **Module System**: Uses ES modules (`type: "module"` in package.json) - use ESM import/export syntax
3. **Git Integration**: Each todo operation should create a Git commit for audit trail
4. **MCP Protocol**: Use `@modelcontextprotocol/sdk` with stdio transport
5. **Data Storage**: Todos stored in JSON file tracked by Git (default: `todos.json`)

## Todo Data Model

```typescript
interface Todo {
  id: string;                          // Generate UUID
  title: string;                       // Required
  description?: string;
  status: 'pending' | 'completed';     // Default: 'pending'
  priority: 'low' | 'medium' | 'high'; // Default: 'medium'
  tags: string[];
  createdAt: string;                   // ISO8601
  updatedAt: string;                   // ISO8601
}
```

## Environment Configuration

Required environment variables when running:
- `TODO_REPO_PATH` - Path to Git repository for storing todos
- `TODO_FILE_NAME` - (optional, default: "todos.json")
- `TODO_BRANCH` - (optional, default: "main")

## Implementation Priorities

1. **First**: Implement types in `src/types.ts`
2. **Second**: Implement Git operations in `src/gitHandler.ts`
3. **Third**: Implement todo CRUD in `src/todoManager.ts`
4. **Fourth**: Wire up MCP server in `src/index.ts`
5. **Fifth**: Add tests in `tests/`

## Testing Approach

- Use Jest with ts-jest for TypeScript support
- Mock Git operations and file system for unit tests
- Use temporary Git repos for integration tests
- Test error conditions and edge cases

## Key Dependencies

- `@modelcontextprotocol/sdk` (v0.5.0) - MCP protocol
- `simple-git` (v3.27.0) - Git operations
- TypeScript configured for ES2022 modules
- Jest for testing (with experimental VM modules)

## Common Pitfalls to Avoid

1. Remember to initialize Git repo at `TODO_REPO_PATH` if it doesn't exist
2. Handle concurrent modifications gracefully
3. Validate all user input before processing
4. Ensure proper error handling with MCP-compliant error responses
5. Use async/await for all Git and file operations
6. Remember to commit changes after each todo modification

## References

- Full API specification: `docs/API.md`
- Detailed architecture: `docs/ARCHITECTURE.md`
- Implementation status: `IMPLEMENTATION_STATUS.md`