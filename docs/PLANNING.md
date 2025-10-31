# Project Planning: Next High-Priority Tasks

This document outlines the next 7 high-priority tasks for the Git-Based MCP Todo Server project, following the recent implementation of field selection and filtering features.

## Recent Completed Work (v1.4.0)

✅ **Field Selection & Filtering** - Just completed!
- Implemented field selection modes (minimal, standard, full, custom)
- Added `includeCompleted` filter with default hiding of completed todos
- Updated MCP tool, API endpoint, and Web UI
- Reduced payload sizes using `mode: 'standard'`
- All backend tests passing (26/26 integration tests)

## High-Priority Tasks

### 1. Update Web UI Test Suite for New Filter Structure
**Priority**: High
**Effort**: Medium (2-3 hours)
**Status**: In Progress

**Description**: The Web UI tests (64 failures) need updates to match the new filter structure introduced in v1.4.0:
- Update filter expectations from `project: 'all'` to `projects: []`
- Update `tags` from `Set` to array
- Add `includeCompleted: false` to default filters
- Fix fetch mocking to include new qery parameters (`mode`, `includeCompleted`)

**Acceptance Criteria**:
- All Web UI tests pass (81 tests)
- FilterBar component tests validate "Show completed" toggle
- TodoStore tests validate new filter structure

**Technical Notes**:
```typescript
// Old structure
{ project: 'all', tags: new Set(['all']) }

// New structure
{ projects: [], tags: [], includeCompleted: false }
```

---

### 2. Fix SyncManager Timing Tests
**Priority**: High
**Effort**: Small (1-2 hours)
**Status**: Not Started

**Description**: Two SyncManager tests are failing due to timing issues in async operations.

**Location**: `tests/unit/SyncManager.test.ts`

**Acceptance Criteria**:
- All SyncManager tests pass
- Tests are stable across multiple runs
- No flaky behavior

**Technical Approach**:
- Add proper async/await handling
- Use Jest fake timers where appropriate
- Ensure proper cleanup in afterEach

---

### 3. Document Field Selection Features
**Priority**: High
**Effort**: Medium (2-3 hours)
**Status**: Not Started

**Description**: Create comprehensive documentation for the new field selection and filtering features.

**Deliverables**:
1. **User Guide** (`docs/FIELD_SELECTION.md`):
   - Overview of field selection modes
   - Examples for MCP tool usage
   - Examples for API usage
   - Examples for Web UI usage
   - Performance benefits

2. **API Reference Updates** (`README.md`):
   - Update `list_todos` MCP tool documentation
   - Update API endpoint documentation
   - Add migration guide for existing code

3. **Examples**:
   - Claude Code usage examples
   - cURL examples for API
   - Performance comparisons

**Sample Content**:
```markdown
## Field Selection Modes

### Minimal Mode
Returns only essential fields: `id`, `text`, `status`, `priority`, `project`

Perfect for: List views, dropdowns, autocomplete

Example:
```json
{
  "mode": "minimal",
  "includeCompleted": false
}
```

### Standard Mode
Returns minimal fields plus: `tags`, `assignee`, `createdAt`, `modifiedAt`, `dueDate` (if set)

Perfect for: Kanban boards, dashboards, main views

### Full Mode
Returns all fields including: `description`, `comments`, `subtasks`, `fieldTimestamps`

Perfect for: Detail views, editing, complete data export
```

---

### 4. Implement User Collaboration Tools
**Priority**: Medium
**Effort**: Large (1-2 weeks)
**Status**: Not Started

**Description**: Add features to support multiple users collaborating on todos.

**Features**:
1. **User Management**:
   - User authentication (optional, via Git config)
   - User profiles with display names and avatars
   - Activity tracking per user

