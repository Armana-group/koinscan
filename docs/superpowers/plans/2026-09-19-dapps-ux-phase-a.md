# dApps UX Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-lay-out the three dApps pages (pools list, pool page, trade) to the spec's "one thing per screen" design without changing any contract call, handler, or data loader.

**Architecture:** Each page keeps its existing state, `useEffect` loaders and `handle*` functions verbatim. Only the JSX returned by each page changes: hero copy and stat tiles go, a single hero + "About" list replaces them, forms become dialogs, owner controls hide behind a "Manage" toggle. Two pure helpers (network APY, health classification) move to `src/lib/fogata.ts` so both pages can use them and they can be unit-tested with `node --test`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 3 + shadcn/ui primitives in `src/components/ui`, koilib, Node 22 built-in test runner via `tsx` (already a devDependency — no new packages).

**Spec:** `docs/superpowers/specs/2026-09-19-dapps-ux-redesign-design.md`

## Global Constraints

- **Functional invariant (spec §3a):** no edits to any `handle*` function, `useEffect` loader, ABI, constant, or `WalletContext`, except one-line `setSheet(null)` calls in success paths as listed in Task 6. Reviewer checks each handler's diff is ≤1 line.
- **Branch:** all work on `dapps-ux` (off `fogata`). Never commit to `fogata` or `master`.
- **Commits:** short imperative subject; end the body with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Copy rules (spec §3, §5):** no hero paragraphs; no eyebrow labels; the word "tier" never appears in UI copy; buttons say the outcome with the amount ("Deposit 100 KOIN").
- **Beta marker:** only the navbar badge (`<Logo showBetaBadge />`). `BetaTag` is deleted in Task 9.
- **Colour:** interactive purple is Tailwind `brand` / `brand-foreground` (Task 1). Semantic green/amber/red only for the health dot. Dark-mode `bg-brand` buttons use `text-brand-foreground` (dark text), never white.
- **Layout:** content column `max-w-[640px] mx-auto` (`max-w-[440px]` on Trade); must render at 360 px wide.
- **Lint:** `npx eslint <changed files>` must report no *new* errors or warnings compared with the same command on `fogata` for that file. The 3 pre-existing errors on `src/app/contracts/[contractId]/page.tsx` are not ours.
- **Build:** `yarn build` must pass after every task that touches `src/`.
- **Dev server for manual checks:** the user runs one on port 7777 (`next dev -p 7777`). Do not start another on 3000/3100 — port 3000 belongs to a different project.
- **Screenshots:** the Chrome extension isn't connected; use the devtools helper at `/private/tmp/claude-501/-Users-ron-devstuff-projects-armana-koinscan/b646b469-0032-4eaa-945f-0facffdbe745/scratchpad/shoot2.py` (Python, takes `out_dir name=url ...`) if it still exists, otherwise ask the user to look.

---

## File structure

| File | Responsibility after Phase A |
|---|---|
| `src/app/globals.css` | + `--brand`, `--brand-foreground` tokens (light + dark) |
| `tailwind.config.js` | + `brand` colour |
| `src/lib/fogata.ts` (new) | `getNetworkApy`, `computePoolApy`, `poolHealth`, `formatPayoutPeriod`, `findMatchingOrder` — pure/read-only helpers shared by the dapps pages |
| `src/lib/fogata.test.ts` (new) | unit tests for the pure helpers |
| `package.json` | + `"test": "node --import tsx --test \"src/**/*.test.ts\""`, + `"dapps-ui:regression"` |
| `src/app/dapps/page.tsx` | **the pools list** (moved from `fogata/page.tsx`); create-pool dialog kept |
| `src/app/dapps/fogata/page.tsx` | `redirect("/dapps")` |
| `src/app/dapps/fogata/[poolId]/page.tsx` | pool page: header, hero, About list, dialogs, Manage section |
| `src/app/dapps/dex/page.tsx` | trade: form-first, collapsed book, existing fill dialog |
| `src/components/BetaTag.tsx` | deleted |
| `next.config.mjs` | CSP `img-src` allowlist restored; wikimedia `remotePatterns` entry removed |
| `scripts/regression-dapps-ui.mjs` (new) | fetch-and-assert checks against a running server, same pattern as `regression-beta-status.mjs` |

---

### Task 1: Brand colour tokens

**Files:**
- Modify: `src/app/globals.css` (inside `:root { … }` after line 60 `--logo-color-3`, and inside `.dark { … }` after line 105)
- Modify: `tailwind.config.js` (the `colors` map, next to `accent` at line 43)

**Interfaces:**
- Produces: Tailwind classes `bg-brand`, `text-brand`, `border-brand`, `text-brand-foreground`, `bg-brand/10`.

- [ ] **Step 1: Add the tokens**

In `src/app/globals.css`, after `--logo-color-3: 252 76% 54%;` in the `:root` block add:

```css
    --brand: 252 76% 54%;
    --brand-foreground: 0 0% 100%;
```

After `--logo-color-3: 252 76% 54%;` in the `.dark` block add:

```css
    --brand: 250 81% 75%;
    --brand-foreground: 249 33% 8%;
```

- [ ] **Step 2: Expose to Tailwind**

In `tailwind.config.js`, directly after the `accent: { … }` entry add:

```js
  			brand: {
  				DEFAULT: 'hsl(var(--brand))',
  				foreground: 'hsl(var(--brand-foreground))'
  			},
```

- [ ] **Step 3: Verify the class compiles**

Temporarily add `className="text-brand"` to any element, run `yarn build`, confirm `✓ Compiled successfully`, then remove the temporary class. (Tailwind only emits classes it sees; the real usages arrive in Tasks 4–8.)

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.js
git commit -m "Add brand colour tokens

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared Fogata helpers with tests

**Files:**
- Create: `src/lib/fogata.ts`
- Create: `src/lib/fogata.test.ts`
- Modify: `package.json` (`scripts`)
- Modify: `src/app/dapps/fogata/page.tsx:30-61` (delete `getNetworkApy` and `computePoolApy`, import them instead)

**Interfaces:**
- Produces:
  ```ts
  export async function getNetworkApy(provider: ProviderInterface): Promise<number>
  export function computePoolApy(networkApy: number, beneficiaries: { percentage: number }[]): number
  export type PoolHealth = "producing" | "late" | "paused"
  export function poolHealth(input: { lastBlockTime?: Date; expectedTimeToProduce?: number; effectiveness?: number }, now?: Date): PoolHealth
  export function formatPayoutPeriod(paymentPeriodMs?: string): string   // "Every 4 days" | "—"
  export function findMatchingOrder(side: "buy" | "sell", vhpAmount: string, koinAmount: string, orders: { vhp_amount: string; koin_amount: string; buy: boolean; owner: string; id: string }[], account: string | null): typeof orders[number] | null
  ```

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add:

