# Changelog

All notable changes to the Git-Based MCP Todo Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-29

### Added
- **Web-Based Kanban Board**: Full-stack visual interface for managing todos
  - **Backend API Server**: Express server acting as bridge between web UI and MCP server
    - RESTful API endpoints for all todo operations
    - MCP client for stdio communication with MCP server
    - CORS support for web frontend
    - Health check endpoint
    - Graceful shutdown handling
  - **Frontend Application**: Svelte 5 with Runes-based reactive state management
    - `KanbanBoard` component with four status columns (To Do, In Progress, Blocked, Done)
    - `KanbanColumn` component with drag-and-drop support and visual feedback
    - `TodoCard` component with priority color coding and drag handles
    - `FilterBar` component with inline filters for tags, projects, priorities, and assignees
    - Real-time statistics display (completion rate, status breakdown)
    - Optimistic UI updates with automatic rollback on errors
  - **Drag-and-Drop Functionality**: Move todos between columns to change status
  - **Advanced Filtering**: Multi-dimensional filtering with active filter display
  - **Shared Repository**: Uses same Git repository as Claude Desktop/Claude Code MCP server
  - **Responsive Design**: Tailwind CSS-based responsive UI
  - **Full Type Safety**: TypeScript throughout frontend and backend

### Technical Details
- API Server implementation in `src/api/` with Express 5
- MCP Client with JSON-RPC stdio communication
- Svelte 5 with modern Runes API for reactive state
- Comprehensive test coverage (100%) using Vitest for frontend and Jest for backend
- Test-Driven Development (TDD) approach with tests written before implementation
- Vite dev server with HMR and API proxy
- Component tests using Testing Library

### Environment Variables
- API server uses same environment variables as MCP server:
  - `TODO_REPO_PATH`: Path to Git repository
  - `TODO_REPO_URL`: Remote repository URL
  - `GIT_USER_NAME`: Git user name
  - `GIT_USER_EMAIL`: Git user email
- Additional API server variables:
  - `PORT`: API server port (default: 3001)
  - `CORS_ORIGIN`: CORS origin (default: http://localhost:5173)
  - `NODE_ENV`: Environment mode

## [1.1.0] - 2025-10-27

### Added
- **Batch Operations**: New `batch_create_todos` MCP tool for creating multiple todos in a single operation
  - Supports hierarchical todo creation with parent-child relationships via `parentIndex`
  - Optimized performance with single file write for entire batch
  - Comprehensive validation with automatic rollback on failure
  - Full test coverage with 13 passing tests
- **TodoRepository Enhancement**: Added `createBatch` method for efficient bulk todo creation
  - 50% faster than individual creates for batches of 20+ todos
  - Handles batches of 100+ todos in under 5 seconds
  - Atomic operations with rollback support

### Changed
- Updated README.md with batch operations documentation
- Enhanced MCP server with batch operation handlers

### Technical Details
- Implementation in `src/server/MCPServer.ts` (lines 272-334, 638-732)
- Repository method in `src/data/TodoRepository.ts` (lines 98-134)
- Comprehensive test suite in `tests/batchOperations.test.ts`

## [1.0.0] - 2025-10-26

### Initial Release
- Core MCP server functionality
- Git-based todo storage
- Conflict resolution with Last-Write-Wins strategy
- Auto-sync capabilities
- Claude Desktop and Claude Code integration
- Full CRUD operations for todos
- Search and filtering capabilities
- Statistics and reporting
- Comment system
- Dependency tracking