# Testing Svelte 5 Runes: The Complete Solution Guide

**Svelte 5's rune-based reactivity works brilliantly in production but breaks traditional testing approaches.** The "rune_outside_svelte" error that occurs when importing stores with $state in test files has clear solutions, and the ecosystem is actively transitioning from jsdom mocking to real browser testing. As of early 2025, the testing landscape has matured significantly with official documentation, proven patterns, and a strong community consensus emerging around vitest-browser-svelte.

## The rune_outside_svelte error has a simple fix: file naming

The error occurs because **runes only work in files the Svelte compiler processes**. Regular test files like `counter.test.js` aren't compiled by Svelte, so $state and $derived throw errors. The solution is straightforward: test files must use `.svelte.test.js` or `.svelte.test.ts` naming, and source files with runes must use `.svelte.js` or `.svelte.ts` extensions. This isn't a bug—it's expected behavior that ensures Svelte knows which files to transform.

Beyond naming, tests must run in a **browser environment** (jsdom or real browsers), not plain Node.js. By default, Svelte generates server-side code that's non-reactive. Without setting `environment: 'jsdom'` in Vitest config or adding `// @vitest-environment jsdom` to test files, $state and $derived simply won't update during tests. The official Svelte documentation at svelte.dev/docs/svelte/testing now provides comprehensive guidance on these requirements, alongside working examples of testing runes with Vitest.

## Official support exists with clear patterns but the ecosystem is evolving

The official Svelte 5 documentation recommends Vitest and provides explicit testing patterns for runes. For basic $state testing, no special wrappers are needed—just proper file naming. For $derived and $effect, tests must wrap code in `$effect.root()` to create a reactive context and use `flushSync()` for synchronous assertions. The pattern looks like this:

```javascript
// multiplier.svelte.test.js
import { flushSync } from 'svelte';
import { expect, test } from 'vitest';
import { multiplier } from './multiplier.svelte.js';

test('Multiplier', () => {
  const cleanup = $effect.root(() => {
    let count = $state(0);
    let double = multiplier(() => count, 2);
    
    flushSync();
    expect(double.value).toBe(0);
    
    count = 5;
    flushSync();
    expect(double.value).toBe(10);
  });
  cleanup();
});
```

**@testing-library/svelte version 5.2.x officially supports Svelte 5** with the `svelteTesting` plugin from `@testing-library/svelte/vite`. This plugin automatically adds cleanup fixtures and sets browser resolution conditions, which are critical for runes to work. However, the community is actively migrating away from this approach toward vitest-browser-svelte, which tests in real browsers via Playwright rather than simulating browser APIs in jsdom.

## The factory pattern works—with caveats

**Yes, the factory pattern successfully resolves rune context errors in tests.** Creating functions that return objects with rune-based state exposed via getters/setters allows universal reactive state that works everywhere—in components, tests, and utilities. This pattern is officially documented and widely used in production applications.

The critical requirements are using `.svelte.js` extensions, running in browser/jsdom environments, and implementing getters for primitives to maintain reactivity (a JavaScript limitation, not Svelte-specific). The factory pattern provides cleaner ergonomics than Svelte 4 stores and enables isolated testing without mocking. However, it requires boilerplate code and doesn't eliminate the need for `flushSync()` when testing external state changes.

## Version compatibility matters: recent Svelte/Vitest combinations break tests

**GitHub Issue #16092 documents that testing rune effects is broken in Svelte >5.1.11 with Vitest 3.x.** Tests using `flushSync()` fail because the sync mechanism is ignored and $effect code doesn't run. The only working combination as of early 2025 is **Svelte ≤5.1.11 + Vitest ≤3.1.4**. This is a critical regression affecting documentation examples and has been reproduced in multiple community repositories.

Issues #10244 and #14900 document the core challenge: $derived values don't update in tests when using the default Node.js environment. The root cause is that SSR code lacks reactivity. Community solutions involve using `$effect.root()` wrappers and returning derived values via getters rather than direct references. These patterns are now incorporated into official documentation but represent implementation details that many developers initially miss.

## Real browser testing is emerging as the best practice

**The community consensus is shifting strongly toward vitest-browser-svelte**, which runs tests in real browsers via Playwright instead of simulating browser APIs. Scott Spence, a Svelte Ambassador, documented migrating a large monorepo (6,000 tests) from @testing-library/svelte to browser mode, reporting **30% faster CI times** and significantly simplified test code by eliminating 60-250 line browser API mock files.

The vitest-browser-svelte approach provides native Svelte 5 runes support without workarounds because tests run where runes actually work—in browser environments. Locators automatically retry assertions, reducing or eliminating the need for `flushSync()` in most component tests. At Svelte Summit 2024, SvelteKit core maintainer Dominik G demonstrated this approach, emphasizing "why mock browser APIs when you can just use real ones?"

The setup requires Vitest 4.0.0+, Playwright installation, and configuring browser mode in vite.config:

```javascript
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      name: 'chromium',
    },
    setupFiles: ['vitest-browser-svelte'],
  },
});
```

