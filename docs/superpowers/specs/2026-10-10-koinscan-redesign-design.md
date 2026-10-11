# KoinScan redesign: light chrome and page rebuild

Date: 2026-10-10. Branch: `redesign`.

## Goal

Bring the approved mockups (home hero, block, transaction, address, lists, Fogata) into the Next.js app. Same stack, same deploy, same data layer. Light theme only. One shared chrome on every page.

## Decisions carried from the mockup sessions

- Shared chrome: logo left, centred Search pill, hamburger right. The menu is a white card that grows from the top-right corner while the page blurs and steps back. Cmd/Ctrl+K opens a centred search card with the same veil. Esc or the veil closes everything.
- Accent colour is picked once per session from the three logo colours and kept in `sessionStorage`. Gold is reserved for value in and yield.
- Zen over clever: one number, one sentence, one action, hairline rows, one Advanced disclosure. No white cards for list items.
- Dark mode is dropped. `next-themes`, the theme toggle and the `.dark` tokens go away.
- All pages switch to the new chrome at once. Old navigation, search provider and footer are deleted in the same change. Footer content (beta note, version, changelog link) moves into the menu card.

## Structure

- `src/app/layout.tsx`: accent script, `WalletProvider`, `ChromeProvider`, glow, veil, search card, menu card, header, `main`, toaster.
- `src/components/chrome/`: `ChromeProvider`, `Header`, `Logo`, `MenuCard`, `SearchCard`, `Glow`, `Sheet` (Radix dialog in the card language, scales the page like the menu).
- `src/components/ks/`: page primitives transcribed from the mockup CSS: `Page`, `Crumb`, `Title`, `Lede`, `Status`, `Section`, `Row`, `Avatar`, `TokenMark`, `GlyphMark`, `Advanced`, `KV`, `Filters`, `Toggle`, `More`, `CopyButton`, `PillButton`, `Skeleton`.
- `src/lib/search.ts`: search classification (pure) and the navigation hook.
- `src/lib/names.ts` + `NamesProvider`: known names for producers, system contracts and Fogata pools.
- `src/lib/format.ts`: short addresses, numbers, relative time, initials.
- `src/lib/tx-story.ts`: pure builder that turns a transaction payload into headline, lede, parties and status.
- `src/lib/history-rows.ts`: pure grouping of address history into rows and block-production runs.
- Data layer (`src/lib/api.ts`, `src/lib/fogata.ts`, `src/koinos/*`, API routes, `WalletContext`) is unchanged.

## Pages

Transaction, block, address, blocks, tokens, contracts, network, home and Fogata (landing, pool, trade) follow the mockups. Contract explorer, producer page, changelog, help, beta access and admin keep their logic and are restyled into the same language.

## Verification

`yarn lint`, `yarn test`, `yarn build`, the regression scripts (updated where the design changed on purpose), and headless screenshots of every page.
