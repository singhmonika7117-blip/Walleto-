# Glassmorphic ultra-responsive dashboard (hero + glass styling, no behavior change)

The change adds a colorful glassmorphic presentation layer to the Split dashboard: a new self-contained `client/src/styles/dashboard.css` and presentation-only edits to `DashboardPage.jsx`. A vivid multi-stop gradient with animated ambient glow pseudo-elements now wraps the dashboard; a prominent shared-wallet hero (reusing the existing `BalanceCard`) sits at the top with quick-action buttons; stat and group cards gained glassmorphic hover; the pending-vote badge pulses; and a mobile-first responsive grid (375px → 640px → 992px) replaces the old fixed `grid-3`. The hero is wired to the existing `useWallet` hook plus existing local modal state — nothing is hardcoded. The production build passes with exit code 0 (CSS bundle grew from ~6.99 kB to 11.10 kB, confirming the new styles are emitted).

**Watch for:** Nothing blocks. Two intentional deviations from the literal plan are worth knowing: `isolation:isolate` was dropped from `.dashboard-root` (it would have trapped dashboard modals behind the sidebar — removing it preserves existing modal behavior), and `GroupContext` is deliberately not consumed (the page keeps its proven `groupService.getUserGroups` local state to avoid a behavior change in a presentation-only task). Plus Jakarta Sans is already the app-wide font via `index.css`, so the dashboard's `@import` is redundant but harmless.

**Verdict**: APPROVED

## High-level view

The dashboard root becomes a self-contained glass panel: a light multi-stop radial gradient with two large blurred radial-glow pseudo-elements animated by slow `floatGlow` keyframes, clipped by `overflow:hidden` and layered behind content via a `z-index` split (glow at 0, content children at 1). A `prefers-reduced-motion` block disables the float, the badge pulse, and all hover transforms.

The new hero reuses `BalanceCard` verbatim as its centerpiece — it already renders the colorful `#6366f1→#8b5cf6→#ec4899` gradient with the wallet balance and its own Add Funds/Withdraw buttons — and adds two scoped quick-action buttons (Create Group, Join with Code). All four inputs are live: `balance` and `currency` from `useWallet()`, `deposit` wired straight to `AddFundsModal`'s `onDeposit`, and the group actions reuse the page's existing `isCreateOpen`/`isJoinOpen` modal state.

Responsive layout is mobile-first single-column down to 375px using `minmax(0,1fr)` grids and `flex-wrap` quick actions, then steps up at the exact `640px` (2-col) and `992px` (3-col, hero becomes `2fr 1fr`) breakpoints, with `clamp()` fluid padding and gaps so nothing overflows.

Touch targets are enforced by two scoped selectors — `.dashboard-root .btn` and `.dashboard-groups-grid .card a, .card button` — both set to `min-height/min-width: 44px`. They cover the PageHeader buttons, hero quick actions, the "Cast Votes Now" button, and GroupCard's raw `<Link>`/copy-code `<button>` without touching any other page, since every selector is rooted in a dashboard-only class.

<details>
<summary>Issues (0)</summary>

No blocking or actionable findings. The implementation satisfies every requirement, the hero is wired to live hook data, the build passes (exit 0), and the two deviations from the literal plan (`isolation:isolate` removal, no `GroupContext`) are deliberate and behavior-preserving — detailed below.

</details>

<details>
<summary>Details</summary>

### Stacking-context deviation on `.dashboard-root`

The plan specified `isolation:isolate` on `.dashboard-root`, but the implementation drops it and keeps only `position: relative`. This is the correct call, and it's load-bearing rather than cosmetic. `Modal.jsx` renders its `.modal-overlay` inline (no portal), so when any dashboard modal opens the overlay is a direct child of `.dashboard-root`. The overlay relies on `position: fixed; z-index: 50` (from `index.css`) to paint above the app's sticky sidebar (`z-index: 46`) and its mobile backdrop (`z-index: 45`). `isolation:isolate` would create a stacking context on the root that traps the modal: the entire root context drops into the page's `z-index: 0` layer, so the sidebar (46) and backdrop (45) would paint above the modal (50) and the dialog would render behind the sidebar. Removing `isolation:isolate` lets the modal compete at the root level exactly as it does on every other page, while the glow layering is unaffected — the pseudo-elements stay at `z-index: 0` below the `z-index: 1` content, both clipped by `overflow: hidden`. [confirmed — verified against `Modal.jsx`, `index.css`, and the Sidebar z-index claims in the verification note]

A companion carve-out makes this safe: `.dashboard-root > *:not(.modal-overlay) { position: relative; z-index: 1 }` lifts content above the glow but explicitly excludes `.modal-overlay` so it keeps its `position: fixed; z-index: 50`. A blanket `>*` rule would have overridden the overlay's positioning at equal specificity (dashboard.css bundles after index.css) and broken it. [confirmed]

