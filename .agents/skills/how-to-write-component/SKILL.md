---
name: how-to-write-component
description: React/TypeScript component style guide. Use when writing, refactoring, or reviewing React components, especially around props typing, state boundaries, shared local state with Jotai atoms, API types, navigation, memoization, wrappers, and empty-state handling.
---

# How To Write A Component

Follow existing project patterns first. Use these rules to resolve unclear component decisions:

## Component Declaration And Exports

- Type component signatures directly; do not use `FC` or `React.FC`.
- Prefer `function` for top-level components and module helpers. Use arrow functions for local callbacks, handlers, and lambda-style APIs.
- Prefer named exports. Use default exports only where the framework requires them, such as Next.js route files.

## Props, Naming, And API Types

- Type simple one-off props inline. Use a named `Props` type only when reused, exported, complex, or clearer.
- Use API-generated or API-returned types at component boundaries. Keep small UI conversion helpers beside the component that needs them.
- Name values by their domain role and keep that name stable across the call chain, especially IDs such as `appInstanceId`. Normalize framework or route params at the boundary instead of passing aliased names through components.
- Keep fallback and invariant checks at the lowest component that already handles that state; callers should pass raw values through instead of duplicating checks.

## State, Queries, And Callbacks

- Keep local state, query state, handlers, mutations, and derived UI data at the lowest component that uses them. If no such component exists, extract a purpose-built component that owns that logic.
- Avoid prop drilling. One pass-through layer is acceptable; two or more forwarding-only layers means ownership is in the wrong place.
- For row-level actions, the row or a purpose-built row container should own the action; list/layout components should pass data and stable IDs, not callbacks they do not use.
- Keep callbacks in a parent only when the parent genuinely coordinates the workflow, such as form submission, shared selection state, cross-row batch behavior, or navigation after a child action.
- For local UI state shared across siblings, distant children, or feature-local surfaces, use a colocated Jotai `atom`. Keep atoms feature-scoped and UI-owned; do not use them for server/cache state that belongs in query or API data flow.
- Prefer uncontrolled components when DOM-owned state is enough. Expose style customization through CSS variables before adding controlled props only for visual changes.

## Component Boundaries

- Separate first-render surfaces from secondary interactive surfaces. For dialogs, dropdowns, popovers, and similar branches, extract a small local component that owns the trigger, open state, and overlay/menu content when that branch obscures the parent flow.
- Do not further split dialog bodies, menu bodies, or forms unless they have their own state, reuse, complexity, or semantic boundary.
- Avoid shallow wrappers and prop renaming. Call the original function directly unless the wrapper adds validation, orchestration, error handling, state ownership, or a real semantic boundary.

## Navigation

- Prefer `Link` for normal navigation. Use router APIs only for command-flow side effects such as mutation success, guarded redirects, or form submission.

## Effects

- Treat `useEffect` as a last resort. First try deriving values during render, moving event-driven work into handlers, or using existing hooks/APIs for persistence, subscriptions, media queries, timers, and DOM sync.
- Do not use `useEffect` directly in components. If unavoidable, encapsulate it in a purpose-built hook so the component consumes a declarative API.

## Performance

- Avoid `memo`, `useMemo`, and `useCallback` unless there is a clear performance reason.
