# ADR 001: Svelte 5 Runes Testing Strategy

## Status

**DRAFT** - Proposed (2025-10-31)

Awaiting decision on testing strategy for Svelte 5 rune-based state management.

## Context

### Problem Statement

All 64 Web UI component tests are failing with the error:
```
Svelte error: rune_outside_svelte
The `$state` rune is only available inside .svelte and .svelte.js/ts files
```

### Technical Background

**Current Architecture:**
- Web UI built with Svelte 5 using modern Runes API (`$state`, `$derived`)
- Central state management via `todoStore` (`src/lib/stores/todos.svelte.ts`)
- Store uses `$state` runes for reactive state management
- Component tests import the store directly for assertions
- Vitest test runner with jsdom environment

**Root Cause:**
When test files import the `todoStore`, Svelte 5 runes attempt to initialize outside of a valid Svelte component context. Runes are compile-time features that require the Svelte compiler to transform them into reactive state handlers. In the test environment:
1. Test files import store → `import { todoStore } from '../stores/todos.svelte'`
2. Store initialization triggers → `todos = $state<Todo[]>([])`
3. Rune executes outside component context → Error thrown
4. All tests fail before assertions run

**Impact:**
- 64/81 Web UI tests failing (79% failure rate)
- No component testing coverage currently functional
- Blocks CI/CD validation
- Prevents detection of UI regressions
- Affects developer confidence in changes

**Constraints:**
- Must maintain Svelte 5 compatibility (already in production)
- Should preserve type safety with TypeScript
- Need to keep test suite maintainable
- Cannot sacrifice runtime performance for testability
- Tests should remain fast (<2s total execution time)

## Decision Drivers

1. **Test Coverage**: Need functional component tests to ensure UI quality
2. **Development Velocity**: Quick test feedback loops are critical
3. **Maintainability**: Solution should be easy to understand and maintain
4. **Type Safety**: Must preserve TypeScript benefits
5. **Framework Compatibility**: Should work with Svelte 5 runes idiomatically
6. **Migration Effort**: Minimize refactoring work required
7. **Future-Proofing**: Solution should work with future Svelte updates

## Considered Options

### Option 1: Mock todoStore in All Tests

**Description:**
Mock the entire `todoStore` in test setup, providing test-friendly implementations of state and methods.

**Implementation:**
```typescript
// test-utils.ts
export function createMockTodoStore() {
  return {
    todos: [],
    filters: { projects: [], tags: [], priority: 'all', ... },
    loading: false,
    error: null,
    filteredTodos: [],
    columnTodos: { todo: [], 'in-progress': [], blocked: [], done: [] },
    statistics: { total: 0, byStatus: {}, completionRate: 0 },
    loadTodos: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    // ... all other methods
  };
}

// Each test file
vi.mock('../stores/todos.svelte', () => ({
  todoStore: createMockTodoStore()
}));
```

**Pros:**
- ✅ Immediate solution - no architectural changes
- ✅ Full control over store behavior in tests
- ✅ Isolates component tests from store implementation
- ✅ Fast test execution (no real state management)
- ✅ Easy to set up specific test scenarios

**Cons:**
- ❌ High maintenance burden (mock must match store interface exactly)
- ❌ Tests don't validate real store behavior
- ❌ Duplicates store interface definition
- ❌ Type safety issues if mock drifts from real implementation
- ❌ Doesn't test store integration with components
- ❌ Requires updating mocks whenever store changes

**Effort:** Low (1-2 days)
**Risk:** Medium (tests may not catch real integration bugs)

---

### Option 2: Refactor Store to Factory Pattern

**Description:**
Convert the store from a singleton class to a factory function that can be initialized in different contexts (component vs test).

**Implementation:**
```typescript
// todos.svelte.ts
export function createTodoStore() {
  let todos = $state<Todo[]>([]);
  let filters = $state<TodoFilters>({ ... });
  // ... rest of implementation

  return {
    get todos() { return todos; },
    get filters() { return filters; },
    // ... methods
  };
}

// In components (preserves singleton behavior)
export const todoStore = createTodoStore();

// In tests (create fresh instance)
import { createTodoStore } from '../stores/todos.svelte';

describe('Component', () => {
  let store: ReturnType<typeof createTodoStore>;

  beforeEach(() => {
    store = createTodoStore(); // Fresh instance per test
  });
});
```

**Pros:**
- ✅ Tests use real store implementation (high confidence)
- ✅ Fresh store instance per test (isolation)
- ✅ Maintains type safety
- ✅ Follows testing best practices
- ✅ Easier to test store logic independently
- ✅ Future-proof for Svelte updates

**Cons:**
- ❌ Requires significant refactoring of store
- ❌ Need to update all component imports
- ❌ May still hit rune initialization issues in test context
- ❌ Breaks singleton pattern (components share no state by default)
- ❌ Need careful management of store instances in components