```json
    "test": "node --import tsx --test \"src/**/*.test.ts\"",
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/fogata.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computePoolApy,
  findMatchingOrder,
  formatPayoutPeriod,
  poolHealth,
} from "./fogata";

describe("computePoolApy", () => {
  it("returns the network APY when there are no beneficiaries", () => {
    assert.equal(computePoolApy(25.9, []), 25.9);
  });
  it("subtracts the beneficiary share (percentage is in thousandths of a percent)", () => {
    // 5500 = 5.5%
    assert.ok(Math.abs(computePoolApy(25.9, [{ percentage: 5500 }]) - 24.4755) < 1e-9);
  });
});

describe("poolHealth", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const tenMin = 10 * 60 * 1000;
  it("is producing when the last block is within 2x the expected time", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - tenMin), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "producing"
    );
  });
  it("is late when the last block is older than 2x the expected time", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - 3 * tenMin), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "late"
    );
  });
  it("is late when effectiveness is under 50 even if a block is recent", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - tenMin), expectedTimeToProduce: tenMin, effectiveness: 40 }, now),
      "late"
    );
  });
  it("is paused when there is no block in 24 hours", () => {
    assert.equal(
      poolHealth({ lastBlockTime: new Date(now.getTime() - 25 * 60 * 60 * 1000), expectedTimeToProduce: tenMin, effectiveness: 80 }, now),
      "paused"
    );
  });
  it("is paused when there is no block at all", () => {
    assert.equal(poolHealth({}, now), "paused");
  });
});

describe("formatPayoutPeriod", () => {
  it("formats whole days", () => {
    assert.equal(formatPayoutPeriod(String(4 * 86400 * 1000)), "Every 4 days");
  });
  it("formats one day without a plural", () => {
    assert.equal(formatPayoutPeriod(String(86400 * 1000)), "Every day");
  });
  it("returns a dash when unknown", () => {
    assert.equal(formatPayoutPeriod(undefined), "—");
  });
});

describe("findMatchingOrder", () => {
  const orders = [
    { id: "1", buy: true, owner: "A", vhp_amount: "50000000000", koin_amount: "48000000000" }, // buys 500 VHP at 0.96
    { id: "2", buy: true, owner: "B", vhp_amount: "10000000000", koin_amount: "9000000000" },  // buys 100 VHP at 0.90
    { id: "3", buy: false, owner: "C", vhp_amount: "20000000000", koin_amount: "19400000000" }, // sells 200 VHP at 0.97
  ];
  it("finds the best buy order that covers a sell", () => {
    // selling 400 VHP asking 380 KOIN → 0.95; order 1 pays 0.96 and has 500 VHP
    assert.equal(findMatchingOrder("sell", "400", "380", orders, null)?.id, "1");
  });
  it("ignores orders that are too small", () => {
    // selling 600 VHP; nobody buys that much
    assert.equal(findMatchingOrder("sell", "600", "570", orders, null), null);
  });
  it("ignores orders with a worse price", () => {
    // asking 0.97 per VHP; best buyer pays 0.96
    assert.equal(findMatchingOrder("sell", "100", "97", orders, null), null);
  });
  it("finds a sell order that covers a buy", () => {
    // buying 100 VHP paying 98 KOIN → 0.98; order 3 sells at 0.97
    assert.equal(findMatchingOrder("buy", "100", "98", orders, null)?.id, "3");
  });
  it("never matches your own order", () => {
    assert.equal(findMatchingOrder("sell", "400", "380", orders, "A"), null);
  });
  it("returns null for empty or invalid amounts", () => {
    assert.equal(findMatchingOrder("sell", "", "380", orders, null), null);
    assert.equal(findMatchingOrder("sell", "abc", "380", orders, null), null);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `yarn test`
Expected: FAIL — `Cannot find module './fogata'`.

- [ ] **Step 4: Create the helper module**

Create `src/lib/fogata.ts`. `getNetworkApy` and `computePoolApy` are moved verbatim from `src/app/dapps/fogata/page.tsx` lines 30–61; the rest is new:

```ts
import { Contract, ProviderInterface, utils } from "koilib";

import tokenAbi from "@/koinos/abi";
import { abiPob } from "@/koinos/abis";
import {
  KOIN_CONTRACT_ID,
  POB_CONTRACT_ID,
  VHP_CONTRACT_ID,
} from "@/koinos/constants";

/**
 * APY = 2% * virtual supply / VHP producing
 * Same formula as src/app/network/page.tsx
 */
