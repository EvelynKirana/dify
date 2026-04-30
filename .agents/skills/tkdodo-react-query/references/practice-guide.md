# TkDodo React Query Practice Guide

This is an applied, paraphrased digest of TkDodo's Practical React Query series. It is not a copy of the articles. Use `series-index.md` for source links.

## Table of Contents

- Mental model
- Query keys
- Query options and abstractions
- Data transformation and selectors
- Status, loading, and error UX
- TypeScript and type safety
- Mutations and invalidation
- Optimistic updates
- Forms
- Router loaders and cache seeding
- Infinite queries
- Real-time and offline behavior
- Testing
- Review checklist

## Mental Model

- Treat React Query as an async state manager and data synchronization tool, not a normalized client database.
- Keep server state and client state separate. Do not copy query data into local state unless you intentionally take a snapshot, such as initial form values.
- Tune `staleTime` before reaching for manual refetching. Most freshness surprises are stale/fresh decisions, not cache lifetime decisions.
- Rarely change `gcTime` unless memory pressure or cache retention behavior is the actual problem.
- Prefer declarative data dependencies over imperative refetch chains.

## Query Keys

- Put every queryFn input in the query key. If a value changes the request, it belongs in the key.
- Query keys should be arrays or structured objects that allow partial matching.
- Do not reuse one key shape for finite and infinite queries. Infinite queries store pages and page params; finite queries store a different shape.
- Colocate query keys and query options with the feature that owns the data access.
- Use factories when multiple call sites need the same key/options or when invalidation depends on consistent prefixes.

```ts
import { queryOptions } from '@tanstack/react-query'

type ProjectListInput = {
  workspaceId: string
  keyword?: string
}

export const projectQueries = {
  all: () => ['projects'] as const,
  lists: () => [...projectQueries.all(), 'list'] as const,
  list: (input: ProjectListInput) =>
    queryOptions({
      queryKey: [...projectQueries.lists(), input] as const,
      queryFn: ({ signal }) => fetchProjects(input, { signal }),
    }),
}
```

## Query Options and Abstractions

- Prefer `queryOptions()` for reusable options. It preserves the relationship between key, queryFn, and result type.
- Avoid broad wrapper hooks that accept most of `UseQueryOptions`; those abstractions often weaken inference and hide important behavior.
- If a custom hook is useful, make it narrow and domain-specific.
- Let call sites compose options that are truly local, such as `enabled`, `select`, or component-specific `staleTime`.
- In reusable libraries, accept options only after deciding which fields are safe to override. Avoid exposing overrides that can break cache identity or fetch behavior.

```ts
export const useProjectList = (input: ProjectListInput) => {
  return useQuery(projectQueries.list(input))
}

export const useProjectNames = (input: ProjectListInput) => {
  return useQuery({
    ...projectQueries.list(input),
    select: projects => projects.map(project => project.name),
  })
}
```

## Data Transformation and Selectors

- Prefer backend/API transformation when it is the real contract shape.
- Transform in the `queryFn` when every consumer should see the transformed data and devtools should show the transformed shape.
- Use `select` for observer-specific projections and fine-grained subscriptions.
- Keep `select` stable if it is expensive or if it is passed through abstractions. Extract named functions or memoize carefully.
- Structural sharing helps avoid re-renders when data is equal by structure. Do not defeat it with unnecessary deep cloning.

## Status, Loading, and Error UX

- Distinguish first load from background refetch. `isPending` or lack of data usually means no usable result yet; `isFetching` can also mean background refresh.
- Prefer rendering stale data with a subtle refresh indicator over replacing it with a spinner.
- Check for available data before showing a hard error when background refetches can fail.
- Use Error Boundaries for renderable query errors when a full fallback is appropriate.
- Use global cache callbacks for cross-cutting notifications. Avoid duplicate toast logic at every observer.
- Remember that callbacks tied to an observer may not run if the observer unmounts before the mutation settles.

## TypeScript and Type Safety

- Prefer inference from typed API functions. Type the fetcher response, not every `useQuery` generic.
- Avoid "lying" angle brackets: specifying a generic does not validate runtime data.
- Validate untrusted API responses in the queryFn when runtime shape matters, for example with a schema library.
- Use narrowing from query state instead of destructuring in ways that lose correlation between `status`, `data`, and `error`.
- With dependent queries, use `enabled` for runtime gating, but still make the queryFn type-safe for unavailable inputs.
- Use `queryOptions()` so helpers like `getQueryData` can infer associated data types from the key where supported.

