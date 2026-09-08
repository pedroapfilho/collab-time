# Contributing

Follow the [README setup](README.md#quick-start) and [project conventions](docs/CONVENTIONS.md).

Use Node 24 or newer and pnpm 11.13.1. Keep changes focused on one problem. Add regression tests for behavior changes, and run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, and `pnpm test` before opening a pull request. Run relevant Playwright tests for user flows and `pnpm fallow:dead` when changing module exports.

Use TanStack Form with Zod, the shared Base UI components, oxlint, and oxfmt. Log application errors through `@repo/observability`. Do not commit credentials or generated clients.

In a pull request, explain the problem, resulting behavior, and verification. Include screenshots for visible changes. Keep public API errors consistent with the conventions and avoid unrelated refactors. For large changes, open an issue to discuss the approach first.

By contributing, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md) and license your contributions under the [MIT license](LICENSE).