### Hero data wiring (no hardcoding, no GroupContext)

The hero consumes only live data. `useWallet()` returns `balance` (`wallet?.balance || 0`), `currency` (`wallet?.currency || 'USD'`), and `deposit(amount, paymentMethod)` — the last also triggers an internal `fetchWallet()` refresh, so the hero balance updates immediately after a deposit. `BalanceCard` receives `balance` and `currency={user?.defaultCurrency || currency}` (preferring the user's default currency for symbol consistency with the existing stat card), with `onAddFunds` opening `AddFundsModal` and `onWithdraw` routing to `/wallet` (the dashboard has no withdraw modal — routing there is the real behavior, not a stub). `AddFundsModal`'s `onDeposit(amount, method)` signature matches `deposit(amount, paymentMethod)` exactly; the same direct pattern already works on `WalletPage`. The Create/Join quick actions reuse the page's existing `isCreateOpen`/`isJoinOpen`/`handleCreateGroup`/`loadData` — no new data wiring. [confirmed — verified against `useWallet.js`, `BalanceCard.jsx`, `AddFundsModal.jsx`]

`GroupContext` is deliberately not consumed. It exposes `groups`/`fetchGroups` but only populates on an explicit `fetchGroups()` call; the page already loads groups itself via `groupService.getUserGroups()` into local state. Switching would add a `useEffect` and risk behavior change for a presentation-only task, so the plan kept the proven local-fetch path. The requirement to wire the hero to existing data (not hardcode) is satisfied through `useWallet` plus the existing local groups state. [confirmed — per the plan's explicit decision]

### Responsive layout and the 375px no-scroll guarantee

The grids are mobile-first `minmax(0, 1fr)` single-column at base, which is what prevents horizontal overflow at 375px — `minmax(0,1fr)` lets a grid track shrink below its content's intrinsic width, unlike `1fr` alone. The quick-action row uses `flex-wrap` with `flex: 1 1 160px`, so the two buttons sit side-by-side at 375px and wrap rather than overflow. `clamp()` drives both the root padding (`clamp(1rem, 3vw, 2rem)`) and grid gaps. The exact `@media (min-width: 640px)` and `@media (min-width: 992px)` breakpoints step the stat and group grids to 2 then 3 columns, flip the hero to `2fr 1fr` at 992px, and have the third stat card span the row (`grid-column: 1 / -1`) at 640px so the 2-column layout doesn't leave a lone half-width card. [confirmed — read directly from `dashboard.css`]

### Touch-target scoping

All tap-target rules are scoped under dashboard-only classes so they cannot leak to Wallet/Approvals/Settings pages (Vite bundles imported CSS globally, so an unscoped `.card`/`.btn` rule would affect every page). `.dashboard-root .btn` covers the PageHeader action buttons, the hero quick actions (which carry `.btn .hero-quick-action`), and the `btn-sm` "Cast Votes Now" button. `.dashboard-groups-grid .card a` and `.card button` target GroupCard's "Open Group Wallet" `<Link>` (an `<a>`) and copy-code `<button>` — confirmed those are the actual elements `GroupCard.jsx` renders — bumping them to 44×44 without modifying `GroupCard.jsx` itself. [confirmed]

One touch target is intentionally not enlarged: `BalanceCard`'s own Add Funds/Withdraw buttons are raw `<button>` elements (not `.btn`), so the `.dashboard-root .btn` rule doesn't reach them. They're a pre-existing reused component left unchanged per the plan, and render near the 44px threshold via their `0.75rem` vertical padding. [likely — height is a rendering estimate; the component is unchanged and out of scope for a presentation-only diff that reuses it verbatim]

</details>

<details>
<summary>File map</summary>

- `client/src/styles/dashboard.css` (new) — gradient panel, animated ambient glows, glass stat cards, pulsing badge, scoped touch targets, responsive grid breakpoints, reduced-motion block. Self-contained; all selectors rooted in dashboard-only classes.
- `client/src/pages/DashboardPage.jsx` (edited) — CSS import, `useNavigate`/`BalanceCard`/`AddFundsModal` imports, `useWallet` destructure now pulls `currency`/`deposit`, `dashboard-root` wrapper, new `dashboard-hero` section, class swaps on the approvals banner / stat grid / groups header / groups grid, `pending-vote-badge`, mounted `AddFundsModal`. No services/contexts/backend touched.

Full diff: not available as a git diff — the workspace is not a git repository (no `.git`), so this review was produced by reading the changed files directly against the plan and the surrounding source.

</details>