## Working examples exist at scale

**The sveltest repository by Scott Spence is the primary reference** for Svelte 5 testing patterns, featuring 576 passing tests across client, server, and SSR scenarios. Available at github.com/spences10/sveltest with live documentation at sveltest.dev, it demonstrates production-ready testing patterns including multi-project Vitest configurations separating client and server tests, component testing with real browser environments, and testing universal state from .svelte.ts files.

The project uses a "Foundation First" approach where teams implement core rendering tests first, then progressively add interaction and edge case tests. This incremental strategy helps teams adopt testing without overwhelming complexity. The repository includes AI assistant rules for Cursor and Windsurf to help teams learn the patterns.

## Configuration is critical but straightforward

**vitest-plugin-svelte doesn't exist as a separate package**—the Svelte plugin is `@sveltejs/vite-plugin-svelte`. For testing, the essential configuration includes setting the test environment to jsdom (not the default Node environment) and using browser resolution conditions. The minimal working configuration looks like:

```javascript
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  plugins: [sveltekit(), svelteTesting()],
  test: {
    environment: 'jsdom',
  },
  resolve: process.env.VITEST ? {
    conditions: ['browser']
  } : undefined
});
```

Svelte 5 auto-detects runes mode based on file content, so explicit `runes: true` compiler options are rarely needed. The `svelteTesting` plugin from @testing-library/svelte adds automatic cleanup and browser resolution, though this becomes unnecessary when using vitest-browser-svelte.

## Mocking stores is an anti-pattern for Svelte 5 runes

**Traditional store mocking strategies don't work well with rune-based state** because runes require component context to function. Attempting to mock $state stores at the module level creates brittle tests that diverge from real behavior. The recommended approach is testing real store instances in proper browser environments rather than creating mock implementations.

When mocking is necessary, mock at module boundaries (external APIs and services) rather than internal rune state. For components using `getContext()`, wrapper components are the legitimate testing pattern recommended in official documentation. These wrappers allow setting context values without relying on internal Svelte APIs.

## Comparison: browser mode wins for components, factory pattern for logic

Comparing testing approaches reveals clear trade-offs:

**Vitest Browser Mode** provides the highest accuracy by testing in real browsers, excellent Svelte 5 support, and low maintenance once set up. It's medium complexity initially but eliminates extensive mocking. This is the emerging best practice for all component testing.

**Factory Pattern** works excellently for universal state and reusable logic with medium setup complexity and low maintenance. It enables isolated testing of state management without mocking but requires boilerplate getters/setters and proper file naming.

**@testing-library/svelte with jsdom** is still functional but represents legacy practice. It requires high maintenance with extensive browser API mocking, has only partial Svelte 5 support, and fights against framework patterns. The ecosystem is actively moving away from this approach.

**Component wrappers** have low setup complexity and are officially recommended for context-dependent components and slots. They're necessary when components use `getContext()` but cannot test components in complete isolation.

**Mocking strategies** should be reserved for external dependencies, not Svelte runes. Mocking rune-based stores creates high maintenance burden and poor accuracy with Svelte 5's reactivity model.

The recommended hybrid approach for new 2025 projects: use factory patterns for universal state, vitest-browser-svelte for component tests, component wrappers when needed for context, and mock only at module boundaries for external APIs.

## Testing maturity: 7/10 and improving rapidly

The Svelte 5 testing ecosystem rates approximately **7/10 in maturity as of early 2025**. Core functionality is stable with official documentation, proven patterns exist in production applications, and the community has established best practices. However, the ecosystem is actively transitioning from jsdom to browser mode, creating temporary uncertainty about "correct" approaches.

Stable aspects include basic rune testing with factory patterns, component testing with mount/unmount APIs, flushSync for synchronous updates, and Vitest as the recommended test runner. Evolving aspects include best practices for universal state, migration paths from testing-library to browser mode, and patterns for testing $effect and $derived runes.

Community pain points include jsdom API mocking becoming unwieldy (60-250 line mock files reported), confusion about when flushSync is needed, and the learning curve for new patterns. The ecosystem feels less mature than React Testing Library but is improving rapidly with strong momentum behind vitest-browser-svelte.

## Conclusion: Clear solutions exist with strong forward momentum

The "rune_outside_svelte" error has well-documented solutions: use `.svelte.test.js` naming, set browser/jsdom environment, and follow official patterns. The factory pattern definitively works for testing rune-based stores when properly configured. The ecosystem is transitioning toward real browser testing with vitest-browser-svelte as the emerging standard, supported by official Vitest team and Svelte core maintainers.

For immediate implementation, **adopt the factory pattern for universal state**, **start new component tests with vitest-browser-svelte**, and **follow the sveltest repository examples**. Existing projects using @testing-library/svelte should continue while planning gradual migration over 6-12 months as the ecosystem standardizes. The testing story for Svelte 5 runes is significantly better than it was in mid-2024, with a clear path forward and production-ready patterns available now.