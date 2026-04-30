# Practical React Query Series Index

Fetched and summarized on 2026-04-30 from TkDodo's blog index: <https://tkdodo.eu/blog/practical-react-query>. The source index listed 32 parts. This file is a paraphrased lookup guide with links; it intentionally does not mirror the copyrighted article bodies.

## Table of Contents

- Article lookup
- Topic map
- Source handling

## Article Lookup

1. [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
   - Use for the core mental model: server state vs. client state, defaults, `staleTime` vs. `gcTime`, query keys as dependencies, `enabled`, and custom hooks.
   - Prefer React Query cache for server state, not as a local state store.

2. [React Query Data Transformations](https://tkdodo.eu/blog/react-query-data-transformations)
   - Use when deciding where to reshape API data: backend, `queryFn`, render, or `select`.
   - Pick the transformation layer based on whether every consumer or only one observer needs the shape.

3. [React Query Render Optimizations](https://tkdodo.eu/blog/react-query-render-optimizations)
   - Use for re-render concerns, tracked properties, `notifyOnChangeProps`, and structural sharing.
   - Optimize after identifying a real render problem; keep structural sharing intact.

4. [Status Checks in React Query](https://tkdodo.eu/blog/status-checks-in-react-query)
   - Use when reviewing `isPending`, `isLoading`, `isError`, `isFetching`, and background error UX.
   - Prefer showing existing data over replacing the screen with an error for a background failure.

5. [Testing React Query](https://tkdodo.eu/blog/testing-react-query)
   - Use for hook/component testing setup with `QueryClientProvider`, isolated clients, disabled retries, and awaited assertions.
   - Mock network calls rather than mocking React Query internals.

6. [React Query and TypeScript](https://tkdodo.eu/blog/react-query-and-type-script)
   - Use for generics, inference, error typing, dependent queries, optimistic updates, infinite query typing, and default query functions.
   - Prefer typed fetchers and inference over manual `useQuery` generic arguments.

7. [Using WebSockets with React Query](https://tkdodo.eu/blog/using-web-sockets-with-react-query)
   - Use when real-time messages should invalidate or update cached data.
   - Consider longer `staleTime` when server push becomes the freshness source.

8. [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
   - Use for key structure, colocated key factories, array keys, cache identity, and invalidation scopes.
   - Never share keys between finite and infinite queries.

9. [Leveraging the Query Function Context](https://tkdodo.eu/blog/leveraging-the-query-function-context)
   - Use when query keys and query functions drift apart.
   - Read request variables from `QueryFunctionContext` where it improves type safety and keeps dependencies explicit.

10. [Placeholder and Initial Data in React Query](https://tkdodo.eu/blog/placeholder-and-initial-data-in-react-query)
    - Use when avoiding loading flashes with `placeholderData` or `initialData`.
    - Remember that initial data affects cache-level state, while placeholder data is observer-level.

11. [React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)
    - Use for explaining React Query as an async state manager and stale-while-revalidate tool.
    - Tune `staleTime` for the product's freshness expectations instead of forcing manual sync.

12. [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
    - Use for Error Boundaries, global query cache callbacks, toast notifications, and error propagation.
    - Prefer global callbacks for cross-cutting notifications to avoid duplicate observer side effects.

13. [Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
    - Use for mutation lifecycle, invalidation, direct updates, optimistic updates, `mutate` vs. `mutateAsync`, callback behavior, and mutation variables.
    - Prefer invalidation unless the mutation response is sufficient for a precise cache write.

14. [Offline React Query](https://tkdodo.eu/blog/offline-react-query)
    - Use for network mode decisions and offline semantics.
    - Decide whether a query requires the network, can run always, or should behave offline-first.

15. [React Query and Forms](https://tkdodo.eu/blog/react-query-and-forms)
    - Use when server state initializes editable form state.
    - Choose between snapshotting initial data and keeping background updates with derived dirty fields.

16. [React Query FAQs](https://tkdodo.eu/blog/react-query-fa-qs)
    - Use for common debugging questions: refetch parameters, loading states, updates not showing, unstable clients, fetch API errors, and queryFns not running.
    - Most cache-update bugs come from mismatched query keys or an unstable `QueryClient`.

17. [React Query meets React Router](https://tkdodo.eu/blog/react-query-meets-react-router)
    - Use when integrating loaders/actions with React Query.
    - Fetch early in loaders, cache through React Query, and invalidate in actions.

18. [Seeding the Query Cache](https://tkdodo.eu/blog/seeding-the-query-cache)
    - Use for avoiding fetch waterfalls, especially list-to-detail transitions and Suspense.
    - Seed detail queries from list data only when the list item is good enough as initial detail data.

19. [Inside React Query](https://tkdodo.eu/blog/inside-react-query)
    - Use for internal architecture: `QueryClient`, `QueryCache`, `Query`, `QueryObserver`, active and inactive queries.
    - Helpful when debugging observer behavior or cache lifecycle.

20. [Type-safe React Query](https://tkdodo.eu/blog/type-safe-react-query)
    - Use for the difference between having TypeScript annotations and validating real API data.
    - Add runtime validation in the queryFn when API trust is not enough.

21. [You Might Not Need React Query](https://tkdodo.eu/blog/you-might-not-need-react-query)
    - Use when deciding whether React Query is appropriate.
    - React Query is most useful for client-owned data synchronization concerns; route/framework data APIs can cover simpler cases.

22. [Thinking in React Query](https://tkdodo.eu/blog/thinking-in-react-query)
    - Use for a high-level mindset talk: declarative dependencies, freshness, cache ownership, and server-state thinking.
    - Useful when code is written as imperative fetch orchestration.

23. [React Query and React Context](https://tkdodo.eu/blog/react-query-and-react-context)
    - Use when Context is used to pass implicit query parameters or synchronize query data.
    - Prefer explicit dependencies; beware request waterfalls and hidden coupling.

24. [Why You Want React Query](https://tkdodo.eu/blog/why-you-want-react-query)
    - Use to justify a data-fetching library over hand-written effects.
    - Covers race conditions, loading/empty state handling, StrictMode double effects, cancellation, and error handling.

25. [The Query Options API](https://tkdodo.eu/blog/the-query-options-api)
    - Use for v5 `queryOptions`, type inference, data tags, and query factories.
    - Prefer options factories to preserve type links between keys, fetchers, and cached data.

26. [Automatic Query Invalidation after Mutations](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations)
    - Use for app-level invalidation with global mutation cache callbacks.
    - Scope automatic invalidation with `mutationKey`, `meta`, `staleTime`, and awaited vs. background invalidation choices.

27. [How Infinite Queries work](https://tkdodo.eu/blog/how-infinite-queries-work)
    - Use for infinite query internals, `QueryBehavior`, retry behavior, and page refetch architecture.
    - Preserve `{ pages, pageParams }` shape and cursor correctness.

28. [React Query API Design - Lessons Learned](https://tkdodo.eu/blog/react-query-api-design-lessons-learned)
    - Use for API design tradeoffs: overloads, object syntax, naming, DX, migration, and maintainability.
    - Useful when designing local abstractions over React Query.

29. [React Query - The Bad Parts](https://tkdodo.eu/blog/react-query-the-bad-parts)
    - Use for tradeoff analysis and cases where React Query can be too much.
    - Good review prompt for bundle cost, abstraction cost, mental-model complexity, and alternative framework data APIs.

30. [Concurrent Optimistic Updates in React Query](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
    - Use for race-resistant optimistic UI when multiple mutations affect the same cached entity or list.
    - Cancel conflicting queries and prevent over-invalidation windows.

31. [React Query Selectors, Supercharged](https://tkdodo.eu/blog/react-query-selectors-supercharged)
    - Use for `select`, fine-grained subscriptions, query hash behavior, memoization, and selector typing.
    - Stabilize expensive selectors and preserve result inference.

32. [Creating Query Abstractions](https://tkdodo.eu/blog/creating-query-abstractions)
    - Use for building reusable abstractions around inference-heavy APIs.
    - Prefer `queryOptions()` composition over passing broad `UseQueryOptions` through custom hooks.

## Topic Map

- Core mindset: 1, 11, 21, 22, 24, 29
- Keys and query function inputs: 1, 8, 9, 16, 25
- TypeScript and inference: 6, 20, 25, 31, 32
- Data shape and render performance: 2, 3, 31
- Loading, status, and errors: 4, 10, 12, 16
- Mutations and invalidation: 13, 26, 30
- Optimistic updates: 6, 13, 30
- Forms: 15
- Router integration and cache seeding: 17, 18, 23
- Infinite queries: 6, 27
- Real-time and offline: 7, 14
- Testing: 5
- Internals and API design: 19, 27, 28

## Source Handling

- Link to the original article when adding durable rationale to project docs or comments.
- Quote at most a short phrase if needed; otherwise paraphrase.
- Re-check the source index if the user asks for the latest series contents.
