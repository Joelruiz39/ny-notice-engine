# Contributing

Thank you for helping. This code produces documents people may serve on a tenant or file in court, so correctness matters more than speed.

## Ground rules

1. **Every rule change needs a test.** Add a case to `test/` that fails before your change and passes after. For anything date-related, run `npm run test:ny` as well.
2. **Cite the source.** For a change to a deadline, form field or exemption, link the statute section or the official court form in the pull request.
3. **Changes to legal logic are reviewed by the maintainer** and may be held until checked against the source or by an attorney. Small fixes (typos, tests, docs) merge faster.
4. **No secrets, ever.** Do not commit keys, tokens, `.env` files, or real personal data. Use fake names and addresses in tests.
5. **Keep it scoped.** This repo covers New York outside NYC. Other states are welcome as separate, clearly labeled modules.

## Workflow

1. Fork the repo and create a branch.
2. `npm install`, make your change, run `npm test` and `npm run typecheck`.
3. Open a pull request describing what changed and why, with your source.

By contributing, you agree your contribution is licensed under the MIT license.
