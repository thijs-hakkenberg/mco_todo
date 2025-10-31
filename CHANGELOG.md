# Changelog

All notable changes to the Git-Based MCP Todo Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-10-31

### Added
- **Field Selection Modes**: Reduce payload sizes by selecting only needed fields
  - `minimal` mode - Returns only `id`, `text`, `status`, `priority`, `project` (86% size reduction)
  - `standard` mode - Adds `tags`, `assignee`, timestamps (62% size reduction)
  - `full` mode - Returns all fields including `description`, `comments`, `subtasks`
  - Custom field selection via `fields` and `excludeFields` arrays
- **Include Completed Filter**: Control visibility of completed todos
  - Default: Web UI hides completed todos (cleaner kanban board)
  - MCP tool: includes completed by default (backward compatible)
  - API: includes completed by default (backward compatible)
  - Toggle in Web UI FilterBar: "Show completed" checkbox
- **Null Date Field Filtering**: Hide null `dueDate` and `completedAt` fields by default
  - Reduces noise in responses
  - Can be overridden with `includeNullDates: true`
- **Missing List Parameters**: Added previously missing parameters to MCP tool and API
  - `sortOrder` - Control ascending/descending sort order
  - `offset` - Enable pagination with offset
  - `includeArchived` - Show archived todos
  - `includeNullDates` - Control null date field visibility

### Changed
- **Default List Behavior**: Web UI now hides completed todos by default
  - Improves kanban board visibility
  - Reduces cognitive load by focusing on active work
  - Can be toggled on with "Show completed" checkbox
- **API Response Sizes**: Reduced by 60-86% depending on mode
  - Web UI uses `standard` mode by default
  - Significantly faster load times for large todo lists
  - Lower bandwidth usage
- **Priority Sorting**: Fixed sort order to match user expectations
  - `sortOrder: 'desc'` now correctly shows high priority first
  - `sortOrder: 'asc'` shows low priority first
  - Previous behavior was inverted

### Fixed
- **Filter Precedence**: Fixed `includeCompleted` vs `status` filter conflict
  - Explicit `status: 'done'` now overrides `includeCompleted: false`
  - Allows users to specifically query completed todos
- **Priority Sort Order**: Corrected priority numeric mapping
  - Changed from `{urgent: 0, high: 1, medium: 2, low: 3}`
  - To `{low: 0, medium: 1, high: 2, urgent: 3}`
  - Now `sortOrder: 'desc'` shows most important tasks first

### Technical Details

#### TodoRepository
- Added `ListOptions` fields: `mode`, `fields`, `excludeFields`, `includeCompleted`, `includeNullDates`, `offset`, `sortOrder`
- Implemented `projectFields()` private method for field projection
- Updated `list()` to apply field projection and handle `includeCompleted` filter
- All 26 integration tests passing

#### MCP Server
- Updated `list_todos` tool schema with comprehensive field selection parameters
- Added comments grouping parameters by category (filter, sort, pagination, field selection)
- Handler automatically passes all parameters to repository (no changes needed)

#### API Server
- Updated `/api/todos` endpoint to accept new query parameters
- Added proper type coercion for boolean and numeric parameters
- Maintains backward compatibility (omitting parameters uses defaults)

#### Web UI
- Added `includeCompleted` to `TodoFilters` interface
- Updated `todoStore.loadTodos()` to use `mode: 'standard'` and `includeCompleted` filter
- Added `setIncludeCompletedFilter()` method with automatic reload
- Added "Show completed" toggle in FilterBar component
- **Note**: Web UI tests need updates for new filter structure (64 tests to update)

#### Test Coverage
- Created comprehensive test suites for field selection (`TodoRepository.field-selection.test.ts`)
- Created test suite for `includeCompleted` filter (`TodoRepository.default-filters.test.ts`)
- Updated MCP tool tests to cover new parameters (`todoTools.test.ts`)
- Backend: 26/26 new integration tests passing
- Frontend: Tests pending updates for new filter structure

### Documentation
- Created `docs/PLANNING.md` with next 7 high-priority tasks
- Updated CHANGELOG with comprehensive v1.4.0 notes

### Migration Guide

#### For MCP Tool Users
```javascript
// Old: Returns all fields, includes completed
await callTool('list_todos', { project: 'work' });

// New: Return only needed fields, hide completed
await callTool('list_todos', {
  project: 'work',
  mode: 'standard',  // Smaller payload
  includeCompleted: false  // Hide completed
});
```

#### For API Users
```bash
# Old: Returns all fields, includes completed
GET /api/todos?project=work

# New: Return only needed fields, hide completed
GET /api/todos?project=work&mode=standard&includeCompleted=false
```

#### For Web UI
- No migration needed - new toggle is opt-in
- Default behavior now hides completed todos (can be enabled with checkbox)

## [1.3.0] - 2025-10-30

### Added
- **Dynamic Filter Options**: New MCP tools and API endpoints for retrieving distinct filter values
  - `get_projects` - Get list of all unique projects
  - `get_tags` - Get list of all unique tags
  - `get_assignees` - Get list of all unique assignees
  - `get_priorities` - Get list of all priorities
  - `get_filter_options` - Get all filter options in one call (combined)
  - `/api/todos/filter-options` endpoint for web UI
- **Multi-Select Dropdown Component**: Searchable dropdown for filtering with many options
  - Replaces chip-based UI for projects and tags (handles 100+ items gracefully)
  - Search/filter within dropdown
  - Shows selected count in button ("Projects (3)" or "All Projects")
  - Click-outside-to-close behavior
  - Smooth animations and keyboard accessible

### Changed
- **FilterBar UX Enhancement**: Replaced overwhelming chip layout with scalable dropdowns
  - Projects: Chip-based → Multi-select dropdown (handles 17+ projects)
  - Tags: Chip-based → Multi-select dropdown (handles 270+ tags)
  - Priorities: Kept as chips (only 4 items)
  - Assignees: Kept as chips (small list)
- **Filter Data Model**: Updated from single-select to multi-select
  - `TodoFilters.project` → `TodoFilters.projects: string[]`
  - `TodoFilters.tags` changed from `Set<string>` to `string[]`
  - Empty arrays mean "show all" (no filter applied)

### Fixed
- **Svelte 5 Compatibility**: Migrated legacy reactive statements to modern runes
  - Replaced `$:` with `$derived` in FilterBar
  - Converted store getters to `$derived.by()` for proper reactivity
  - Migrated component props from `export let` to `$props()`
- **Tailwind CSS v4**: Fixed configuration to use CSS-based config instead of v3 directives
  - Changed from `@tailwind` directives to `@import "tailwindcss"`
  - All utility classes now generate correctly
- **Kanban Board Scrolling**: Fixed vertical scrolling issue
  - Changed `overflow: hidden` to `overflow-y: auto` in App.svelte
  - Users can now scroll through all todos in columns
  - Content expands beyond viewport as needed

### Technical Details
- TodoRepository: 5 new atomic methods (`getProjects`, `getTags`, `getAssignees`, `getPriorities`, `getFilterOptions`)
- MCPServer: 5 new MCP tools for filter options
- MultiSelectDropdown: Reusable Svelte 5 component with TypeScript
- Comprehensive test coverage: 13 new tests for filter options (105/105 unit tests passing)
- Jest configuration updated to include `tests/` directory

### Known Issues
- Scrolling down does not work in kanban board UI (tracked in git-todo)

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