**Effort:** Medium-High (3-5 days)
**Risk:** Medium (may not fully resolve rune context issue)

**Research Needed:**
- Test if factory pattern resolves rune context errors
- Verify Svelte compiler handles factory functions correctly
- Check if `$state` runes work in factory returns

---

### Option 3: Configure Vitest for Svelte 5 Runes Support

**Description:**
Update Vitest configuration and testing environment to properly support Svelte 5 runes in test context.

**Implementation:**
```typescript
// vitest.config.ts
export default defineConfig({
  plugins: [
    svelte({
      hot: false,
      compilerOptions: {
        // Enable runes mode for test compilation
        runes: true
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Potential additional config
  }
});

// test-setup.ts
import { flushSync } from 'svelte';
import { tick } from 'svelte';

// Initialize Svelte runtime for tests
// ... setup code
```

**Pros:**
- ✅ Minimal code changes required
- ✅ Tests use real implementation
- ✅ Idiomatic Svelte 5 approach
- ✅ Future-proof (official solution)
- ✅ No architectural changes needed
- ✅ Maintains singleton store pattern

**Cons:**
- ❌ May not be fully supported yet by tooling
- ❌ Requires deep understanding of Svelte compiler
- ❌ Documentation may be limited
- ❌ Could break with Svelte updates
- ❌ Uncertain if solution exists

**Effort:** Low-Medium (1-3 days research + implementation)
**Risk:** High (solution may not exist or be stable)

**Research Needed:**
- ⚠️ **CRITICAL**: Check Svelte 5 + Vitest official documentation
- ⚠️ **CRITICAL**: Review open issues in Svelte/Vitest repos
- Search for community solutions (GitHub, Discord)
- Test minimal reproduction case
- Consult Svelte 5 testing guide

---

### Option 4: Hybrid Approach - Extract Non-Rune State Layer

**Description:**
Separate state management into two layers:
1. Plain TypeScript state container (testable)
2. Thin Svelte rune wrapper for reactivity (used in components)

**Implementation:**
```typescript
// core-store.ts (plain TypeScript - fully testable)
export class TodoStoreCore {
  private _todos: Todo[] = [];
  private _filters: TodoFilters = { ... };

  get todos() { return this._todos; }
  get filters() { return this._filters; }

  setTodos(todos: Todo[]) {
    this._todos = todos;
  }

  async loadTodos() {
    // All logic here
  }

  get filteredTodos() {
    // Filtering logic
    return this._todos.filter(...);
  }
}

// todos.svelte.ts (Svelte wrapper - thin reactivity layer)
const core = new TodoStoreCore();

export const todoStore = {
  get todos() { return $state.snapshot(core.todos); },
  get filters() { return core.filters; },
  loadTodos: core.loadTodos.bind(core),
  // ... delegate to core
};

// Tests import core directly
import { TodoStoreCore } from '../stores/core-store';

describe('Store', () => {
  let store: TodoStoreCore;

  beforeEach(() => {
    store = new TodoStoreCore();
  });

  it('filters todos', () => {
    store.setTodos([...]);
    expect(store.filteredTodos).toHaveLength(2);
  });
});
```

**Pros:**
- ✅ Core logic fully testable without Svelte
- ✅ Clear separation of concerns
- ✅ Type-safe
- ✅ No rune issues in tests
- ✅ Can test store independently of Svelte
- ✅ Maintains reactive behavior in components
- ✅ Flexible architecture for future changes

**Cons:**
- ❌ Significant architectural change
- ❌ More boilerplate code
- ❌ Two layers to maintain
- ❌ May lose some Svelte reactivity benefits
- ❌ Complexity increase

**Effort:** High (5-7 days)
**Risk:** Low (well-understood pattern, guaranteed to work)

---

### Option 5: Use Svelte Testing Library with Component Wrappers

**Description:**
Don't test the store directly. Instead, wrap store access in minimal Svelte components for testing.

**Implementation:**
```svelte
<!-- TestWrapper.svelte -->
<script lang="ts">
  import { todoStore } from '../stores/todos.svelte';
  export let onMount: (store: typeof todoStore) => void;

  onMount?.(todoStore);
</script>

<div data-testid="store-wrapper">
  <slot />
</div>
```

```typescript
// test
import { render } from '@testing-library/svelte';
import TestWrapper from './TestWrapper.svelte';

describe('Store', () => {
  it('loads todos', async () => {
    let store: any;

    render(TestWrapper, {
      props: {
        onMount: (s) => { store = s; }
      }
    });

    await store.loadTodos();
    expect(store.todos).toHaveLength(3);
  });
});
```

**Pros:**
- ✅ Tests run in valid Svelte component context
- ✅ Uses real store implementation
- ✅ Idiomatic Svelte testing approach
- ✅ No architectural changes to store

**Cons:**
- ❌ Verbose test setup
- ❌ Tests are more integration-style than unit tests
- ❌ Slower execution (component mounting overhead)
- ❌ Harder to test edge cases
- ❌ Still testing components, not store in isolation

