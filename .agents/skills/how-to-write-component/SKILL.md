---
name: how-to-write-component
description: React/TypeScript component style guide. Use when writing, refactoring, or reviewing React components, especially around props typing, state boundaries, shared local state with Jotai atoms, API types, query/mutation contracts, navigation, memoization, wrappers, and empty-state handling.
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
- Name values by their domain role and backend API contract, and keep that name stable across the call chain, especially IDs such as `appInstanceId`. Normalize framework or route params at the boundary instead of passing aliased names through components.
- Keep fallback and invariant checks at the lowest component that already handles that state; callers should pass raw values through instead of duplicating checks.

## State, Queries, And Callbacks

- Keep local state, queries, mutations, handlers, and derived UI data at the lowest component that uses them. Extract a purpose-built owner component when the logic has no natural home.
- Avoid prop drilling. One pass-through layer is acceptable; repeated forwarding means ownership should move down or into shared UI state.
- Keep callbacks in a parent only when it coordinates workflow, such as form submission, shared selection, batch behavior, or navigation. Otherwise, let the child or row own its action.
- Use colocated, feature-scoped Jotai `atom`s for UI state shared across siblings or distant children. Keep server/cache state in query or API data flow.
- Prefer uncontrolled components for DOM-owned state. Use CSS variables for visual customization before adding controlled props.

## Query And Mutation Contracts

- Keep `web/contract/*` as the single source of truth for API shape; follow existing domain/router patterns and the `{ params, query?, body? }` input shape.
- Consume queries directly with `useQuery(consoleQuery.xxx.queryOptions(...))` or `useQuery(marketplaceQuery.xxx.queryOptions(...))`.
- Avoid pass-through hooks that only wrap `useQuery` and contract `queryOptions()`, such as `useAccessEnvironmentScope`.
- Do not create new thin `web/service/use-*` wrappers for oRPC contract calls; inline legacy wrappers when they only rename one `queryOptions()` or `mutationOptions()` call.
- Extract a small `queryOptions` helper only when repeated call-site options justify it; keep feature hooks for real orchestration, workflow state, or shared domain behavior.
- For missing required query input, use `input: skipToken`; use `enabled` only for extra business gating after the input is valid.
- Consume mutations directly with `useMutation(consoleQuery.xxx.mutationOptions(...))` or `useMutation(marketplaceQuery.xxx.mutationOptions(...))`; use oRPC clients as `mutationFn` only for custom flows.
- Put shared cache behavior in `createTanstackQueryUtils(...experimental_defaults...)`; components may add UI feedback callbacks, but should not own shared invalidation rules.
- Do not use deprecated `useInvalid` or `useReset`.
- Prefer `mutate(...)`; use `mutateAsync(...)` only when Promise semantics are required, and wrap awaited calls in `try/catch`.

## Component Boundaries

- Prefer using the first level below a page or tab to organize and lay out independent page sections. This layer is optional when the page has only one main section or extracting it would only add a shallow wrapper.
- Split deeper components by the data and state each layer actually needs. Each component should access only necessary data, and state should be pushed down to the lowest owner.
- Keep cohesive forms, menu bodies, and one-off helpers local unless they need their own state, reuse, or semantic boundary.
- Separate hidden secondary surfaces from the trigger's main flow. For dialogs, dropdowns, popovers, and similar branches, extract a small local component that owns the trigger, open state, and hidden content when that branch obscures the parent flow.
- Avoid shallow wrappers and prop renaming. Call the original function directly unless the wrapper adds validation, orchestration, error handling, state ownership, or a real semantic boundary.

## Navigation

- Prefer `Link` for normal navigation. Use router APIs only for command-flow side effects such as mutation success, guarded redirects, or form submission.

## Effects

- Treat `useEffect` as a last resort. First try deriving values during render, moving event-driven work into handlers, or using existing hooks/APIs for persistence, subscriptions, media queries, timers, and DOM sync.
- Do not use `useEffect` directly in components. If unavoidable, encapsulate it in a purpose-built hook so the component consumes a declarative API.

## Performance

- Avoid `memo`, `useMemo`, and `useCallback` unless there is a clear performance reason.
