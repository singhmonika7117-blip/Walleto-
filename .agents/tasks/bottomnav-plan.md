# Implementation Plan — Mobile-first Bottom Navigation Bar (Split app)

Role: Senior React UI/UX Specialist. Presentation + app-shell only — no services,
contexts' logic, backend, or other pages' functionality are touched. All edits are
in place (no worktree). Use forward slashes in paths. PowerShell: chain with `;`,
never `&&`.

## Grounding (read from the actual repo)

- **`lucide-react` is already a dependency** (`"lucide-react": "^0.395.0"` in
  `client/package.json`). Do NOT install anything. Use the installed package. (If
  — and only if — `npm run build` reports an unresolved import for `lucide-react`,
  run `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm install lucide-react@0.395.0`
  to pin to the existing range. This is a fallback, not the default path.)
- **Real authenticated routes** in `client/src/App.jsx`:
  - `/` → DashboardPage
  - `/groups/:id` → GroupDetailPage
  - `/wallet` → WalletPage
  - `/approvals` → ApprovalsPage
  - `/settings` → SettingsPage
  - `/auth` → `<Navigate to="/" replace />`
  - `*` → `<Navigate to="/" replace />`
- **Authenticated layout shell** (the second `return` in `AppLayout`, rendered only
  when `isAuthenticated`):
  ```
  <div className="app-container">
    <Sidebar ... />
    <div className="main-content">
      <Navbar ... />            // position: sticky; top: 0; z-index: 40
      <main className="page-wrapper"><Routes>...</Routes></main>
      <Footer />
    </div>
  </div>
  ```
  `.main-content` is the shared authenticated content column (Navbar + page +
  Footer). It is the single correct element to pad so the fixed bar never covers
  page content *or* the Footer. Do not pad `.page-wrapper` alone (the Footer is
  its sibling and would be hidden), and never pad every element.
- **`dashboard.css` is globally bundled**: it is statically imported by
  `DashboardPage.jsx`, which is statically imported by `App.jsx`, so its rules are
  emitted into the main `index-*.css` and load on every authenticated route. That
  means `.bottom-nav*` styles and the `.main-content` padding appended here apply
  on `/wallet`, `/approvals`, `/settings`, `/groups/:id` too — not just the
  dashboard. (Confirmed by the prior glassmorphism task's verification: the CSS
  bundle grew and `.dashboard-root`/`floatGlow` landed in `dist/assets/index-*.css`.)
- **Design tokens** in `client/src/index.css` to reuse: `--primary-gradient`
  (`linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)`) for the active accent pill,
  `--primary` (`#6366f1`), `--text-muted`, `--text-main`, `--glass-border-subtle`,
  `--radius-full`, `--radius-md`, `--font-family`.
- **Stacking context** to respect: Navbar `z-index: 40`, Sidebar mobile backdrop
  `z-index: 45`, Sidebar `z-index: 46`, modal overlay `z-index: 50`. Set the bottom
  nav `z-index: 40` (matches Navbar, sits below the sidebar/backdrop so the mobile
  sidebar correctly covers it when open, and well below modals).

## Decision — the "Groups" tab gap (recorded, not stalling)

The user's authoritative request lists 5 tabs including **Groups → `/groups`**.
But `App.jsx` has **no `/groups` index route** (only `/groups/:id`), and the desktop
Sidebar has no Groups item. Adding a Groups landing page/route is out of scope
(presentation + app-shell only; do not add pages, services, or backend).

Resolution (reasonable assumption): include all 5 tabs as requested, point the
Groups tab at `/groups` (the literal requested path), and use **prefix matching**
for active state so `/groups/:id` highlights the Groups tab. Document for the
reviewer that `/groups` has no landing route today, so tapping Groups from
elsewhere hits the `*` catch-all and redirects to `/` — this is a pre-existing
app-shell limitation, not something this task introduces or fixes. Do **not**
create a new route or page. This honors the explicit 5-tab request while staying
in scope.

---