## Mutations and Invalidation

- Mutations are imperative server side effects. Queries are declarative subscriptions to server state.
- Prefer invalidating related queries after successful mutations. It is simple and robust when the server owns final truth.
- Await invalidation if the UI must stay pending until the refetch completes; otherwise let it happen in the background.
- Use direct `setQueryData` when the mutation response is the authoritative new cached value.
- Use global `MutationCache` callbacks when automatic invalidation should apply across the app.
- Use `mutationKey` or `meta` to connect mutations to invalidation scopes.
- Prefer `mutate` for UI event handlers. Use `mutateAsync` only when Promise composition is genuinely needed.
- Pass mutation variables as a single object to keep room for growth.

```ts
const updateProject = useMutation({
  mutationKey: ['projects', 'update'],
  mutationFn: (input: UpdateProjectInput) => api.updateProject(input),
  onSuccess: (project) => {
    queryClient.setQueryData(projectQueries.detail(project.id).queryKey, project)
    return queryClient.invalidateQueries({ queryKey: projectQueries.lists() })
  },
})
```

## Optimistic Updates

- Use optimistic updates for interactions where latency would be visibly harmful.
- Cancel in-flight queries that might overwrite the optimistic value.
- Snapshot previous cache state and return it from `onMutate` for rollback.
- Scope invalidation so concurrent optimistic mutations do not repeatedly overwrite each other.
- Avoid optimistic updates when the client would need to reimplement complex server logic, permissions, filtering, ranking, or derived fields.

## Forms

- A form usually starts from server state but becomes client state once the user edits it.
- The simple pattern is to load query data, initialize the form, and avoid background updates with an appropriate `staleTime`.
- If collaborative or long-lived forms need background updates, derive displayed values from server data plus dirty client fields rather than copying the whole query result.
- Disable double submits through mutation pending state.
- After successful mutation, invalidate affected queries and reset form state deliberately.

## Router Loaders and Cache Seeding

- React Router loaders are good for fetching early; React Query is better as the cache and synchronization layer.
- In loaders, prefer `getQueryData(...) ?? fetchQuery(...)` or `ensureQueryData(...)` so navigation can reuse cached data.
- In actions, invalidate the same query scopes the mutation would invalidate.
- Use cache seeding from list data to detail data when it avoids waterfalls and the list item is sufficient as initial detail data.
- Prefer pull seeding (`initialData` from an existing cache entry) when the detail query can derive from an already cached list.
- Prefer push seeding (`setQueryData` while fetching a list) only when you are comfortable writing multiple cache entries up front.

## Infinite Queries

- Infinite queries are one query with pages, not many independent page queries.
- The key identifies the whole infinite list; page params are managed separately.
- Refetching may need to replay pages to preserve cursor correctness.
- Keep `getNextPageParam` and `initialPageParam` explicit.
- Do not manually write page data unless you preserve `{ pages, pageParams }` shape.

## Real-Time and Offline Behavior

- For WebSockets, use messages as invalidation or partial cache update signals. Keep React Query as the cache owner.
- Prefer invalidating entity/list scopes from events unless the event payload contains enough data for a safe direct update.
- With push-driven updates, consider longer `staleTime` because the socket becomes the freshness trigger.
- Understand network mode before building offline behavior: some queries should pause offline, while others can read from local persistence or service worker caches.

## Testing

- Use a fresh `QueryClient` per test to avoid cache leakage.
- Wrap tested hooks/components in `QueryClientProvider`.
- Turn retries off in tests unless retry behavior is under test.
- Mock network at the boundary. MSW-style request mocks usually age better than mocking React Query itself.
- Await query results through UI or hook state, not arbitrary timers.
- Silence expected network errors in test output only when assertions cover the error path.

## Review Checklist

- Does every request input appear in the query key?
- Are finite and infinite query keys distinct?
- Is data kept in query cache instead of copied into local state without reason?
- Are loading and background fetching states handled separately?
- Are background errors displayed without destroying useful stale data?
- Does the abstraction preserve inference and avoid broad `UseQueryOptions` plumbing?
- Is invalidation scoped clearly after mutations?
- Is optimistic logic simpler than the server logic it approximates?
- Are tests isolated with a fresh `QueryClient` and retries disabled?
