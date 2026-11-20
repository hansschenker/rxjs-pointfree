# Repository conventions

- Keep RxJS pinned to 7.8.2 unless an upgrade is explicitly requested.
- Prefer small pure functions, type aliases, and function-first/data-last APIs.
- Do not introduce JavaScript classes, enums, React, or a custom replacement for RxJS `pipe`.
- Keep business predicates and projections separate from stream policies.
- State source shape, completion, cancellation, scheduling, and sharing explicitly.
- Explain the behavior before the code, using intuition → specification → verification.
- Preserve attribution in README, CONTRIBUTORS, NOTICE, and commits.
- Verify meaningful semantic changes with `npm run check` and `npm run examples`.
- Do not send actual authentication requests while testing; use mocked or simulated effects.