- [ ] 1. **Create `BottomNav.jsx` and wire it into `App.jsx`** so the build actually bundles and type-checks the component (an un-imported file is never parsed by Vite, so the component must be imported for real verification).
      Files:
      - CREATE `c:/Users/ASPIRE/OneDrive/Desktop/split-app/client/src/components/layout/BottomNav.jsx`
      - EDIT `c:/Users/ASPIRE/OneDrive/Desktop/split-app/client/src/App.jsx`

      Component spec (`BottomNav.jsx`) — match the existing layout-component style (see `Navbar.jsx`/`Sidebar.jsx`: `import React from 'react'`, named `lucide-react` icons, react-router `Link`/`useLocation`, `export default`):
      - `import React from 'react';`
      - `import { Link, useLocation } from 'react-router-dom';`
      - `import { LayoutDashboard, Users, Bell, Wallet, Settings } from 'lucide-react';` (already installed — see grounding; these match existing icon usage: `LayoutDashboard`/`Wallet`/`Settings` from Sidebar, `Bell`/`Wallet` from Navbar).
      - A `navItems` array of 5 entries, each `{ name, path, icon, match, end }`. Paths adapted to the **actual** routes above:
        - Dashboard → path `/`, match `/`, end `true` (so the Dashboard tab is active only on exactly `/`, never on every route).
        - Groups → path `/groups`, icon `Users`, match `/groups`, end `false`.
        - Approvals → path `/approvals`, icon `Bell`, match `/approvals`, end `false`.
        - Virtual Wallet → path `/wallet`, icon `Wallet`, match `/wallet`, end `false`.
        - Profile/Settings → path `/settings`, icon `Settings`, match `/settings`, end `false`.
      - Component `BottomNav` uses `const { pathname } = useLocation();` and an `isActive(item)` helper: `item.end ? pathname === item.match : pathname === item.match || pathname.startsWith(item.match + '/')`. The `+ '/'` guard prevents `/` matching every path and `/groups` matching unrelated paths.
      - Render `<nav className="bottom-nav" aria-label="Primary">` wrapping the 5 items. Each item is a real `<Link to={item.path}>` (NOT a button) with:
        - `aria-label={item.name}` and `aria-current={active ? 'page' : undefined}`.
        - `className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}`.
        - Inside: `<span className="bottom-nav__icon"><Icon size={20} strokeWidth={active ? 2.4 : 2} /></span>` then `<span className="bottom-nav__label">{item.name}</span>`.
      - `export default BottomNav;`
      - Do NOT use inline styles here — all visual styling lives in the appended CSS section (item 2), per the scoping requirement. Use classNames only.

      App.jsx edit (minimal, surgical):
      - Add `import BottomNav from './components/layout/BottomNav';` with the other layout imports (after the `Footer`/`ProtectedRoute` import block is fine).
      - Render `<BottomNav />` **inside the authenticated `return`** (the `if (!isAuthenticated)` branch must NOT get it — that branch renders only `/auth`). Place it inside `.app-container`, as the last child **after** the `.main-content` div:
        ```
        <div className="app-container">
          <Sidebar ... />
          <div className="main-content"> ... </div>
          <BottomNav />
        </div>
        ```
      - Do NOT remove, reorder, or edit any `<Route>`, provider, or existing component. Do NOT touch the `if (!isAuthenticated)` branch. Navbar/Sidebar behavior stays intact (Sidebar = desktop drawer, BottomNav = mobile counterpart; CSS hides each appropriately).

      Verify: `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm run build` → exit 0, no "unresolved import" / "is not exported" errors (confirms `BottomNav`, the `lucide-react` icons, and `react-router-dom` all resolve and the JSX is valid). The bar will render unstyled until item 2; that is expected and build-safe.

- [ ] 2. **Append** the scoped bottom-nav glassmorphism section to the **END** of `dashboard.css`. APPEND ONLY — do not overwrite, reformat, or remove any existing rule (the glassmorphism rules from the prior task must remain byte-identical). All new selectors are scoped under `.bottom-nav*` except the one sanctioned `.main-content` padding rule.
      Files: EDIT (append to end of) `c:/Users/ASPIRE/OneDrive/Desktop/split-app/client/src/styles/dashboard.css`

      Append exactly this block (scoped; reuses `index.css` tokens):
      ```css

      /* =========================================================================
         Bottom Navigation Bar — mobile/tablet only (<=768px)
         Appended section. Scoped under .bottom-nav* (plus one .main-content
         bottom-padding rule so authenticated content clears the fixed bar).
         All prior glassmorphism rules above are preserved unchanged.
         ========================================================================= */

      .bottom-nav {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 40; /* matches Navbar; below sidebar backdrop (45) + sidebar (46) + modal (50) */
        display: flex;
        align-items: stretch;
        justify-content: space-around;
        gap: 0.25rem;
        padding: 0.5rem 0.5rem calc(0.5rem + env(safe-area-inset-bottom));
        background: rgba(255, 255, 255, 0.9);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        border-top: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -6px 24px -4px rgba(15, 23, 42, 0.12), 0 -2px 8px -2px rgba(99, 102, 241, 0.08);
      }

      .bottom-nav__item {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        min-height: 44px;   /* touch-target minimum */
        min-width: 44px;
        padding: 0.4rem 0.25rem;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-family: var(--font-family);
        font-size: 0.6875rem;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        border-radius: var(--radius-full);
        transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease;
      }

      .bottom-nav__item:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: -2px;
      }

      .bottom-nav__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        transition: background 0.2s ease, transform 0.2s ease;
      }

      .bottom-nav__label {
        font-size: 0.625rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        opacity: 0.85;
      }

      /* Active tab: colorful primary-gradient pill around the icon + pop animation */
      .bottom-nav__item--active {
        color: #ffffff;
      }

      .bottom-nav__item--active .bottom-nav__icon {
        background: var(--primary-gradient);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        animation: bottomNavPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .bottom-nav__item--active .bottom-nav__label {
        color: var(--primary);
        font-weight: 800;
        opacity: 1;
      }

      @keyframes bottomNavPop {
        from { transform: scale(0.85); }
        to   { transform: scale(1); }
      }

      /* Very small screens: keep icon + active label legible, hide inactive labels */
      @media (max-width: 380px) {
        .bottom-nav__item:not(.bottom-nav__item--active) .bottom-nav__label {
          display: none;
        }
      }

      /* Authenticated content + footer clear the fixed bar on mobile/tablet only */
      @media (max-width: 768px) {
        .main-content {
          padding-bottom: 80px;
        }
      }

      /* Hide the bottom navbar on desktop */
      @media (min-width: 769px) {
        .bottom-nav {
          display: none;
        }
      }

      /* Accessibility: respect reduced motion for the pop animation */
      @media (prefers-reduced-motion: reduce) {
        .bottom-nav__item--active .bottom-nav__icon {
          animation: none;
        }
        .bottom-nav__item,
        .bottom-nav__icon {
          transition: none;
          transform: none;
        }
      }
      ```
      Notes for the implementer:
      - The bar is shown by default (`display: flex`) and hidden on desktop via `@media (min-width: 769px) { .bottom-nav { display: none; } }` — i.e. visible at <=768px, hidden at >=769px, exactly as specified.
      - The `.main-content { padding-bottom: 80px }` rule is the one non-`.bottom-nav*` selector; it is sanctioned by the brief ("scope this to a main-content container class"). It targets the shared authenticated column that wraps Navbar + `page-wrapper` + Footer, so both page content and the Footer clear the fixed bar. Scoped to `@media (max-width: 768px)` so desktop is unaffected. Because `dashboard.css` is globally bundled (see grounding), this applies on every authenticated route.
      - `z-index: 40` keeps the bar below the mobile sidebar backdrop (45), sidebar (46), and modals (50) so they correctly paint above it.

      Verify: `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm run build` → exit 0. Then confirm the new CSS actually landed in the bundle: the emitted `dist/assets/index-*.css` must contain `.bottom-nav` and `bottomNavPop` (e.g. `Select-String -Path dist/assets/index-*.css -Pattern 'bottom-nav','bottomNavPop'` returns matches), and the CSS bundle size grew versus the prior `~11.10 kB` baseline from the glassmorphism task.

