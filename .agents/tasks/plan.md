# Implementation Plan — Glassmorphic Ultra-Responsive Dashboard

Frontend UI/UX enhancement for the Split app. Two files only: create `client/src/styles/dashboard.css` and edit `client/src/pages/DashboardPage.jsx`. No services, contexts, or backend touched. All new CSS is scoped under dashboard-specific classNames so it cannot leak to other pages (Vite bundles imported CSS globally, so generic-class rules are forbidden).

Verification command (run from `client/`): `npm run build` (runs `vite build`). Baseline confirmed passing. Expected after changes: build completes with exit code 0 and no new warnings/errors beyond the existing baseline output. There is no test runner configured (no test script in `client/package.json`), so the production build is the verification gate. Optionally `npm run dev` to eyeball at 375px / 640px / 992px widths, but build is the required check.

---

## (a) Exact classNames ↔ JSX className hooks (CSS and JSX must line up)

CSS is defined in `dashboard.css`; JSX in `DashboardPage.jsx` applies these exact classNames. All rules are scoped so they only affect the dashboard.

| Class | Defined in CSS as | Applied in JSX on |
|---|---|---|
| `dashboard-root` | outer dashboard panel: gradient bg, Plus Jakarta Sans, floating-glow `::before`/`::after`, `position:relative; isolation:isolate; overflow:hidden; border-radius:var(--radius-xl); padding:clamp(1rem,3vw,2rem)` | outermost returned `<div>` (replace the current classless `<div>`) |
| `dashboard-hero` | hero grid; base 1 col, ≥992px `grid-template-columns: 2fr 1fr`; gap `clamp(1rem,2.5vw,1.5rem)` | new `<section className="dashboard-hero">` inserted right after `<PageHeader/>` |
| `hero-quick-actions` | `display:flex; flex-wrap:wrap; gap:clamp(.5rem,1.5vw,.75rem)` | `<div className="hero-quick-actions">` inside the hero, holding the quick-action buttons |
| `hero-quick-action` | button tile: `flex:1 1 160px; min-height:44px; min-width:44px;` | passed via `className="hero-quick-action"` to the Create/Join `Button` components (Button forwards `className`) |
| `dashboard-approvals-banner` | glassmorphic warning-tinted banner; replaces the current inline `style` (bg/border/shadow/padding/gap moved here); `flex-wrap:wrap` | the pending-approvals `<div>` (drop its inline `style`, keep inner inline styles) |
| `pending-vote-badge` | infinite `pulsePending` keyframe animation (scale + warning glow) | a new `<Badge variant="warning" className="pending-vote-badge">{pendingApprovals.length}</Badge>` placed inside the banner |
| `dashboard-stat-grid` | responsive grid (see (e)); replaces `grid-3` for stat cards | the wrapper `<div>` around the three metric `<Card>`s (drop inline `marginBottom`; CSS adds `margin-block`) |
| `dashboard-stat-card` | glassmorphic hover: semi-transparent bg, `backdrop-filter:blur(12px)`, thin rgba border, soft shadow, hover lift + brighter glow | passed via `className="dashboard-stat-card"` to each of the three metric `<Card>`s (Card forwards `className`; keep their inline layout styles) |
| `dashboard-section-header` | `flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:.75rem` | the "Your Split Groups" header `<div>` (drop inline flex, keep text) |
| `dashboard-groups-grid` | responsive grid (see (e)); replaces `grid-3` for groups | the `<div>` wrapping `groups.map(...)` |

Touch-target enforcement (scoped, no new JSX needed for these):
- `.dashboard-root .btn { min-height:44px; min-width:44px; }` — covers PageHeader buttons, hero quick actions (`btn btn-primary/secondary hero-quick-action`), and the "Cast Votes Now" `btn-sm`.
- `.dashboard-groups-grid .card a, .dashboard-groups-grid .card button { min-height:44px; min-width:44px; }` — bumps GroupCard's "Open Group Wallet" `<Link>` and copy-code `<button>` (these are raw elements, not `.btn`; inline padding stays, only height is added, so no other page is affected because the selector is scoped under `.dashboard-groups-grid`). GroupCard.jsx is NOT modified.

Never target generic `.card`, `.btn`, `.badge`, `.grid-3`, or `.badge-warning` unscoped in `dashboard.css` — they are used on other pages and would leak.

## (b) Data shape consumed by the hero (exact field names, read from source)