**Effort:** Low-Medium (2-3 days)
**Risk:** Medium (tests may be slower and more brittle)

---

## Comparison Matrix

| Criterion | Option 1: Mock | Option 2: Factory | Option 3: Config | Option 4: Hybrid | Option 5: Wrapper |
|-----------|---------------|-------------------|------------------|------------------|-------------------|
| **Effort** | Low (1-2d) | Med-High (3-5d) | Low-Med (1-3d) | High (5-7d) | Low-Med (2-3d) |
| **Risk** | Medium | Medium | High | Low | Medium |
| **Maintainability** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Test Confidence** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Type Safety** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Future-Proof** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Arch Changes** | None | Medium | None | Large | Small |
| **Test Speed** | ⚡⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | ⚡⚡⚡ |

## Research Plan

### Phase 1: Immediate Research (1-2 hours)

**Priority 1: Verify Official Solution Exists**
- [ ] Read Svelte 5 testing documentation: https://svelte.dev/docs/svelte/testing
- [ ] Check Vitest + Svelte 5 integration guide
- [ ] Review `@testing-library/svelte` version compatibility
- [ ] Search Svelte GitHub issues for "rune testing" / "rune_outside_svelte"
- [ ] Check Vitest GitHub for Svelte 5 runes issues

**Priority 2: Community Solutions**
- [ ] Search GitHub for "svelte 5 runes vitest" repositories
- [ ] Check Svelte Discord #testing channel
- [ ] Review recent blog posts on Svelte 5 testing

**Priority 3: Quick Proof of Concept**
- [ ] Create minimal repro case (single component + store + test)
- [ ] Test factory pattern with runes
- [ ] Test component wrapper approach
- [ ] Document findings

### Phase 2: Detailed Analysis (if no official solution found)

**Option Analysis:**
- [ ] Prototype Option 2 (Factory) - Does it fix rune errors?
- [ ] Prototype Option 4 (Hybrid) - Estimate refactoring scope
- [ ] Measure test execution time for Option 5 (Wrapper)

**Architecture Impact Assessment:**
- [ ] List all files requiring changes per option
- [ ] Estimate lines of code changed
- [ ] Identify breaking changes for each option
- [ ] Create migration checklist

### Phase 3: Decision Making (after research)

**Decision Criteria:**
1. Does an official/recommended solution exist? → Use it (Option 3)
2. If not, what's the effort/risk trade-off?
3. How important is test confidence vs. speed to market?
4. What's the long-term maintenance cost?

## Preliminary Recommendation

**First: Complete Phase 1 Research** (Option 3 investigation)

If Svelte 5 + Vitest has official support for runes in tests:
- **→ Choose Option 3** (Configure Vitest)
- Lowest effort, future-proof, idiomatic

If no official solution exists:
- **→ Choose Option 4** (Hybrid Architecture)
- Higher effort but guaranteed to work
- Best long-term maintainability
- Clear separation of concerns
- Fully testable without Svelte-specific tooling
- **Alternative**: Option 2 (Factory) if hybrid is too complex

**Avoid:**
- ❌ Option 1 (Mock) - Too much maintenance burden
- ⚠️ Option 5 (Wrapper) - Unless quick fix needed temporarily

## Decision Outcome

**[TO BE DECIDED]** after completing research plan

### Implementation Steps (TBD)

Will be filled in after decision is made.

### Success Criteria

Regardless of option chosen:
- [ ] All 81 Web UI tests passing
- [ ] Test execution time < 3 seconds
- [ ] No false positives/negatives
- [ ] Type safety maintained
- [ ] CI/CD pipeline green
- [ ] Developer experience improved (fast feedback)
- [ ] Documentation updated with testing patterns

## Consequences

### Positive

- Restored component test coverage
- Confidence in UI changes
- Faster development cycles
- Better regression detection

### Negative

- Time investment required for implementation
- Potential learning curve for chosen approach
- May need to update testing documentation

### Neutral

- Testing strategy becomes more explicit
- May influence future state management decisions

## Related Decisions

- ADR 002: (Future) State Management Strategy for Large Applications
- ADR 003: (Future) Component Testing Standards

## References

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/runes)
- [Svelte Testing Documentation](https://svelte.dev/docs/svelte/testing)
- [Vitest Documentation](https://vitest.dev/)
- [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- [GitHub Issue: rune_outside_svelte error](https://github.com/sveltejs/svelte/issues)

## Notes

- This issue is specific to Svelte 5's new Runes API (introduced in v5.0)
- Similar issues may affect other projects migrating to Svelte 5
- Solution may inform testing approach for future Svelte features
- Document chosen approach for team knowledge sharing

---

**Last Updated:** 2025-10-31
**Author:** Claude Code
**Reviewers:** [TBD]
**Status:** Draft → [Awaiting Research] → [Awaiting Decision] → [Accepted/Rejected]
