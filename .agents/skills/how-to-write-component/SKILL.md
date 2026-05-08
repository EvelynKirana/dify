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

- Keep local state, query state, handlers, mutations, and derived UI data at the lowest component that uses them. If no such component exists, extract a purpose-built component that owns that logic.
- Avoid prop drilling. One pass-through layer is acceptable; two or more forwarding-only layers means ownership is in the wrong place.
- For row-level actions, the row or a purpose-built row container should own the action; list/layout components should pass data and stable IDs, not callbacks they do not use.
- Keep callbacks in a parent only when the parent genuinely coordinates the workflow, such as form submission, shared selection state, cross-row batch behavior, or navigation after a child action.
- For local UI state shared across siblings, distant children, or feature-local surfaces, use a colocated Jotai `atom`. Keep atoms feature-scoped and UI-owned; do not use them for server/cache state that belongs in query or API data flow.
- Prefer uncontrolled components when DOM-owned state is enough. Expose style customization through CSS variables before adding controlled props only for visual changes.

## Query And Mutation Contracts

- Keep `web/contract/*` as the single source of truth for API shape.
- Define contracts with `base.route({...}).output(type<...>())`.
- Add `.input(type<...>())` only when the request has `params`, `query`, or `body`.
- Keep contract input shaped as `{ params, query?, body? }`.
- For no-input `GET` routes, omit `.input(...)`; do not use `.input(type<unknown>())`.
- Use `{paramName}` in route paths and match the same name in `params`.
- Register contracts in `web/contract/router.ts` by API prefix.
- Import contract modules directly from their domain files; do not add barrel files.
- Consume contract queries directly with `useQuery(consoleQuery.xxx.queryOptions(...))` or `useQuery(marketplaceQuery.xxx.queryOptions(...))`.
- Avoid wrapping `useQuery` and contract `queryOptions()` in pass-through hooks, such as `useAccessEnvironmentScope`.
- If three or more call sites share the same extra query options, extract a small `queryOptions` helper instead of a `use-*` hook.
- Keep feature hooks only when they orchestrate multiple operations, own workflow state, expose shared domain behavior, or normalize a feature-specific API.
- Treat `web/service/use-*` query and mutation wrappers as legacy migration targets.
- Do not create new thin `web/service/use-*` wrappers for oRPC contract calls.
- Inline existing wrappers when they only rename a single `queryOptions()` or `mutationOptions()` call.
- Avoid wrapper signatures such as `options?: Partial<UseQueryOptions>` because they degrade inference.
- Do not split `queryKey` and `queryFn` when oRPC `queryOptions()` already fits the use case.
- For missing required query input, pass `input: skipToken`.
- Use `enabled` only for extra business gating after the query input is already valid.
- Consume mutations with `useMutation(consoleQuery.xxx.mutationOptions(...))` or `useMutation(marketplaceQuery.xxx.mutationOptions(...))`.
- For heavily custom mutation flows, use oRPC clients as `mutationFn` instead of handwritten non-oRPC request logic.
- Put shared stale time, cache writes, and invalidation in `createTanstackQueryUtils(...experimental_defaults...)` when behavior belongs to a contract operation.
- Keep operation defaults in `web/service/client.ts` when they need sibling oRPC key builders.
- Keep multi-operation workflow orchestration in feature vertical hooks.
- Components may add UI feedback callbacks, but should not own shared cache invalidation decisions.
- Use `.key()` for namespace invalidation, refetch, and cancel patterns.
- Use `.queryKey(...)` for exact cache reads and writes.
- Use `.mutationKey(...)` for mutation defaults, mutation-status filtering, and devtools grouping.
- Invalidate with `queryClient.invalidateQueries(...)` in mutation `onSuccess`.
- Do not use deprecated `useInvalid` from `use-base.ts`.
- Prefer `mutate(...)` by default.
- Use `mutateAsync(...)` only when Promise semantics are required, such as sequential or parallel mutation flows.
- Wrap every `await mutateAsync(...)` in `try/catch`.

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
