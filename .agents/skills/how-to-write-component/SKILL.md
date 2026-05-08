---
name: how-to-write-component
description: React/TypeScript component style guide. Use when writing, refactoring, or reviewing React components, especially around props typing, state boundaries, shared local state with Jotai atoms, API types, navigation, memoization, wrappers, and empty-state handling.
---

# How To Write A Component

Follow existing project patterns first. Use these rules to resolve unclear component decisions:

## Component Declaration And Exports

- Do not use `FC` or `React.FC`; type the function signature directly.
- Prefer `function` for top-level components and module helpers. Arrow functions are fine for local callbacks, handlers, and APIs that naturally take lambdas.
- Prefer named exports. Use default exports only where the framework requires them, such as Next.js route files.

## Props And API Types

- Type simple one-off props inline. Use a named `Props` type only when reused, exported, complex, or clearer.
- Prefer API-generated or API-returned types at component boundaries. Keep small UI conversion helpers beside the component that needs them.
- Avoid duplicate invariant checks across parent and child. If a lower-level component already handles empty or invalid data, let callers pass raw values through and keep the fallback there.

## State Ownership

- Keep state, query state, handlers, and derived UI data near the component that owns the interaction. Do not lift state unless siblings or parents genuinely coordinate through it.
- When local UI state must be shared across siblings, distant children, or feature-local surfaces, use a colocated Jotai `atom` instead of prop drilling or lifting state into a broad parent. Keep atoms feature-scoped and UI-owned; do not use them for server/cache state that belongs in query or API data flow.
- Prefer uncontrolled components when DOM-owned state is enough. Expose style customization through CSS variables before adding controlled props only for visual changes.

## Component Boundaries

- Keep the component's first-render surface separate from secondary interactive surfaces. For dialogs, dropdown menus, popovers, and similar branches, split from the trigger boundary: extract a small local component that owns the trigger, open state, and overlay/menu content when that branch would obscure the parent UI flow. Do not further split the dialog body, menu body, or form content unless it has its own state, reuse, complexity, or semantic boundary.
- Avoid shallow wrappers and unnecessary renaming. Call the original function directly unless the wrapper adds validation, orchestration, error handling, state ownership, or a real semantic boundary.

## Navigation

- Prefer `Link` for normal navigation. Use router APIs only for command-flow side effects such as mutation success, guarded redirects, or form submission.

## Effects

- Treat `useEffect` as a last resort. Before adding or keeping one, first try to delete it by deriving values during render, moving event-driven work into handlers, or replacing persistence, subscription, media-query, timer, and DOM sync cases with existing equivalent hooks/APIs.
- Do not use `useEffect` directly in components. If an effect remains genuinely unavoidable after checking for a declarative substitute, encapsulate it in a purpose-built hook so the component consumes a declarative API instead of managing the effect inline.

## Performance

- Avoid `memo`, `useMemo`, and `useCallback` unless there is a clear performance reason.