- [ ] 3. **Final verification + record evidence** for the reviewer.
      Files: none changed — this is verification and evidence capture.

      From PowerShell:
      - Run `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm run build`. Capture and record: the exact command, exit code (must be 0), and the emitted bundle sizes printed by Vite (compare the CSS bundle to the prior `~11.10 kB` baseline — it should be larger now that `.bottom-nav*` is included).
      - Confirm `dashboard.css` was **appended, not overwritten**: the file must still begin with the original `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans...')` line and still contain the original `.dashboard-root`, `.dashboard-hero`, `.dashboard-stat-card`, `.pending-vote-badge`, `@keyframes pulsePending`, `@keyframes floatGlow`, and the `@media (min-width: 640px)` / `992px` blocks unchanged; the `.bottom-nav*` block must appear only once, at the very end.
      - Confirm the desktop-hide rule exists: `@media (min-width: 769px) { .bottom-nav { display: none; } }`.
      - Confirm `<BottomNav />` is imported in `App.jsx` with `'./components/layout/BottomNav'` and rendered inside the authenticated `.app-container` (the `isAuthenticated` branch), not inside the `/auth` branch and not inside any `<Route>`.
      - State exactly what was verified and what could NOT be auto-verified. Visual/active-route behavior cannot be verified by the build — recommend manual browser QA: at 375px width the bar is visible, glassmorphic, content/ footer clear it, and the active tab shows the gradient pill + pop; at >=769px the bar is hidden.
      - Write this evidence where the reviewer can read it (e.g. append a short "Bottom nav verification" section to `c:/Users/ASPIRE/OneDrive/Desktop/split-app/.agents/tasks/verification.md` or a new `bottomnav-verification.md` in the same folder), including: build command, exit code, bundle sizes, the append-not-overwrite confirmation, and the browser-QA recommendation.

      Verify: `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm run build` → exit 0; and the evidence file exists with the recorded command, exit code, and bundle sizes.

---

## Notes for the implementing coder

- **Do not install** `lucide-react` — it is already in `client/package.json` (`^0.395.0`). Only install as a fallback if the build fails to resolve it, and if so pin to `0.395.0`.
- **APPEND only** to `dashboard.css`. Never overwrite or reformat existing rules.
- **Scope** all new CSS under `.bottom-nav*` except the one sanctioned `.main-content` padding rule. Nothing leaks to generic classes (`.card`, `.btn`, `.badge`, grids).
- **Presentation + app-shell only.** Do not touch services, contexts' logic, backend, or other pages' functionality. Do not add new routes or pages (the `/groups` landing gap is documented above and intentionally left as-is).
- **Match existing JSX/code style**: `import React from 'react'`; named `lucide-react` imports; react-router `Link`/`useLocation`; `export default`. Use classNames (not inline styles) for the bottom nav so all its styling lives in `dashboard.css`.
- **PowerShell chaining**: use `;` not `&&` (e.g. `cd c:/Users/ASPIRE/OneDrive/Desktop/split-app/client; npm run build`).
