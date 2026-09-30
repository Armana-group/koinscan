# dApps section UX redesign

**Date:** 2026-09-19
**Status:** approved design, pending implementation plan
**Scope:** `src/app/fogata/**` on the `fogata` branch (Fogata v2 pools + KOIN/VHP DEX)
**Mockup:** https://claude.ai/artifact/KMnpAvCyF6B5yyrxKAmqyB (private; wallet-state switch on the pool page)

## 1. Why

The `fogata` branch adds a working dApps section (pools, pool page, DEX) but its UI
puts everything on screen at equal weight: hero copy on every page, six identical stat
tiles, forms shown greyed-out when they can't be used, owner controls visible to
everyone, and a DEX form that asks for a price before showing the market. Users will
arrive from fogata.io, which has a sound mental model but almost no design.

The redesign keeps Julian's data loading, contract calls and state handling as they
are and changes what is shown, in what order, and when.

## 2. Users and jobs

| User | Jobs, most frequent first |
|---|---|
| KOIN/VHP holder (primary) | check what I have staked and earned · deposit · withdraw · pick a pool · convert VHP back to KOIN |
| Pool operator (secondary) | check the pool is producing · edit parameters · manage reserved KOIN · register node key · create a pool |
| Curious explorer user | see what pools exist and how they perform, without a wallet |

Traders are not a separate audience: the DEX exists so stakers can get KOIN back
out of VHP, and the design treats it that way.

## 3. Design principles

1. **One thing per screen.** Each screen has one question it answers and one primary
   action. Everything else is a tap away.
2. **Progressive disclosure is the structure.** First fold → "About" list → sheet →
   contract detail. Nothing is disabled or greyed out; if you can't do it, it isn't
   shown.
3. **Say a thing where it applies, once.** The reburn fact appears in the Deposit
   sheet on the KOIN tab, not on the page and not in a tooltip. No eyebrow labels,
   no icon-per-stat, no tooltips-on-everything.
4. **Data is the visual material.** One large number, quiet labels, hairlines instead
   of cards. Semantic colour (green/amber/red) only for health; one accent for
   interaction.
5. **It is Koinscan.** Poppins, the explorer's tokens and components, cross-links to
   `/address`, `/contracts`, `/blocks`. `/fogata` is a section of the explorer, not an
   embedded app.
6. **Copy says what will happen.** Buttons carry the outcome and the amount
   ("Deposit 100 KOIN", "Withdraw 50 VHP"). No contract vocabulary
   (tiers, snapshot, virtual VHP) on a first screen.

## 3a. Functional invariant

This is a UI change only. Every contract read and write on the `fogata` branch is kept
exactly as it is — same methods, same arguments, same preconditions, same order of
operations, same wallet/signer handling. The redesign changes what is rendered, where,
and when; it does not add, remove or combine transactions.

Concretely, the set of user-triggerable actions after the redesign is the same as
before it:

| Action | Contract call (unchanged) |
|---|---|
| Deposit KOIN/VHP | `stake` |
| Withdraw KOIN/VHP | `unstake` |
| Change reward preference | `set_collect_koin_preferences` |
| Edit pool parameters | `set_pool_params` |
| Add / remove reserved KOIN | existing approve + add/remove flow |
| Register node public key | existing flow |
| Remove pool from list | existing delete flow |
| Create pool | existing batched deployment flow |
| Create DEX order | existing create-order flow |
| Fill a specific DEX order | existing fill-order flow |
| Cancel own DEX order | existing cancel flow |

Derived display values (APY, health dot, "your stake" as one number) are computed
from data the pages already fetch. Read-only helpers that already exist (the network
APY calculation) may be moved to `src/lib/` and reused by another page; no new
contract *writes* are introduced anywhere. The only edits inside existing `handle*`
functions are one-line calls that close the sheet/dialog on success.

## 4. Information architecture

```
/fogata                     Pools list, titled "Fogata"  (no landing page)
/fogata/[poolId]            Pool page   (+ Deposit / Withdraw / Reward sheets)
/fogata/[poolId]/manage     Owner screen (params, reserved KOIN, node key, danger zone) — Phase B
/fogata/new                 Create-a-pool wizard (existing dialog, moved to a route) — Phase B
/fogata/trade               Trade
```