`useWallet()` (in `client/src/hooks/useWallet.js`) returns:
- `balance` → `wallet?.balance || 0` (number)
- `currency` → `wallet?.currency || 'USD'` (string)
- `deposit` → `async (amount, paymentMethod) => res` (matches `AddFundsModal`'s `onDeposit(amount, method)` signature exactly; also triggers an internal `fetchWallet()` refresh so the hero balance updates automatically after deposit)

`useAuth().user` (already destructured in DashboardPage) returns:
- `user?.name` (string) — already used for the PageHeader greeting
- `user?.defaultCurrency` (string) — already used by the existing stat card via `formatCurrency(balance, user?.defaultCurrency)`

Decision: the hero shows the personal virtual wallet (the funds that feed shared group pools) — this is the dashboard's genuine wallet data and is what `BalanceCard` is built to display. For currency consistency with the existing stat card, pass `currency={user?.defaultCurrency || currency}` to both `BalanceCard` and `AddFundsModal` (prefers the user's default, falls back to the wallet hook's currency, then 'USD'). This keeps the hero and the stat card showing the same symbol.

`GroupContext` exposes `{ groups, currentGroup, fetchGroups, createNewGroup, joinExistingGroup, ... }` and is mounted globally, but its `groups` array is NOT auto-populated — it only fills when `fetchGroups()` is called. Decision: do NOT switch DashboardPage to GroupContext. The page already fetches groups itself via `groupService.getUserGroups()` into local `groups` state (proven, working). Switching would add a `useEffect` to call `fetchGroups()` and risk behavior change for a presentation-only task. The hero's group quick actions (Create/Join) reuse the existing local modal state (`isCreateOpen`/`isJoinOpen`) and `handleCreateGroup`/`loadData` — no new data wiring needed for groups. This keeps the change minimal and faithful.

## (c) Existing components reused in the hero (and how)

- `BalanceCard` (`client/src/components/wallet/BalanceCard.jsx`) — the hero centerpiece. It is already a colorful gradient (`#6366f1→#8b5cf6→#ec4899`) glass card with built-in "Add Funds" and "Withdraw" buttons. Render it as:
  ```jsx
  <BalanceCard
    balance={balance}
    currency={user?.defaultCurrency || currency}
    onAddFunds={() => setIsAddFundsOpen(true)}
    onWithdraw={() => navigate('/wallet')}
  />
  ```
  This reuses the existing component verbatim (no edits to BalanceCard). "Add Funds" satisfies the "Add Funds" quick-action requirement via the card's own button; "Withdraw" routes to the full `/wallet` page (the dashboard has no withdraw modal — routing there is the correct, non-fabricated behavior).
- `AddFundsModal` (`client/src/components/wallet/AddFundsModal.jsx`) — opened by the hero's Add Funds button. Render at the bottom with the other modals:
  ```jsx
  <AddFundsModal
    isOpen={isAddFundsOpen}
    onClose={() => setIsAddFundsOpen(false)}
    onDeposit={deposit}
    currency={user?.defaultCurrency || currency}
  />
  ```
  `onDeposit={deposit}` wires directly to `useWallet().deposit` (same `(amount, method)` signature).
- `Button` (`client/src/components/common/Button.jsx`) — for the group quick actions "Create Group" (primary, `Plus` icon) and "Join with Code" (secondary, `KeyRound` icon), reusing the existing modal openers `setIsCreateOpen(true)` / `setIsJoinOpen(true)`. These are NOT redundant with BalanceCard (which only has wallet actions).
- `Badge` (`client/src/components/common/Badge.jsx`) — `variant="warning" className="pending-vote-badge"` for the pulsing pending-vote count in the approvals banner.

No new components are created. `GroupCard`, `CreateGroupModal`, `JoinGroupModal`, `PageHeader` are reused unchanged as today.

## (d) Ordered edits to DashboardPage.jsx

1. Add CSS import at the top: `import '../styles/dashboard.css';`
2. Update `react-router-dom` import to also pull the hook: `import { Link, useNavigate } from 'react-router-dom';`
3. Add component imports: `import BalanceCard from '../components/wallet/BalanceCard';` and `import AddFundsModal from '../components/wallet/AddFundsModal';` (`Button`, `Badge`, icons `Plus`/`KeyRound`/`Wallet`/`Users`/`CheckSquare`/`ArrowRight`/`BellRing`/`Sparkles` are already imported).
4. In the component body, change `const { balance } = useWallet();` to `const { balance, currency, deposit } = useWallet();`.
5. Add `const navigate = useNavigate();` right after the `useAuth`/`useWallet` lines.
6. Add modal state: `const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);` next to `isCreateOpen`/`isJoinOpen`.
7. Change the outermost returned element from `<div>` to `<div className="dashboard-root">`.
8. Insert the hero section immediately after `<PageHeader .../>` and before the pending-approvals banner:
   ```jsx
   <section className="dashboard-hero">
     <BalanceCard
       balance={balance}
       currency={user?.defaultCurrency || currency}
       onAddFunds={() => setIsAddFundsOpen(true)}
       onWithdraw={() => navigate('/wallet')}
     />
     <div className="hero-quick-actions">
       <Button variant="primary" icon={Plus} onClick={() => setIsCreateOpen(true)} className="hero-quick-action">
         Create Group
       </Button>
       <Button variant="secondary" icon={KeyRound} onClick={() => setIsJoinOpen(true)} className="hero-quick-action">
         Join with Code
       </Button>
     </div>
   </section>
   ```
9. Pending-approvals banner: replace its outer inline `style={{...}}` with `className="dashboard-approvals-banner"` (remove the inline background/border/shadow/padding/gap; CSS governs glass + warning tint + wrap). Keep the inner inline styles (icon circle gradient, text). Add the pulsing badge: insert `<Badge variant="warning" className="pending-vote-badge">{pendingApprovals.length}</Badge>` next to the "…Awaiting Your Vote!" text.
10. Stat cards: change `<div className="grid-3" style={{ marginBottom: '2.5rem' }}>` to `<div className="dashboard-stat-grid">`. Add `className="dashboard-stat-card"` to each of the three `<Card style={{...}}>` (keep their inline layout styles).
11. Groups header: change `<div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>` to `<div className="dashboard-section-header">`.
12. Groups grid: change the `<div className="grid-3">` that wraps `groups.map(...)` to `<div className="dashboard-groups-grid">`.
13. Add the AddFundsModal next to the existing modals (see (c) snippet).

Notes: PageHeader is a shared component with its own inline styles and is left untouched (it already `flexWrap`s on mobile; its buttons get 44px via `.dashboard-root .btn`). GroupCard.jsx is NOT modified — its touch targets are handled by the scoped `.dashboard-groups-grid .card a/button` rule. The empty-state "No groups yet" Card is left as-is (base `.card` is already glass).

## (e) Responsive grid plan (mobile-first, exact breakpoints)

Base (mobile, ≥375px, no media query):
- `.dashboard-stat-grid` and `.dashboard-groups-grid`: `display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(1rem,2vw,1.25rem);` (single column). `minmax(0,1fr)` prevents overflow at 375px.
- `.dashboard-hero`: `display:grid; grid-template-columns:minmax(0,1fr); gap:clamp(1rem,2.5vw,1.5rem);` (balance card stacked above quick actions).
- `.hero-quick-actions`: `flex-wrap:wrap`; each `.hero-quick-action` `flex:1 1 160px` so two buttons sit side-by-side even at 375px and never overflow.
- `.dashboard-root`: `padding:clamp(1rem,3vw,2rem); border-radius:var(--radius-xl); overflow:hidden;` — no horizontal scroll (contents use `minmax(0,1fr)` and `flex-wrap`).

`@media (min-width: 640px)` (tablet):
- `.dashboard-stat-grid`: `grid-template-columns:repeat(2, minmax(0,1fr));` (2 cols; the 3rd stat card wraps to a 2nd row spanning 1 col — acceptable; alternatively the 3rd can span both via `:last-child` `grid-column:1 / -1` to fill the row cleanly — implement the `:last-child` span so the 3-col set looks balanced at 2 cols).
- `.dashboard-groups-grid`: `grid-template-columns:repeat(2, minmax(0,1fr));`
- `.dashboard-hero`: keep 1 col on tablets (balance card full width, quick actions row below) — OR 2 cols if space allows; choose 1 col for readability between 640–991, switch to 2 cols at 992. Implement: hero stays 1 col here.

`@media (min-width: 992px)` (laptop):
- `.dashboard-stat-grid`: `grid-template-columns:repeat(3, minmax(0,1fr));` (and remove the `:last-child` span so all three align in one row).
- `.dashboard-groups-grid`: `grid-template-columns:repeat(3, minmax(0,1fr));`
- `.dashboard-hero`: `grid-template-columns:2fr 1fr;` (balance card takes ~2/3, quick actions panel ~1/3 beside it).

Fluid typography/spacing: use `clamp()` for hero balance size already handled by BalanceCard (keep), and `clamp()` on grid gaps and `.dashboard-root` padding as above. Plus Jakarta Sans base applied via `.dashboard-root { font-family:var(--font-family); }`.

## (f) Verification

From the `client/` directory run:
```
npm run build
```
Expected: Vite production build completes with **exit code 0**, emitting `dist/index.html`, `dist/assets/index-*.css` (now larger — includes the new dashboard styles), and `dist/assets/index-*.js`. No new build errors or unresolved-import errors (confirms the `../styles/dashboard.css`, `BalanceCard`, `AddFundsModal`, and `useNavigate` imports all resolve). There is no test script, so the build is the gate. Optionally run `npm run dev` and manually verify: dashboard renders the colorful hero with balance + quick actions at 375px (single column, no horizontal scroll), 640px (2-col grids), and 992px+ (3-col grids, hero 2-col); pending-vote badge pulses; hover lifts on stat/group cards; and other pages (Wallet, Approvals, Settings) still render unchanged (confirms no CSS leaked).

---

## Ordered implementation checklist

- [ ] 1. Create `client/src/styles/` directory and `client/src/styles/dashboard.css` with: (1) `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');` as the very first line; (2) `.dashboard-root` base (gradient bg, font-family var, `position:relative; isolation:isolate; overflow:hidden; border-radius; padding:clamp()`) plus `::before`/`::after` floating radial-gradient glow pseudo-elements (`position:absolute`, large, `filter:blur(60px)`, `z-index:0`, `pointer-events:none`) animated by `@keyframes floatGlow`/`floatGlowAlt`; (3) `.dashboard-root > * { position:relative; z-index:1; }`; (4) `.dashboard-hero`, `.hero-quick-actions`, `.hero-quick-action`; (5) `.dashboard-stat-grid`, `.dashboard-groups-grid` mobile-first 1-col; (6) `.dashboard-stat-card` glassmorphic hover (semi-transparent bg, `backdrop-filter:blur(12px)` + `-webkit-backdrop-filter`, thin rgba border, soft shadow, hover lift+glow transition); (7) `.dashboard-approvals-banner` glass + warning tint; (8) `.pending-vote-badge` with `@keyframes pulsePending` (scale + warning box-shadow glow, infinite ~2s); (9) `.dashboard-section-header`; (10) scoped touch-target rules `.dashboard-root .btn` and `.dashboard-groups-grid .card a, .dashboard-groups-grid .card button` min 44x44; (11) `@media (min-width:640px)` and `@media (min-width:992px)` blocks per (e); (12) `@media (prefers-reduced-motion: reduce)` disabling the glow/pulse animations and hover transforms.
      Files: client/src/styles/dashboard.css (new)
      Verify: `cd client && npm run build` — build succeeds with exit 0 (CSS parses, no syntax errors).

- [ ] 2. Edit `client/src/pages/DashboardPage.jsx`: add the CSS import, `useNavigate` import, `BalanceCard` + `AddFundsModal` imports; destructure `balance, currency, deposit` from `useWallet`; add `navigate` and `isAddFundsOpen` state; wrap return in `<div className="dashboard-root">`; insert the `dashboard-hero` section with `BalanceCard` + quick-action buttons after `<PageHeader/>`; convert the approvals banner to `className="dashboard-approvals-banner"` and add the `pending-vote-badge` Badge; swap `grid-3`→`dashboard-stat-grid` (+`dashboard-stat-card` on each Card) and `grid-3`→`dashboard-groups-grid`; convert the groups header to `dashboard-section-header`; mount `<AddFundsModal onDeposit={deposit} currency={user?.defaultCurrency || currency} .../>`.
      Files: client/src/pages/DashboardPage.jsx
      Verify: `cd client && npm run build` — exit 0, all new imports resolve, no new errors.

- [ ] 3. Final verification: `cd client && npm run build` — confirm exit 0 and that `dist/assets/index-*.css` is emitted (size grows vs baseline 6.99 kB). No other files changed (only dashboard.css created and DashboardPage.jsx edited). Other pages unaffected.
      Files: (none — verification only)
      Verify: build green; optionally `npm run dev` visual check at 375/640/992px.
