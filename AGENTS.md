# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js App Router frontend for Koinscan. Application routes live in `src/app`, including dynamic pages such as `src/app/address/[address]`, `src/app/tx/[txid]`, and `src/app/contracts/[contractId]`. Shared React components are in `src/components`; shadcn-style primitives are in `src/components/ui`; component images are in `src/components/images`. Blockchain integration code is grouped in `src/koinos`, while helpers are in `src/lib`, hooks in `src/hooks`, React context in `src/contexts`, and beta access configuration in `src/config`. Static assets and PWA metadata live in `public`. One-off investigation utilities belong in `scripts`.

## Build, Test, and Development Commands

- `yarn install`: install dependencies using the locked Yarn 1 toolchain.
- `yarn dev`: start the local Next.js development server.
- `yarn build`: create a production build and run framework checks.
- `yarn start`: serve the built production app.
- `yarn lint`: run ESLint across the repository.
- `npx tsx scripts/compare-tx-sources.ts [address]`: compare Koinos transaction data sources for an address.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep route files named `page.tsx` and colocate route-specific logic inside the matching `src/app` segment. Use PascalCase for components (`WalletBalances.tsx`), camelCase for hooks and utilities (`useLatestBlock.ts`, `resolveNickname`), and existing lowercase dash-separated names for CSS modules. Prefer the `@/` path alias for imports from `src`. Styling is primarily Tailwind CSS; use `cn` from `src/lib/utils.ts` for conditional classes. Run `yarn lint` before submitting changes.

## Testing Guidelines

No automated test runner is currently configured in `package.json`. For now, validate changes with `yarn lint`, `yarn build`, and focused manual checks in `yarn dev`. When adding tests, colocate them near the code under test with `.test.ts` or `.test.tsx` names and add a matching package script so contributors can run them consistently.

## Commit & Pull Request Guidelines

Recent history uses short, imperative commit subjects such as `Improve history (#48)`, `Fix data accuracy (#47)`, and occasional scoped lowercase messages like `fix: minor fixes`. Keep subjects concise and describe the user-visible change. Pull requests should include a brief summary, verification steps, linked issues when applicable, and screenshots or screen recordings for UI changes. Mention any RPC, API, or wallet behavior that reviewers should manually verify.

## Security & Configuration Tips

Do not commit private keys, wallet secrets, or local RPC credentials. Treat `src/config/whitelist.json` and beta-access paths as user access controls and review them carefully. Prefer configurable endpoints for new network integrations, and document any required environment variables in the PR.