2. **Real-time Collaboration** (Optional):
   - WebSocket support for live updates
   - Presence indicators (who's viewing what)
   - Conflict resolution notifications

3. **Audit Trail**:
   - Enhanced Git commit messages with user attribution
   - Activity log view in Web UI
   - Change history per todo

4. **Permissions** (Future):
   - Project-level permissions
   - Read-only mode for viewers
   - Admin roles

**Acceptance Criteria**:
- Multiple users can work concurrently without conflicts
- Git history clearly shows who made each change
- Web UI displays user activity

**Technical Decisions Needed**:
- Authentication method (OAuth, JWT, or Git config only)
- Real-time vs polling for updates
- Conflict resolution strategy (current LWW vs more advanced)

---

### 5. Enhance Comment System
**Priority**: Medium
**Effort**: Medium (3-5 days)
**Status**: Not Started

**Description**: Improve the comment system with rich features.

**Features**:
1. **Rich Text Comments**:
   - Markdown support
   - Code syntax highlighting
   - @mentions for assignees
   - File attachments (stored in Git LFS or separate storage)

2. **Comment Reactions**:
   - Emoji reactions (👍, ❤️, 🎉, etc.)
   - Like/upvote system

3. **Comment Threading**:
   - Reply to specific comments
   - Nested comment view
   - Resolve/unresolve discussions

4. **Comment Notifications** (Future):
   - Email notifications for mentions
   - Webhook integration for Slack/Discord
   - In-app notification system

**Acceptance Criteria**:
- Comments support Markdown rendering
- Users can reply to comments (threading)
- @mentions work and notify users
- All stored efficiently in Git

**Data Model Updates**:
```typescript
interface Comment {
  id: string;
  user: string;
  text: string; // Markdown formatted
  timestamp: string;
  parentId?: string; // For threading
  reactions?: { emoji: string; users: string[] }[];
  resolved?: boolean;
  attachments?: { name: string; url: string }[];
}
```

---

### 6. Telegram Bot Interface
**Priority**: Low
**Effort**: Large (1-2 weeks)
**Status**: Not Started

**Description**: Create a Telegram bot interface for managing todos on mobile.

**Features**:
1. **Basic Commands**:
   - `/list` - List todos with filters
   - `/add <text>` - Create new todo
   - `/complete <id>` - Mark todo as done
   - `/search <query>` - Search todos
   - `/stats` - View statistics

2. **Interactive Features**:
   - Inline keyboards for status updates
   - Callback buttons for quick actions
   - Rich formatting for todo display
   - Emoji status indicators

3. **Notifications**:
   - Daily digest of todos
   - Due date reminders
   - Team activity notifications

4. **Integration**:
   - Connect via MCP protocol or API
   - Support multiple users/teams
   - Sync with Git repository

**Acceptance Criteria**:
- Bot responds to all basic commands
- Users can perform CRUD operations
- Bot maintains same data as Web UI/MCP
- Secure authentication

**Technical Stack**:
- node-telegram-bot-api or Telegraf
- Connect to existing API server
- Deploy on cloud platform (Heroku, Railway, etc.)

**Documentation Needed**:
- Bot setup guide
- User command reference
- Deployment instructions

---

### 7. Performance Optimization & Benchmarking
**Priority**: Low
**Effort**: Medium (3-5 days)
**Status**: Not Started

**Description**: Optimize field projection performance and create benchmarks.

**Tasks**:
1. **Benchmarking Suite**:
   - Create performance tests for TodoRepository.list()
   - Measure field projection overhead
   - Compare minimal vs standard vs full modes
   - Test with varying todo counts (100, 1000, 10000)

2. **Optimization Opportunities**:
   - Cache projected field sets
   - Optimize JSON serialization
   - Consider streaming for large datasets
   - Add pagination best practices

3. **Database Migration Planning** (Future):
   - Evaluate moving from JSON to SQLite for large datasets
   - Design migration path maintaining Git audit trail
   - Keep Git as source of truth, database as read cache

**Metrics to Track**:
- Response time by mode (minimal/standard/full)
- Memory usage per mode
- Payload sizes (target: 60-80% reduction for standard mode)

**Acceptance Criteria**:
- Benchmark suite runs automatically in CI
- Performance regression detection
- Documentation of performance characteristics

**Sample Benchmark Results**:
```
1000 todos dataset:
- Full mode:     125ms, 2.1MB payload
- Standard mode:  98ms, 0.8MB payload (62% reduction)
- Minimal mode:   45ms, 0.3MB payload (86% reduction)
```

---

## Additional Considerations

### Code Quality
- Add ESLint configuration for consistency
- Set up Prettier for code formatting
- Add commit hooks with Husky
- Increase test coverage to 95%+

### Documentation
- Video tutorial for getting started
- Architecture decision records (ADRs)
- Contributing guidelines
- API versioning strategy

### Deployment
- Docker containerization
- Kubernetes deployment manifests
- CI/CD pipeline enhancements
- Monitoring and logging setup

---

## Priority Matrix

| Task | Priority | Effort | Impact | Status |
|------|----------|--------|--------|--------|
| 1. Update Web UI Tests | High | Medium | High | In Progress |
| 2. Fix SyncManager Tests | High | Small | Medium | Not Started |
| 3. Document Field Selection | High | Medium | High | Not Started |
| 4. User Collaboration | Medium | Large | High | Not Started |
| 5. Enhance Comments | Medium | Medium | Medium | Not Started |
| 6. Telegram Bot | Low | Large | Medium | Not Started |
| 7. Performance Optimization | Low | Medium | Low | Not Started |

---

## Next Steps

**Immediate** (This Week):
1. Complete Web UI test updates (#1)
2. Fix SyncManager timing issues (#2)
3. Write field selection documentation (#3)

**Short-term** (Next 2-4 Weeks):
4. Design and implement user collaboration features (#4)
5. Enhance comment system (#5)

**Long-term** (Next 1-3 Months):
6. Build Telegram bot interface (#6)
7. Performance optimization and benchmarking (#7)

---

**Last Updated**: 2025-10-31
**Version**: 1.4.0
**Contributors**: thijs-hakkenberg, Claude Code