export async function getNetworkApy(provider: ProviderInterface): Promise<number> {
  const vhpContract = new Contract({ id: VHP_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultVhp } = await vhpContract.functions.totalSupply();
  const totalVhp = Number(resultVhp!.value) / 1e8;

  const koinContract = new Contract({ id: KOIN_CONTRACT_ID, provider, abi: tokenAbi });
  const { result: resultKoin } = await koinContract.functions.totalSupply();
  const totalKoin = Number(resultKoin!.value) / 1e8;

  const pobContract = new Contract({ id: POB_CONTRACT_ID, provider, abi: abiPob });
  const { result: resultPob } = await pobContract.functions.get_metadata();
  const difficulty = Number(
    "0x" + utils.toHexString(utils.decodeBase64url(resultPob!.value.difficulty))
  );
  const vhpProducing = 10 * difficulty / 3000 / 1e8;
  return 2 * (totalVhp + totalKoin) / vhpProducing;
}

export function computePoolApy(
  networkApy: number,
  beneficiaries: { percentage: number }[]
): number {
  const beneficiaryShare = beneficiaries.reduce(
    (sum, beneficiary) => sum + beneficiary.percentage,
    0
  ) / 1000;
  return networkApy * (1 - beneficiaryShare / 100);
}

export type PoolHealth = "producing" | "late" | "paused";

const DAY_MS = 24 * 60 * 60 * 1000;

export function poolHealth(
  input: { lastBlockTime?: Date; expectedTimeToProduce?: number; effectiveness?: number },
  now: Date = new Date()
): PoolHealth {
  if (!input.lastBlockTime) return "paused";
  const age = now.getTime() - input.lastBlockTime.getTime();
  if (age > DAY_MS) return "paused";
  if (input.expectedTimeToProduce && age > 2 * input.expectedTimeToProduce) return "late";
  if (input.effectiveness !== undefined && input.effectiveness < 50) return "late";
  return "producing";
}

export function formatPayoutPeriod(paymentPeriodMs?: string): string {
  if (!paymentPeriodMs) return "—";
  const days = Number(paymentPeriodMs) / DAY_MS;
  if (!Number.isFinite(days) || days <= 0) return "—";
  if (days === 1) return "Every day";
  return `Every ${Number.isInteger(days) ? days : days.toFixed(1)} days`;
}

const SCALE = 1e8;

/**
 * Best open order on the *other* side that would satisfy the amounts the user
 * typed, at an equal or better price. Used only to offer the existing fill
 * dialog as a shortcut; it never places or fills anything itself.
 */
export function findMatchingOrder<
  T extends { vhp_amount: string; koin_amount: string; buy: boolean; owner: string; id: string }
>(
  side: "buy" | "sell",
  vhpAmount: string,
  koinAmount: string,
  orders: T[],
  account: string | null
): T | null {
  const vhp = Number(vhpAmount);
  const koin = Number(koinAmount);
  if (!Number.isFinite(vhp) || !Number.isFinite(koin) || vhp <= 0 || koin <= 0) return null;
  const wantedPrice = koin / vhp; // KOIN per VHP
  const candidates = orders
    .filter((order) => order.buy === (side === "sell") && order.owner !== account)
    .filter((order) => Number(order.vhp_amount) / SCALE >= vhp)
    .map((order) => ({ order, price: Number(order.koin_amount) / Number(order.vhp_amount) }))
    .filter(({ price }) => (side === "sell" ? price >= wantedPrice : price <= wantedPrice))
    .sort((a, b) => (side === "sell" ? b.price - a.price : a.price - b.price));
  return candidates[0]?.order ?? null;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `yarn test`
Expected: all tests PASS (`# fail 0`).

- [ ] **Step 6: Point the list page at the shared helpers**

In `src/app/dapps/fogata/page.tsx`, delete lines 30–61 (the `getNetworkApy` and `computePoolApy` definitions and the JSDoc above them) and add to the imports:

```ts
import { computePoolApy, getNetworkApy } from "@/lib/fogata";
```

Remove now-unused imports from that file if ESLint flags them (`utils`, `abiPob`, `tokenAbi`, `POB_CONTRACT_ID` may become unused — check, `toBaseUnits` still uses none of them).

- [ ] **Step 7: Lint and build**

Run: `npx eslint src/lib/fogata.ts src/lib/fogata.test.ts src/app/dapps/fogata/page.tsx && yarn build`
Expected: no new lint problems; build passes.

- [ ] **Step 8: Commit**

```bash
git add package.json src/lib/fogata.ts src/lib/fogata.test.ts src/app/dapps/fogata/page.tsx
git commit -m "Extract Fogata helpers with tests

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `/dapps` becomes the pools list

**Files:**
- Move: `src/app/dapps/fogata/page.tsx` → `src/app/dapps/page.tsx` (overwrites the landing grid)
- Create: `src/app/dapps/fogata/page.tsx` (redirect)

**Interfaces:**
- Produces: route `/dapps` renders `FogataPage`; `/dapps/fogata` redirects to `/dapps`.

- [ ] **Step 1: Move the file**

```bash
git rm -q src/app/dapps/page.tsx
git mv src/app/dapps/fogata/page.tsx src/app/dapps/page.tsx
```

- [ ] **Step 2: Add the redirect**

Create `src/app/dapps/fogata/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function FogataIndexPage() {
  redirect("/dapps");
}
```

- [ ] **Step 3: Fix the pool-page back link**

In `src/app/dapps/fogata/[poolId]/page.tsx` line 895, change `href="/dapps/fogata"` to `href="/dapps"`.

- [ ] **Step 4: Build and check routes**

Run: `yarn build`
Expected: route list shows `○ /dapps`, `○ /dapps/fogata`, `ƒ /dapps/fogata/[poolId]`, `○ /dapps/dex`. Then open `http://localhost:7777/dapps/fogata` — it should land on `/dapps` showing the (still old-looking) pool list.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/dapps
git commit -m "Make /dapps the pools list

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Pools list layout

**Files:**
- Modify: `src/app/dapps/page.tsx` — only the JSX in `return (…)` (currently lines ≈336–740 before the move) and imports. `handleCreatePool`, the `useEffect` loader, all `useState`s stay.

**Interfaces:**
- Consumes: `computePoolApy`, `formatPayoutPeriod` from `@/lib/fogata`.

- [ ] **Step 1: Replace the page JSX**

Keep everything above `return (` unchanged. Replace the whole `return (…)` with the following. The `<DialogContent>…</DialogContent>` block (the create-pool form, currently lines ≈348–572) is **kept verbatim** — cut it from the old JSX and paste it where marked.

```tsx
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <h1 className="text-2xl font-semibold tracking-tight">Mining pools</h1>

        {loading && (
          <ul className="mt-7 divide-y border-t" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-4 py-[18px]">
                <Skeleton className="h-10 w-10 rounded-[10px]" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-14" />
              </li>
            ))}
          </ul>
        )}

        {error && !loading && (
          <p className="mt-7 text-sm text-muted-foreground">
            Couldn&apos;t load pools.{" "}
            <button type="button" className="text-brand" onClick={() => router.refresh()}>
              Retry
            </button>
          </p>
        )}

        {!loading && !error && pools.length === 0 && (
          <p className="mt-7 text-sm text-muted-foreground">No pools are listed yet.</p>
        )}

        {!loading && !error && pools.length > 0 && (
          <ul className="mt-7 divide-y border-t">
            {[...pools]
              .map((pool) => ({
                pool,
                apy:
                  networkApy !== null
                    ? computePoolApy(networkApy, pool.beneficiaries ?? [])
                    : null,
              }))
              .sort((a, b) => (b.apy ?? -1) - (a.apy ?? -1) || a.pool.name.localeCompare(b.pool.name))
              .map(({ pool, apy }) => (
                <li key={pool.account}>
                  <Link
                    href={`/dapps/fogata/${pool.account}`}
                    className="-mx-3 flex items-center gap-4 rounded-[10px] px-3 py-[18px] transition-colors hover:bg-muted/60"
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-muted text-sm font-semibold text-muted-foreground">
                      {(pool.name || "P").charAt(0).toUpperCase()}
                      {pool.image && (
                        /* Pool logo hosts are arbitrary on-chain URLs */
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={pool.image}
                          alt=""
                          className="absolute inset-0 h-full w-full bg-background object-contain"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {pool.name || "Unnamed pool"}
                    </span>
                    <span className="text-base font-semibold tabular-nums">
                      {apy !== null ? `${apy.toFixed(1)}%` : "—"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                  </Link>
                </li>
              ))}
          </ul>
        )}

        <p className="mt-7 text-xs text-muted-foreground/80">
          Estimated yearly yield after the pool&apos;s fee. Run a node?{" "}
          <DialogTrigger asChild>
            <button type="button" className="text-muted-foreground underline-offset-2 hover:underline">
              Start a pool
            </button>
          </DialogTrigger>
        </p>

        {/* ---- create-pool dialog: paste the existing <DialogContent>…</DialogContent> here, unchanged ---- */}
      </Dialog>
    </div>
  );
```

- [ ] **Step 2: Fix imports**

Add `import { Skeleton } from "@/components/ui/skeleton";` and change the lucide import to `import { ChevronRight } from "lucide-react";` (drop `ChevronDown`, `Plus`). Remove `BetaTag`, `Card`, `CardContent`, `Badge`, `Button` imports if nothing else in the file uses them (the dialog content still uses `Button`, `Input`, `Label` — keep those). `formatPayoutPeriod` is not needed on this page; don't import it.

- [ ] **Step 3: Lint and build**

Run: `npx eslint src/app/dapps/page.tsx && yarn build`
Expected: no new problems; build passes.

- [ ] **Step 4: Look at it**

Open `http://localhost:7777/dapps`. Expected: "Mining pools" title, one row (JGA#3 · 24.x%), the small footer line, no hero, no card, no CTA block. "Start a pool" opens the unchanged create dialog. Check at 360 px width (devtools device toolbar): the row still fits on one line.

- [ ] **Step 5: Commit**

```bash
git add src/app/dapps/page.tsx
git commit -m "Redesign pools list as rows

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Pool page header, hero and About list

**Files:**
- Modify: `src/app/dapps/fogata/[poolId]/page.tsx` — JSX from `return (` (line 893) down to, but not including, `<Tabs defaultValue="deposit">` (line ≈1181); plus a few state additions near line 218.

**Interfaces:**
- Consumes: `computePoolApy`, `getNetworkApy`, `poolHealth`, `formatPayoutPeriod` from `@/lib/fogata`.
- Produces (for Tasks 6–7): state `sheet: "deposit" | "withdraw" | "rewards" | null`, `manageOpen: boolean`, derived `health: PoolHealth`, `poolApy: number | null`.

- [ ] **Step 1: Add UI state and the APY read**

After line 218 (`const isOwner = …`) add:

```tsx
  const [sheet, setSheet] = useState<"deposit" | "withdraw" | "rewards" | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [networkApy, setNetworkApy] = useState<number | null>(null);

  useEffect(() => {
    if (!provider) return;
    getNetworkApy(provider)
      .then(setNetworkApy)
      .catch((err) => console.info("Unable to load network APY:", err));
  }, [provider]);

  const poolApy =
    networkApy !== null && poolParams
      ? computePoolApy(networkApy, poolParams.beneficiaries ?? [])
      : null;
  const health = poolHealth(performance);
  const feePercent = (poolParams?.beneficiaries ?? []).reduce(
    (sum, beneficiary) => sum + beneficiary.percentage,
    0
  ) / 1000;
  const stakedVhp = poolBalance
    ? (BigInt(poolBalance.vhp_amount) + BigInt(poolBalance.koin_amount)).toString()
    : null;
  const hasStake = stakedVhp !== null && BigInt(stakedVhp) > BigInt(0);
```

(`getNetworkApy` is the same read-only helper the list page already runs; it is the one read this page adds — spec §3a.)

Add the import: `import { computePoolApy, formatPayoutPeriod, getNetworkApy, poolHealth } from "@/lib/fogata";`

- [ ] **Step 2: Replace the top of the JSX**

Replace everything from `return (` through the closing `)}` of the `{poolBalanceError && (…)}` alert (i.e. up to the line before `<Tabs defaultValue="deposit">`) with:

```tsx
  const healthDot = (
    <span
      aria-label={health}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        health === "producing" && "bg-emerald-500",
        health === "late" && "bg-amber-500",
        health === "paused" && "bg-red-500"
      )}
    />
  );
  const healthWord = health === "producing" ? "Producing" : health === "late" ? "Producing slowly" : "Paused";

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10">
      <Link href="/dapps" className="mb-7 inline-block text-sm text-muted-foreground hover:text-foreground">
        ‹ Mining pools
      </Link>

      {loading && (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-56" />
        </div>
      )}

      {error && !loading && (
        <div>
          <h1 className="break-all font-mono text-lg">{poolId}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Couldn&apos;t load this pool.{" "}
            <button type="button" className="text-brand" onClick={() => loadData()}>
              Retry
            </button>
          </p>
        </div>
      )}

      {!loading && !error && poolParams && (
        <>
          <header className="flex items-center gap-4">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-base font-semibold text-muted-foreground">
              {(poolParams.name || "P").charAt(0).toUpperCase()}
              {poolParams.image && (
                /* Pool logo hosts are arbitrary on-chain URLs */
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={poolParams.image}
                  alt=""
                  className="absolute inset-0 h-full w-full bg-background object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
                <span className="truncate">{poolParams.name || "Unnamed pool"}</span>
                {healthDot}
              </h1>
              <p className="text-sm text-muted-foreground">
                {healthWord}
                {poolApy !== null && <> · {poolApy.toFixed(1)}% yield</>}
                {isOwner && (
                  <>
                    {" "}·{" "}
                    <button
                      type="button"
                      className="font-medium text-brand"
                      onClick={() => setManageOpen((open) => !open)}
                    >
                      Manage
                    </button>
                  </>
                )}
              </p>
            </div>
          </header>

          <section className="mt-11" aria-label={account ? "Your stake" : "Estimated yearly yield"}>
            {!account && (
              <>
                <p className="text-sm text-muted-foreground">Estimated yearly yield</p>
                <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums max-sm:text-4xl">
                  {poolApy !== null ? poolApy.toFixed(1) : "—"}
                  <span className="ml-1.5 text-lg font-medium tracking-normal text-muted-foreground">%</span>
                </p>
                <div className="mt-6">
                  <WalletButton />
                </div>
              </>
            )}

            {account && !hasStake && (
              <>
                <p className="text-sm text-muted-foreground">Estimated yearly yield</p>
                <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums max-sm:text-4xl">
                  {poolApy !== null ? poolApy.toFixed(1) : "—"}
                  <span className="ml-1.5 text-lg font-medium tracking-normal text-muted-foreground">%</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">You have nothing staked here.</p>
                <div className="mt-6">
                  <Button className="h-[42px] rounded-[11px] bg-brand px-6 text-brand-foreground hover:bg-brand/90" onClick={() => setSheet("deposit")}>
                    Deposit
                  </Button>
                </div>
              </>
            )}

            {account && hasStake && (
              <>
                <p className="text-sm text-muted-foreground">Your stake</p>
                <p className="mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums max-sm:text-4xl">
                  {formatAmount(stakedVhp!)}
                  <span className="ml-1.5 text-lg font-medium tracking-normal text-muted-foreground">VHP</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {poolBalance && BigInt(poolBalance.koin_amount) > BigInt(0) && (
                    <>includes {formatAmount(poolBalance.koin_amount)} KOIN being converted · </>
                  )}
                  {nextPayment && <>next payout {formatTimeAgo(nextPayment)} · </>}
                  rewards{" "}
                  {preferences && BigInt(preferences.all_after_virtual || "0") > BigInt(0)
                    ? `keep ${formatAmount(preferences.all_after_virtual)} VHP`
                    : preferences
                      ? `${Number(preferences.percentage_koin) / 1000}% as KOIN`
                      : "—"}{" "}
                  ·{" "}
                  <button type="button" className="text-brand" onClick={() => setSheet("rewards")}>
                    change
                  </button>
                </p>
                <div className="mt-6 flex items-center gap-[18px]">
                  <Button className="h-[42px] rounded-[11px] bg-brand px-6 text-brand-foreground hover:bg-brand/90" onClick={() => setSheet("deposit")}>
                    Deposit
                  </Button>
                  <button type="button" className="text-sm font-medium text-brand" onClick={() => setSheet("withdraw")}>
                    Withdraw
                  </button>
                </div>
              </>
            )}
            {poolBalanceError && account && (
              <p className="mt-3 text-xs text-muted-foreground">Couldn&apos;t load your balance in this pool.</p>
            )}
          </section>

          <section className="mt-16">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">About this pool</h2>
            {poolParams.description && (
              <p className="mb-5 line-clamp-2 text-sm text-muted-foreground">{poolParams.description}</p>
            )}
            <dl className="text-sm">
              {[
                ["Effectiveness", <span key="e" className="inline-flex items-center gap-2 tabular-nums">{healthDot}{performance.effectiveness !== undefined ? `${performance.effectiveness.toFixed(0)}%` : "—"}</span>],
                ["Block time", <span key="b" className="tabular-nums">{formatDuration(performance.averageTimeToProduce)}{performance.expectedTimeToProduce !== undefined && <span className="ml-2 text-muted-foreground">expected {formatDuration(performance.expectedTimeToProduce)}</span>}</span>],
                ["Staked in pool", <span key="s" className="tabular-nums">{formatTokenAmount(performance.vhpAmount, "VHP")}</span>],
                ["Fee", <span key="f" className="tabular-nums">{feePercent}%</span>],
                ["Payout", formatPayoutPeriod(poolParams.payment_period)],
                ["Address", <Link key="a" href={`/address/${poolId}`} className="font-mono text-xs text-brand">{poolId.slice(0, 8)}…{poolId.slice(-6)}</Link>],
                ["Contract", <Link key="c" href={`/contracts/${poolId}`} className="text-brand">Fogata Pool v2</Link>],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between gap-6 border-t py-[11px]">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Tabs block from the original file continues here for now (Tasks 6–7 replace it) */}
```

and at the very end of the JSX, replace the original closing

```tsx
          </Tabs>
        </div>
      )}
    </div>
  );
```

with

```tsx
          </Tabs>
        </>
      )}
    </div>
  );
```

- [ ] **Step 3: Fix imports**

Add: `import { Skeleton } from "@/components/ui/skeleton";`, `import { WalletButton } from "@/components/WalletButton";`, `import { cn } from "@/lib/utils";`. Remove `BetaTag`, `Alert`, `AlertDescription` (Task 7 keeps one Alert inside Manage — check before removing), `ArrowLeft`, and any lucide icons that are now unused (`Hash`, `Coins`, `Zap`, `Clock`, `Activity`, `CalendarClock`). Keep `Card*` — the Tabs still use them until Task 6.

- [ ] **Step 4: Lint and build**

Run: `npx eslint 'src/app/dapps/fogata/[poolId]/page.tsx' && yarn build`
Expected: no new problems; build passes.

- [ ] **Step 5: Look at it in the three states**

Open `http://localhost:7777/dapps/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk`:
- Disconnected: "Estimated yearly yield · 24.x %" and the wallet button; no forms above the (temporary) tabs.
- Connect Kondor with no stake: same number, "Deposit" button.
- With stake: "Your stake · N VHP", Deposit + Withdraw. (If you have no staked wallet, verify this branch by temporarily setting `hasStake` true in devtools React panel or by reading the JSX — do not commit a fake.)
- "About this pool" rows have hairlines and right-aligned values.

- [ ] **Step 6: Commit**

```bash
git add 'src/app/dapps/fogata/[poolId]/page.tsx'
git commit -m "Redesign pool page header and hero

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Deposit, Withdraw and Reward dialogs

**Files:**
- Modify: `src/app/dapps/fogata/[poolId]/page.tsx` — the `<Tabs>` block's `deposit`, `withdraw`, `rewards` `TabsContent`s become three `<Dialog>`s; three one-line additions in handlers.

**Interfaces:**
- Consumes: `sheet`, `setSheet` from Task 5; existing `koinDeposit`/`vhpDeposit`/`koinWithdraw`/`vhpWithdraw`/`rewardMode`/`percentageKoin`/`allAfterVirtual` state and `handleStake`/`handleUnstake`/`handleSavePreferences`.

- [ ] **Step 1: Add the token-choice state**

Below the `sheet` state from Task 5 add:

```tsx
  const [depositToken, setDepositToken] = useState<"koin" | "vhp">("koin");
  const [withdrawToken, setWithdrawToken] = useState<"koin" | "vhp">("vhp");
```

- [ ] **Step 2: Close the dialog on success (the only handler edits in Phase A)**

- In `handleStake`, directly after `setVhpDeposit("");` (line ≈583) add one line: `setSheet(null);`
- In `handleUnstake`, directly after the corresponding `setVhpWithdraw("");` add one line: `setSheet(null);`
- In `handleSavePreferences`, directly after `toast.success("Preferences saved");` add one line: `setSheet(null);`

Nothing else in those functions changes.

- [ ] **Step 3: Replace the three tabs with dialogs**

Delete `<Tabs defaultValue="deposit">`, its `<TabsList>…</TabsList>`, and the three `<TabsContent value="deposit|withdraw|rewards">` blocks. Leave the `{isOwner && (<TabsContent value="configure" …>)}` block in place for Task 7 (it will not compile until Task 7 — do Task 7's Step 1 immediately after this step in the same working session, before running the build). In their place, after the About `</section>`, add:

```tsx
          <Dialog open={sheet === "deposit"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Deposit to {poolParams.name || "this pool"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-0.5 rounded-[9px] bg-muted p-[3px]" role="group" aria-label="Token">
                {(["koin", "vhp"] as const).map((token) => (
                  <button
                    key={token}
                    type="button"
                    disabled={submitting}
                    onClick={() => setDepositToken(token)}
                    className={cn(
                      "rounded-[7px] py-1.5 text-sm transition-colors",
                      depositToken === token ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {token.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5">
                <input
                  id={depositToken === "koin" ? "koin-deposit" : "vhp-deposit"}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
                  value={depositToken === "koin" ? koinDeposit : vhpDeposit}
                  onChange={(e) =>
                    depositToken === "koin" ? setKoinDeposit(e.target.value) : setVhpDeposit(e.target.value)
                  }
                  disabled={submitting}
                />
                <span className="font-medium text-muted-foreground">{depositToken.toUpperCase()}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand disabled:opacity-40"
                  disabled={!walletBalances || submitting}
                  onClick={() =>
                    depositToken === "koin"
                      ? setKoinDeposit(formatAmount(walletBalances!.koin))
                      : setVhpDeposit(formatAmount(walletBalances!.vhp))
                  }
                >
                  Max
                </button>
              </div>
              <div className="-mt-2 flex justify-between px-0.5 text-xs text-muted-foreground">
                <span>
                  Wallet {walletBalances ? formatAmount(depositToken === "koin" ? walletBalances.koin : walletBalances.vhp) : "—"} {depositToken.toUpperCase()}
                </span>
                {poolApy !== null && <span className="tabular-nums">≈ {poolApy.toFixed(1)}% yearly</span>}
              </div>
              {depositToken === "koin" && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  KOIN becomes VHP over the next {formatPayoutPeriod(poolParams.payment_period).replace(/^Every /, "")}. To get KOIN back later,{" "}
                  <Link href="/dapps/dex" className="text-brand">trade VHP for KOIN</Link>.
                </p>
              )}
              <Button
                className="h-[42px] w-full rounded-[11px] bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleStake}
                disabled={!account || submitting}
              >
                {submitting
                  ? "Submitting…"
                  : `Deposit ${depositToken === "koin" ? koinDeposit || "0" : vhpDeposit || "0"} ${depositToken.toUpperCase()}`}
              </Button>
            </DialogContent>
          </Dialog>

          <Dialog open={sheet === "withdraw"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Withdraw from {poolParams.name || "this pool"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-0.5 rounded-[9px] bg-muted p-[3px]" role="group" aria-label="Token">
                {(["vhp", "koin"] as const).map((token) => (
                  <button
                    key={token}
                    type="button"
                    disabled={submitting}
                    onClick={() => setWithdrawToken(token)}
                    className={cn(
                      "rounded-[7px] py-1.5 text-sm transition-colors",
                      withdrawToken === token ? "bg-background font-medium shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    {token.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5">
                <input
                  id={withdrawToken === "koin" ? "koin-withdraw" : "vhp-withdraw"}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  inputMode="decimal"
                  className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
                  value={withdrawToken === "koin" ? koinWithdraw : vhpWithdraw}
                  onChange={(e) =>
                    withdrawToken === "koin" ? setKoinWithdraw(e.target.value) : setVhpWithdraw(e.target.value)
                  }
                  disabled={submitting}
                />
                <span className="font-medium text-muted-foreground">{withdrawToken.toUpperCase()}</span>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand disabled:opacity-40"
                  disabled={!poolBalance || submitting}
                  onClick={() =>
                    withdrawToken === "koin"
                      ? setKoinWithdraw(formatAmount(poolBalance!.koin_amount))
                      : setVhpWithdraw(formatAmount(poolBalance!.vhp_amount))
                  }
                >
                  Max
                </button>
              </div>
              <p className="-mt-2 px-0.5 text-xs text-muted-foreground">
                In pool {poolBalance ? formatAmount(withdrawToken === "koin" ? poolBalance.koin_amount : poolBalance.vhp_amount) : "—"} {withdrawToken.toUpperCase()}
              </p>
              <Button
                className="h-[42px] w-full rounded-[11px] bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleUnstake}
                disabled={!account || submitting}
              >
                {submitting
                  ? "Submitting…"
                  : `Withdraw ${withdrawToken === "koin" ? koinWithdraw || "0" : vhpWithdraw || "0"} ${withdrawToken.toUpperCase()}`}
              </Button>
            </DialogContent>
          </Dialog>

          <Dialog open={sheet === "rewards"} onOpenChange={(open) => { if (!open && !submitting) setSheet(null); }}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Reward settings</DialogTitle>
                <DialogDescription>Rewards are paid in KOIN. Choose what the pool does with them.</DialogDescription>
              </DialogHeader>
              {/* Paste the existing <RadioGroup …>…</RadioGroup> from the old rewards tab here, unchanged. */}
              <Button
                className="h-[42px] w-full rounded-[11px] bg-brand text-brand-foreground hover:bg-brand/90"
                onClick={handleSavePreferences}
                disabled={!account || submitting}
              >
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogContent>
          </Dialog>
```

Paste the original `<RadioGroup>…</RadioGroup>` (old lines ≈1373–1454) where marked; change only its two visible labels: "KOIN collection percentage" → "Take a share as KOIN", "Keep a VHP amount" → "Keep a VHP amount, take the rest as KOIN".

- [ ] **Step 4: Imports**

Add `import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";`. Keep `Tabs*` imports until Task 7 removes the last `TabsContent`.

- [ ] **Step 5: Continue immediately with Task 7 Step 1**, then lint/build/commit both together (Task 7 Steps 3–5).

---

### Task 7: Owner "Manage" section

**Files:**
- Modify: `src/app/dapps/fogata/[poolId]/page.tsx` — the remaining `{isOwner && (<TabsContent value="configure" …>…</TabsContent>)}` block.

**Interfaces:**
- Consumes: `manageOpen` from Task 5; existing owner handlers and state (unchanged).

- [ ] **Step 1: Turn the Configure tab into a conditional section**

Replace the opening

```tsx
            {isOwner && (
              <TabsContent value="configure" className="space-y-6">
                <Alert>
                  <AlertDescription>
                    You are connected as this pool&apos;s owner. The settings
                    below modify the pool on-chain.
                  </AlertDescription>
                </Alert>
```

with

```tsx
          {isOwner && manageOpen && (
            <section id="manage" className="mt-16 space-y-6">
              <h2 className="text-sm font-medium text-muted-foreground">Manage pool</h2>
```

Keep the three `<Card>`s (Pool parameters, Reserved KOIN, Node public key) exactly as they are. Wrap the fourth, "Remove pool" card in a collapsed disclosure — replace `<Card className="border-destructive/50">` … `</Card>` with:

```tsx
              <details className="border-t pt-3">
                <summary className="cursor-pointer list-none text-sm text-muted-foreground">Danger zone</summary>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <p>Removing the pool delists it from Fogata. Stakers keep their funds and can still withdraw. Enter the pool address to confirm.</p>
                  <Input
                    aria-label="Pool address confirmation"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={poolId}
                    disabled={submitting}
                  />
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={handleDeletePool}
                    disabled={submitting || deleteConfirmation !== poolId}
                  >
                    Remove from Fogata list
                  </Button>
                </div>
              </details>
```

and close the section: replace the final `</TabsContent>\n            )}\n          </Tabs>` with `</section>\n          )}`.

- [ ] **Step 2: Clean imports**

Remove `Tabs, TabsContent, TabsList, TabsTrigger`, `Alert, AlertDescription`, `CardDescription`/`CardHeader`/`CardTitle` only if unused (the three kept cards use them — keep).

- [ ] **Step 3: Lint and build**

Run: `npx eslint 'src/app/dapps/fogata/[poolId]/page.tsx' && yarn build`
Expected: no new problems; build passes.

- [ ] **Step 4: Verify the handler diffs**

Run: `git diff -U0 fogata -- 'src/app/dapps/fogata/[poolId]/page.tsx' | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -n 'setSheet(null)'`
Expected: exactly three `+      setSheet(null);` lines. Then eyeball `git diff fogata -- 'src/app/dapps/fogata/[poolId]/page.tsx'` between `const handleStake` and `return (`: apart from those three lines, no `+`/`-` lines inside any `handle*` or `loadData`.

- [ ] **Step 5: Manual check**

With Kondor connected: Deposit opens the dialog, KOIN tab shows the reburn sentence, VHP tab doesn't; button text carries the amount; Withdraw and "change" open their dialogs. As the owner (Julian's wallet) "Manage" toggles the section; as anyone else the word isn't there. Danger zone is collapsed by default.

- [ ] **Step 6: Commit (Tasks 6 + 7)**

```bash
git add 'src/app/dapps/fogata/[poolId]/page.tsx'
git commit -m "Move pool actions into dialogs and owner Manage section

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Trade page layout

**Files:**
- Modify: `src/app/dapps/dex/page.tsx` — `renderOrders`, `renderMyOrders` (lines 621–739) and the JSX from `return (` (line 741) to the `<Dialog>` fill dialog (line ≈1000). The fill dialog is kept verbatim; all handlers and loaders unchanged.

**Interfaces:**
- Consumes: `findMatchingOrder` from `@/lib/fogata`; existing `side`, `vhpAmount`, `koinAmount`, `pool`, `sellOrders`, `buyOrders`, `myOrders`, `impliedPrice`, `availablePayBalance`, `openFillDialog`, `handleCreateOrder`, `handleCancelOrder`, `loadOrders`.

- [ ] **Step 1: Compute the matching order**

After the `impliedPrice` memo (line ≈330) add:

```tsx
  const matchingOrder = useMemo(
    () =>
      findMatchingOrder(
        side,
        vhpAmount,
        koinAmount,
        side === "sell" ? buyOrders : sellOrders,
        account
      ),
    [side, vhpAmount, koinAmount, buyOrders, sellOrders, account]
  );
```

Import: `import { findMatchingOrder } from "@/lib/fogata";`

- [ ] **Step 2: Replace `renderOrders` and `renderMyOrders`**

Delete both helpers (lines 621–739, keep `getPoolLabel`) and add one:

```tsx
  const renderBook = () => {
    const orders = side === "sell" ? sellOrders : buyOrders;
    const mine = myOrders.filter((order) => order.buy === (side === "buy"));
    const others = orders.filter((order) => order.owner !== account);
    const rows = [...mine, ...others];
    return (
      <details className="mt-9 border-t">
        <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm text-muted-foreground">
          <span>Open orders</span>
          <span className="tabular-nums">{loading ? "…" : rows.length} ›</span>
        </summary>
        {error && (
          <p className="pb-3 text-sm text-muted-foreground">
            Couldn&apos;t load orders.{" "}
            <button type="button" className="text-brand" onClick={loadOrders}>Retry</button>
          </p>
        )}
        {!error && rows.length === 0 && !loading && (
          <p className="pb-3 text-sm text-muted-foreground">No open orders.</p>
        )}
        {rows.length > 0 && (
          <table className="w-full text-sm">
            <tbody>
              {rows.map((order) => {
                const isMine = order.owner === account;
                return (
                  <tr key={order.id} className="border-t">
                    <td className={cn("py-2.5", isMine && "text-brand")}>
                      {isMine ? "Your " : ""}
                      {order.buy ? "buy" : "sell"} {formatAmount(order.vhp_amount)} VHP
                      {isMine && order.pool && <span className="text-muted-foreground"> · {getPoolLabel(order.pool)}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                      {formatPrice(order)}
                      {" · "}
                      {isMine ? (
                        <button type="button" className="hover:text-foreground" onClick={() => handleCancelOrder(order)} disabled={submitting}>
                          cancel
                        </button>
                      ) : (
                        <button type="button" className="text-brand" onClick={() => openFillDialog(order)} disabled={!account || submitting}>
                          fill
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </details>
    );
  };
```

- [ ] **Step 3: Replace the page JSX above the fill dialog**

Replace from `return (` down to (not including) the `<Dialog open={Boolean(selectedOrder)}` with:

```tsx
  const payAmount = side === "sell" ? vhpAmount : koinAmount;
  const getAmount = side === "sell" ? koinAmount : vhpAmount;
  const paySymbol = side === "sell" ? "VHP" : "KOIN";
  const getSymbol = side === "sell" ? "KOIN" : "VHP";

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Trade</h1>

      <div className="mt-6 grid grid-cols-2 gap-0.5 rounded-[9px] bg-muted p-[3px]" role="group" aria-label="Order side">
        <button
          type="button"
          disabled={submitting}
          onClick={() => setSide("sell")}
          className={cn("rounded-[7px] py-1.5 text-sm transition-colors", side === "sell" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Sell VHP
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => { setSide("buy"); setPool(""); }}
          className={cn("rounded-[7px] py-1.5 text-sm transition-colors", side === "buy" ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
        >
          Buy VHP
        </button>
      </div>

      <div className="mt-4 flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5">
        <input
          id="dex-pay-amount"
          type="number"
          min="0"
          step="0.00000001"
          placeholder="0"
          inputMode="decimal"
          aria-label={`You ${side === "sell" ? "sell" : "pay"}`}
          className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
          value={payAmount}
          onChange={(event) => (side === "sell" ? setVhpAmount(event.target.value) : setKoinAmount(event.target.value))}
          disabled={submitting}
        />
        <span className="font-medium text-muted-foreground">{paySymbol}</span>
        <button
          type="button"
          className="text-xs font-semibold text-brand disabled:opacity-40"
          disabled={submitting || !availablePayBalance || balancesLoading || BigInt(availablePayBalance || "0") <= BigInt(0)}
          onClick={() => {
            if (!availablePayBalance) return;
            const maxValue = formatAmountForInput(availablePayBalance);
            if (side === "sell") setVhpAmount(maxValue);
            else setKoinAmount(maxValue);
          }}
        >
          Max
        </button>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2.5 rounded-xl border px-4 py-3.5">
        <input
          id="dex-get-amount"
          type="number"
          min="0"
          step="0.00000001"
          placeholder="0"
          inputMode="decimal"
          aria-label="You get"
          className="w-full min-w-0 bg-transparent text-[28px] font-semibold tracking-tight outline-none tabular-nums"
          value={getAmount}
          onChange={(event) => (side === "sell" ? setKoinAmount(event.target.value) : setVhpAmount(event.target.value))}
          disabled={submitting}
        />
        <span className="font-medium text-muted-foreground">{getSymbol}</span>
      </div>
      <div className="mt-2 flex justify-between px-0.5 text-xs text-muted-foreground">
        <span className="tabular-nums">{impliedPrice ? `${impliedPrice} KOIN per VHP` : " "}</span>
        <span>
          {!account
            ? ""
            : balancesLoading
              ? "Loading balance…"
              : availablePayBalance !== null
                ? `Wallet ${formatAmount(availablePayBalance)} ${availablePaySymbol}${side === "sell" && pool ? " in pool" : ""}`
                : ""}
        </span>
      </div>

      {side === "sell" && account && pools.length > 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          <Select value={pool || NO_POOL_VALUE} onValueChange={(value) => setPool(value === NO_POOL_VALUE ? "" : value)} disabled={submitting || poolsLoading}>
            <SelectTrigger id="dex-pool" className="h-8 w-auto gap-2 border-0 px-0 text-xs text-brand shadow-none">
              <SelectValue placeholder="Sell from a pool instead" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_POOL_VALUE}>Sell from your wallet</SelectItem>
              {pools.map((miningPool) => (
                <SelectItem key={miningPool.account} value={miningPool.account}>
                  Sell from {miningPool.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {matchingOrder && (
        <p className="mt-4 text-xs text-muted-foreground">
          An open order matches —{" "}
          <button type="button" className="text-brand" onClick={() => openFillDialog(matchingOrder)} disabled={!account || submitting}>
            {matchingOrder.buy ? "Sell" : "Buy"} {formatAmount(matchingOrder.vhp_amount)} VHP at {formatPrice(matchingOrder)} ›
          </button>
        </p>
      )}

      {account ? (
        <Button
          className="mt-4 h-[42px] w-full rounded-[11px] bg-brand text-brand-foreground hover:bg-brand/90"
          onClick={handleCreateOrder}
          disabled={submitting}
        >
          {submitting ? "Submitting…" : "Place order"}
        </Button>
      ) : (
        <div className="mt-4">
          <WalletButton />
        </div>
      )}
      <p className="mt-2.5 text-center text-xs text-muted-foreground">Waits for a taker. Cancel any time.</p>

      {renderBook()}

```

The existing `<Dialog open={Boolean(selectedOrder)} …>…</Dialog>` follows, then close with `</div>\n  );`.

- [ ] **Step 4: Copy inside the kept fill dialog**

In the fill dialog, change `Price: … KOIN per VHP. Partial fills are supported.` to `… KOIN per VHP. You can fill part of it.` and the button label "Fill order" to `Fill`. No other change.

- [ ] **Step 5: Imports**

Add `import { WalletButton } from "@/components/WalletButton";`. Remove `BetaTag`, `ArrowDownUp`, `RefreshCw`, `Card*`, `Tabs*`, `Table*`, `Badge`, `Alert*`, `Label` if unused (the fill dialog still uses `Label` and `Input` — keep those).

- [ ] **Step 6: Lint and build**

Run: `npx eslint src/app/dapps/dex/page.tsx && yarn build`
Expected: no new problems; build passes.

- [ ] **Step 7: Verify handlers untouched**

Run: `git diff fogata -- src/app/dapps/dex/page.tsx | grep -nE '^[+-].*(handleCreateOrder|handleFillOrder|handleCancelOrder|loadOrders|fetchOrders) ='`
Expected: no output (no handler definitions changed).

- [ ] **Step 8: Manual check**

`/dapps/dex`: title, segmented control, two big amount fields, "Place order", "Waits for a taker…", collapsed "Open orders · N". No "tier" anywhere (`grep -n -i tier src/app/dapps/dex/page.tsx` shows only code identifiers, no JSX strings). Disconnected: wallet button instead of Place order.

- [ ] **Step 9: Commit**

```bash
git add src/app/dapps/dex/page.tsx
git commit -m "Redesign trade page form-first

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Cleanup, CSP, regression script

**Files:**
- Delete: `src/components/BetaTag.tsx`
- Modify: `next.config.mjs:50-53` (remove wikimedia `remotePatterns` entry) and line 72 (CSP)
- Create: `scripts/regression-dapps-ui.mjs`
- Modify: `package.json` (`scripts`)

- [ ] **Step 1: Delete BetaTag and confirm nothing imports it**

```bash
git rm -q src/components/BetaTag.tsx
grep -rn "BetaTag" src || echo "no references"
```
Expected: `no references`.

- [ ] **Step 2: Restore the CSP allowlist**

In `next.config.mjs` remove the block

```js
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
```

and change

```js
              "img-src 'self' data: blob: https: http:",
```

back to

```js
              "img-src 'self' data: blob: https://raw.githubusercontent.com https://githubusercontent.com https://walletconnect.com https://koinscan.com",
```

Note: pool logos are arbitrary on-chain URLs rendered with `<img>`; with the allowlist they will only show when hosted on an allowed host. That matches `master`'s hardening; JGA#3's logo host is checked in Step 5 and, if it's a different host, added as a single explicit entry rather than reopening `https:`.

- [ ] **Step 3: Regression script**

Create `scripts/regression-dapps-ui.mjs`:

```js
import assert from "node:assert/strict";

const baseUrl = process.env.DAPPS_UI_BASE_URL || "http://localhost:3002";

async function page(path) {
  const response = await fetch(`${baseUrl}${path}`);
  assert.equal(response.status, 200, `${path} is reachable`);
  return response.text();
}

const pools = await page("/dapps");
assert.match(pools, />Mining pools</, "/dapps is the pools list");
assert.doesNotMatch(pools, /Discover dApps|Fogata 2 empowers/, "/dapps has no hero copy");
assert.doesNotMatch(pools, /Create a mining pool/, "the operator CTA block is gone");
assert.match(pools, /Start a pool/, "operators still have a link");

const redirect = await fetch(`${baseUrl}/dapps/fogata`, { redirect: "manual" });
assert.ok([307, 308].includes(redirect.status), "/dapps/fogata redirects");
assert.match(redirect.headers.get("location") ?? "", /\/dapps$/, "…to /dapps");

const dex = await page("/dapps/dex");
assert.match(dex, />Trade</, "trade page has the short title");
assert.doesNotMatch(dex, /order book decentralized exchange/i, "trade page has no hero title");
assert.doesNotMatch(dex, /tiers? \d/i, "the word tier is not in trade copy");
assert.match(dex, /Waits for a taker/, "the order-placement sentence is present");

for (const html of [pools, dex]) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1]);
  assert.ok(h1s.length > 0, "page has a title");
  for (const h1 of h1s) assert.doesNotMatch(h1, /beta/i, "no beta tag inside page titles");
}

console.log("dapps ui regression passed");
```

Add to `package.json` scripts: `"dapps-ui:regression": "node scripts/regression-dapps-ui.mjs",`

- [ ] **Step 4: Run it against a production build**

```bash
yarn build && (PORT=3002 yarn start > /dev/null 2>&1 & echo $! > /tmp/claude-501/ks-start.pid); sleep 4
yarn dapps-ui:regression; kill $(cat /tmp/claude-501/ks-start.pid)
```
Expected: `dapps ui regression passed`.

- [ ] **Step 5: Full lint on changed files and JGA#3 logo host check**

```bash
npx eslint src/app/dapps src/lib/fogata.ts src/lib/fogata.test.ts next.config.mjs
```
Expected: no new problems versus `fogata`. Then on `/dapps/fogata/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk` check the pool logo renders; if the console shows a CSP `img-src` block, add that one host to both `remotePatterns` and the CSP line.

- [ ] **Step 6: Commit**

```bash
git add -A next.config.mjs package.json scripts/regression-dapps-ui.mjs src/components/BetaTag.tsx
git commit -m "Remove BetaTag, restore CSP allowlist, add dapps UI regression

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Final review pass

- [ ] **Step 1: Whole-diff invariant check**

```bash
git diff fogata --stat
git diff fogata -- src/koinos src/contexts src/lib/api.ts src/lib/price.ts
```
Expected: the second command prints nothing (no ABI/context/API changes). The stat lists only: `globals.css`, `tailwind.config.js`, `package.json`, `next.config.mjs`, `.gitignore`, `docs/superpowers/**`, `public/fogata-mark.svg`, `scripts/regression-dapps-ui.mjs`, `src/lib/fogata*.ts`, `src/app/dapps/**`, `src/components/BetaTag.tsx` (deleted), plus the files the `master` merge brought in.

- [ ] **Step 2: Screenshots for the PR**

Capture `/dapps`, the pool page (disconnected and connected), and `/dapps/dex` in dark and light (toggle with the navbar moon icon). Save under the scratchpad and attach to the PR description.

- [ ] **Step 3: Open the PR**

```bash
git push -u origin dapps-ux
gh pr create --base fogata --title "dApps UI: one thing per screen" --body-file - <<'EOF'
## Summary
Re-lays-out the dApps pages to the spec in `docs/superpowers/specs/2026-09-19-dapps-ux-redesign-design.md`. UI only: no contract call, handler, loader, ABI or wallet change (the only handler edits are three one-line `setSheet(null)` calls that close a dialog on success).

- `/dapps` is the pool list (rows: logo · name · APY); landing grid removed; `/dapps/fogata` redirects
- Pool page: one hero (your stake, or the yield when disconnected), Deposit/Withdraw/Reward dialogs, "About this pool" list, owner-only Manage section
- Trade: form first with "Place order", collapsed order book, existing fill dialog
- `brand` colour tokens; `BetaTag` removed (navbar badge is the beta marker); CSP `img-src` allowlist restored
- `master` merged in (footer/navbar conflicts resolved)

## Verification
- `yarn test` (new pure helpers), `yarn lint` on changed files (no new problems), `yarn build`
- `yarn dapps-ui:regression` against `yarn start` on :3002
- Manual: deposit / withdraw / reward settings / create order / fill / cancel each open the same handler as before

## Open for Julian
- v1 pools in the list? (spec §9.1)
- Fogata mark in `public/fogata-mark.svg` — right asset?

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

---

## Self-review

**Spec coverage**
- §5.1 Pools: Task 4 (rows, footer link, empty/error/loading). Health dot on list → Phase B per spec amendment. ✔
- §5.2 Pool page: Task 5 (header, three hero states, About list, error). ✔
- §5.3 / §5.4 / §5.5 sheets: Task 6. ✔
- §5.6 Manage: Task 7 (in-page section for Phase A; route in Phase B per spec §8). ✔
- §5.7 Create: existing dialog kept, opened from the footer link (Task 4); route in Phase B. ✔
- §5.8 Trade: Task 8 (form first, Place order, matching-order shortcut → existing fill dialog, collapsed book, pool select as one line, no "tier"). ✔
- §6 Visual: Task 1 tokens; Task 9 BetaTag/CSP. ✔
- §3a invariant: Tasks 6 Step 2, 7 Step 4, 8 Step 7, 10 Step 1 verify it. ✔

**Placeholders**: none — every code step is complete; "paste the existing X unchanged" always names the exact lines to paste.

**Type consistency**: `sheet` values `"deposit" | "withdraw" | "rewards" | null` used identically in Tasks 5–6; `poolHealth` signature in Task 2 matches its call in Task 5 (`poolHealth(performance)` — `PoolPerformance` has the three optional fields); `findMatchingOrder` generic matches `DexOrder` (`id`, `buy`, `owner`, `vhp_amount`, `koin_amount` exist on it, checked at `src/app/dapps/dex/page.tsx` types).
