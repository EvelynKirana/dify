---
name: tkdodo-react-query
description: TanStack Query / React Query implementation and review guidance distilled from TkDodo's 32-part Practical React Query series. Use when working on query keys, queryOptions factories, queryFn context, selectors, data transformations, status checks, loading/error UX, mutations, invalidation, optimistic updates, infinite queries, forms, React Router loaders/actions, cache seeding, WebSockets, offline behavior, testing, TypeScript inference, or deciding whether React Query is the right abstraction.
---

# TkDodo React Query

## Intent

Use this skill to apply TkDodo's React Query guidance without loading the full blog series into context.

For Dify frontend work, combine this skill with `frontend-query-mutation`: let `frontend-query-mutation` govern local oRPC, contract, service-layer, and invalidation conventions; use this skill for general TanStack Query design judgment.

## Workflow

1. Identify the React Query concern.
   - Read `references/practice-guide.md` for implementation and review rules.
   - Read `references/series-index.md` when you need the original article mapping, source links, or deeper topic selection.
2. Preserve TypeScript inference.
   - Prefer `queryOptions()` and colocated query factories over wrapper types that erase inference.
   - Avoid manually passing `useQuery` generics unless inference cannot express the intended result.
3. Treat query keys as dependencies.
   - Include every queryFn input in the key.
   - Use stable array or object keys that support broad and targeted invalidation.
4. Choose the least surprising cache update strategy.
   - Prefer invalidation after mutations.
   - Use direct cache writes when the mutation response is the complete replacement for the cached entity.
   - Use optimistic updates only when the UX benefit justifies duplicating server logic.
5. Review UX states deliberately.
   - Keep previously available data visible during background refetches where possible.
   - Do not replace good data with a full-page error for a background failure unless the product explicitly wants that.
6. Cite original sources when documenting rationale.
   - Do not copy full article text into code comments or docs.
   - Link to the relevant article from `references/series-index.md` for non-obvious decisions.

## References

- `references/practice-guide.md`: concise applied rules for implementation and code review.
- `references/series-index.md`: all 32 series entries, source URLs, and topic map.