The section is named **Fogata** in the nav (decided 2026-09-19: Koinscan is Fogata v2's
home, so "dApps" promised a directory it isn't). Both top-level pages carry a collapsed
"How it works" disclosure under the title. Trade is the last row of the Fogata list —
same row language as the pools — rather than a tab; a switch that navigates between two
pages of different shape jumped around, so it was dropped (2026-09-19).

- Section routes are `/fogata`, `/fogata/[poolId]`, `/fogata/trade`; every former `/dapps/*` path redirects to its new location.
- Trade is reachable from the Trade row at the end of the Fogata list, from the pool
  page sub-line, and from the Deposit sheet — not from a landing grid or a tab.

## 5. Screens

### 5.1 Pools — `/fogata`

**Question:** which pool?

- Title: "Fogata". Under it the collapsed "How it works"
  disclosure (three sentences: pools run nodes for stakers and pay rewards each period;
  staked KOIN becomes VHP, rewards arrive as KOIN, Trade turns VHP back into KOIN; v2 lives
  on Koinscan, v1 stays at fogata.io). No paragraph outside the disclosure.
- List of rows, hairline-separated, ordered by APY desc then name. A row is:
  `logo · name · health dot · APY · ›`. Whole row is the link.
  - APY = `networkApy × (1 − beneficiaryFee)` as today. Shown to one decimal.
  - Health dot: green = produced a block within 2× expected time; amber = producing
    but late (>2×), or effectiveness < 50%; red = no block in 24 h. Dot only; the
    word appears on the pool page. **Phase B:** the list page does not fetch block
    history per pool today; the dot ships on the pool page in Phase A and on the
    list in Phase B once `usePoolList` loads it.
  - A pool that is not producing shows "paused" in place of the number.
  - Optional small `v1`/`v2` tag, hidden while only one version is listed.
- After the pool rows, one more row in the same style: brand-tinted ⇅ mark ·
  **Trade VHP ↔ KOIN** · "Sell VHP for KOIN, or buy VHP" · › → `/fogata/trade`. It is
  always present, even while pools load or when none are listed.
- Footer, small muted text: "Estimated yearly yield after the pool's fee. Run a
  node? Start a pool" — the link opens the create-pool dialog (`/fogata/new` in Phase B).
- Empty (0 pools): "No pools are listed yet." + the same footer.
- Error: inline line "Couldn't load pools. Retry" — no red box.
- Loading: three skeleton rows.

### 5.2 Pool page — `/fogata/[poolId]`

**Question:** what's mine here, and what can I do?

Header: back link "‹ Mining pools", logo, name with health dot, sub-line
`Producing · 24.5% yield` (or `Paused · last block 3 d ago`). Owners get ` · Manage`
appended as a link. Nobody else sees it.

Hero (first fold), by wallet state:

| State | Label | Number | Sub-line | Actions |
|---|---|---|---|---|
| Disconnected | Estimated yearly yield | `24.5 %` | — | **Connect wallet** |
| Connected, no stake | Estimated yearly yield | `24.5 %` | "You have nothing staked here." | **Deposit** |
| Connected, staked | Your stake | `1,250 VHP` | `+8.9 KOIN earned last period · next payout in 2 days · rewards kept as VHP · change` | **Deposit** · Withdraw (link) |
| Owner | as connected | as connected | as connected | as connected (Manage is in the header) |

- "Your stake" is `get_stake` VHP plus KOIN not yet reburned, shown as one VHP number;
  the KOIN component appears in the Withdraw sheet.
- "change" opens the Reward settings sheet (5.5).

"About this pool" (below the fold): the description (truncated at two lines with
"more"), then a key/value list with hairlines:

```
Effectiveness     ● 82%
Block time        11m 33s          (expected 9m 29s on hover / small text)
Staked in pool    35.7K VHP
Fee               5.5%             → recipients in a small line if > 1
Payout            Every 4 days
Address           1GGxRhLN…V2xtvk  → /address/…
Contract          Fogata Pool v2   → /contracts/…
```

Liquid KOIN, mana, last block, next snapshot, reserved KOIN and reburn period move
to the Manage screen; last block also links from the Address page. They are not on
the pool page.

Error: if pool params fail to load, the header shows the address as the name and one
line "Couldn't load this pool. Retry". Transaction errors surface as toasts, as today.

### 5.3 Deposit sheet

Opened from **Deposit**. Sheet/dialog, 380 px.

- Title "Deposit to {name}".
- Segmented KOIN / VHP. Default: whichever the wallet has more of.
- One large amount field with unit and **Max**; under it, `Wallet 312.40 KOIN` left,
  `≈ 24.5% yearly` right.
- KOIN tab only, one sentence: "KOIN becomes VHP over the next {reburn period}. Rewards
  are paid in KOIN; to sell VHP itself, use Trade." — "Trade" links to `/fogata/trade`.
- Button: "Deposit {amount} {unit}". Disabled only while amount is empty/invalid/over
  balance, with the reason under the field.
- Calls `stake` as today. On success: close, toast "Deposited 100 KOIN", hero refreshes.

### 5.4 Withdraw sheet

Same layout as Deposit. Shows both balances in the pool (VHP, and KOIN not yet
reburned) as the Max hints. Button "Withdraw {amount} {unit}". Calls `unstake`.

### 5.5 Reward settings sheet

Opened from "change" in the hero sub-line. Two options as a segmented control:

- **Keep as VHP** (re-stake everything)
- **Take KOIN** — with a percentage field ("Take 50% as KOIN, keep the rest") and,
  behind a "more options" disclosure, the "keep at least N VHP" variant
  (`all_after_virtual`).

Button "Save". Calls `set_collect_koin_preferences`. The current setting is the
default selection.

### 5.6 Manage — `/fogata/[poolId]/manage` (owner only)

Non-owners hitting the route get the pool page. Title "Manage {name}", back link to the
pool. Sections down the page, each a plain form with a Save button:

1. **Pool** — name, image URL, description, reburn period (days), fee recipients
   (list with address + %). Calls `set_pool_params`.
2. **Reserved KOIN** — current amount, Add / Remove with an amount field. Existing
   approve + add/remove flow.
3. **Node** — public key field, "Register". Existing flow.
4. **Status** — liquid KOIN, mana, last block, next snapshot, reserved KOIN; read-only
   key/value list.
5. **Danger zone** — collapsed `<details>`: "Remove from Fogata list — stakers keep
   their funds and can still withdraw." Button "Remove from list", confirm dialog.
   Existing delete flow.

### 5.7 Create a pool — `/fogata/new`

The existing creation dialog's fields, as a page with the same sections as Manage §1–3
plus the reserved KOIN amount, and one primary button "Create pool". Requires a
connected wallet; disconnected users see the Connect prompt instead of the form.
Logic unchanged (bytecode fetch, batched ops).

### 5.8 Trade — `/fogata/trade`

**Question:** how much KOIN do I get for this VHP (or vice versa)?

- Back link "‹ Fogata", title "Trade", then a collapsed "How it works"
  (VHP doesn't turn back into KOIN by itself; post an order, it fills when a trader
  accepts; sell straight from a pool if it allows it). Then segmented **Sell VHP / Buy VHP**.
- Two amount fields: "You sell" (editable, Max, wallet balance under it) and "You get"
  (editable). Under them: the implied price `0.96 KOIN per VHP`. Same inputs as the
  existing create-order form, re-laid-out.
- Button **"Place order"**, sub-line "Waits for a taker. Cancel any time." Calls the
  existing create-order flow. Nothing is filled automatically.
- If an open order on the other side would satisfy the entered amounts at an equal or
  better price, one line appears above the button: "An open order matches —
  Sell 420 VHP at 0.96 ›". Tapping it opens the existing fill dialog for that order.
  This is a shortcut to the existing fill flow, not a new transaction.
- "Open orders · N ›" collapsed `<details>` under the form: the book for the current
  side, one line per order (`Sell 1,000 VHP · 0.970`), your own orders first and
  marked, with "cancel" (existing cancel flow) and "fill" (existing fill dialog) per
  row. Expands to the full list; no tabs.
- "From a mining pool" (selling staked VHP directly): appears as a single line under
  the sell field — "Sell from a pool instead" — only when the wallet has stake in a
  pool that supports DEX withdrawals. Opens the existing pool select.
- Tier limits: validated as today; on overflow the field hint shows the maximum for
  that side. The word "tier" is not used in copy.
- Disconnected: the form renders with balances hidden and the button reads
  **"Connect wallet"**.
- Empty book: the form still works; the collapsed line reads "No open orders".
- Error: "Couldn't load orders. Retry" inline under the form.

## 6. Visual system

- **Type:** Poppins (existing). Sizes: page title 24, hero number 44 (36 on phones),
  body 14, secondary 13, small 12. Tabular numerals on all numbers.
- **Colour:** existing tokens plus two new ones in `globals.css`, exposed to
  Tailwind as `brand` / `brand-foreground` (shadcn already uses `accent` for hover
  surfaces, so the interactive purple gets its own name):
  - light `--brand: 252 76% 54%` (#522fe3), `--brand-foreground: 0 0% 100%`
  - dark `--brand: 250 81% 75%` (#9d8bf3), `--brand-foreground: 249 33% 8%`
  Measured contrast ≥ 6.1:1 for links on both grounds and for button labels in both
  themes. Dark-mode buttons use dark text on light purple, never white.
  Health: green/amber/red from the existing chart/destructive tokens, used only as
  dots and inline words.
- **Surfaces:** hairlines (`--border`) for lists; cards only for sheets. No stat
  tiles, no icon-per-row.
- **Beta:** the navbar `Beta` badge from `master` is the only beta marker. `BetaTag`
  is removed from H1s and deleted.
- **Layout:** content column max 640 px centred (440 px for Trade). Desktop-first,
  responsive to 360 px.

## 7. Components (phase B)

New, under `src/components/fogata/` (where `SectionNav` already lives):

| Component | Used by |
|---|---|
| `PoolRow` | Pools list (pool rows and the Trade row) |
| `PoolHeader` | Pool page, Manage |
| `PositionHero` | Pool page (all wallet states) |
| `KeyValueList` | About this pool, Manage status |
| `AmountField` | Deposit, Withdraw, Trade, Manage |
| `ActionSheet` | Deposit, Withdraw, Reward settings |
| `HealthDot` | Pools list, headers, key/value rows |
| `OrderList` | Trade (collapsed book) |

Hooks extracted from the pages, unchanged in behaviour: `usePoolList`, `usePool`,
`usePosition`, `usePoolPerformance`, `useOrderBook`.

## 8. Phasing

**Prerequisite:** merge `master` into `fogata` (conflicts in `Navbar.tsx`,
`Footer.tsx`, `contracts/[contractId]/page.tsx`; keep master's beta footer/badge and
latest-block fallback).

**Phase A — reorder and remove, on Julian's pages.** JSX/Tailwind only; no changes
to hooks, handlers, ABIs or wallet context.
- Pools: remove hero, landing grid, image cards, "Create a mining pool" CTA block;
  rows as §5.1; footer link.
- Pool page: hero as §5.2; About list; the existing Configure content renders
  below About only when the owner taps "Manage" (a route comes in Phase B); remove
  stat tiles; Deposit/Withdraw/Reward settings as dialogs wrapping the existing
  form fields and handlers.
- Trade: form first; book collapsed with the existing fill/cancel per row; remove
  tier copy.
- `BetaTag` removed; CSP `img-src` back to an allowlist; `.vercel/` gitignored.
- Verify: `yarn lint` (changed files), `yarn build`, screenshots of each screen in
  the three wallet states, light and dark.

**Phase B — components and routes.** Extract §7 components and hooks from A's result;
add `/manage` and `/new` routes; Reward settings sheet; the matching-order shortcut line.
One PR per component group so Julian can keep pushing to `fogata` between them.

## 9. Open questions

1. **v1 pools in the list?** Julian's call. The row already has a version tag; adding
   v1 rows is a data change (`fogata1ListPools` ABI is on the branch).
2. **One-tap fill (future, functional)** — a single button that fills the best open
   order(s) and places the remainder as a new order would be a functional change and
   is deliberately excluded. Revisit as its own spec if wanted.
3. **Health thresholds** (2× expected time, 50% effectiveness, 24 h) are proposals;
   tune against real pools.
4. **Fogata logo** — need the real asset for the JGA#3 row and any Fogata reference;
   the wikimedia placeholder and its CSP exception go away regardless.

## 10. Out of scope

- Reworking the explorer's global nav or theme beyond the two accent tokens.
- Any change to contract calls, arguments, transaction composition, or read paths
  (see §3a). Changes to contracts, ABIs, koilib/kondor-js versions, or the pool bytecode.
- Mobile-specific layouts beyond responsive behaviour.
- A wallet-centric "all my positions" dashboard (revisit once there are several pools).
