# Task: Add a mobile-first Bottom Navigation Bar to the Split app

Role: Senior React UI/UX Specialist.

## Goal
Add a modern, mobile-first Bottom Navigation Bar component to the Split application, style it with glassmorphism, and integrate it into the App shell so it stays persistent across authenticated routes. Presentation + app-shell only.

## Project context (workspace root: c:\Users\ASPIRE\OneDrive\Desktop\split-app, Windows/PowerShell)
- React + Vite client app in `client/`. Entry: `client/src/main.jsx`; app shell: `client/src/App.jsx`.
- READ `client/src/App.jsx` first to confirm the routing setup (react-router: Routes/Route, providers, which routes exist and their exact paths). Adapt the tab paths below to the ACTUAL route paths found in App.jsx if they differ.
- Layout components live in `client/src/components/layout/` (Navbar.jsx, Sidebar.jsx, PageHeader.jsx, Footer.jsx) — add BottomNav.jsx here, match the existing file/code style.
- Common UI in `client/src/components/common/`: Button.jsx, Card.jsx, etc. Reuse where sensible.
- `client/src/styles/dashboard.css` ALREADY EXISTS (created by a prior glassmorphism task). It contains scoped dashboard classes (`.dashboard-root`, `.dashboard-hero`, `.dashboard-stat-grid`, `.dashboard-groups-grid`, `.dashboard-stat-card`, `.dashboard-approvals-banner`, `.pending-vote-badge`, etc.), a Plus Jakarta Sans `@import`, gradient background, glassmorphic hover cards, keyframe pulse, floating glows, and responsive breakpoints at 640px and 992px (mobile-first to 375px). Vite bundles CSS globally, so all new bottom-nav styles MUST be scoped under bottom-nav-specific classNames (e.g. `.bottom-nav`, `.bottom-nav__item`, `.bottom-nav__item--active`, `.bottom-nav__icon`, `.bottom-nav__label`) to avoid leaking onto other pages. DO NOT restyle generic classes unscoped.
- Build/run via npm in `client/` (`npm run build`). Use `;` not `&&` if chaining in PowerShell.

## TASK 1 — Create `client/src/components/layout/BottomNav.jsx`
- A fixed bottom navigation bar visible ONLY on mobile/tablet viewports (CSS handles visibility via `@media (max-width: 768px)`; desktop hides it).
- Five navigation tabs with clean icons (use `lucide-react` — check `client/package.json`; if `lucide-react` is already a dependency, use it; if NOT, install it with a pinned latest version, e.g. `npm install lucide-react@<latest>` from `client/`, then use it. Fallback only if install is impossible: inline SVG icons). Tab definitions (adapt paths to actual App.jsx routes):
  - Dashboard / Home -> `/dashboard` (icon: LayoutDashboard or Home)
  - Groups -> `/groups` (icon: Users or UsersRound)
  - Approvals / Requests -> `/approvals` (icon: Bell or CheckCircle or Inbox)
  - Virtual Wallet -> `/wallet` (icon: Wallet)
  - Profile / Settings -> `/settings` (icon: Settings or User)
- Active route detection: use react-router's `useLocation` to determine the current path and highlight the matching tab; use `Link` (or `useNavigate`) for navigation. Handle nested/child routes so a tab is active when its route prefix matches.
- Highlight the active tab with a colorful primary accent pill and a subtle pop animation (reuse the app's primary accent color/gradient tokens; the pop animation is a quick scale pop on activation).
- Accessibility: each tab is a real link with `aria-label`/`aria-current="page"` on active; ensure 44x44px minimum tap targets.

## TASK 2 — Append bottom-nav styles to `client/src/styles/dashboard.css` (APPEND, do not overwrite)
- IMPORTANT: This file already has content from the glassmorphism task. READ it first, then APPEND the new bottom-nav section at the END. Preserve ALL existing rules exactly. Do not reformat or remove existing styles.
- Style the bottom bar with glassmorphism: `backdrop-filter: blur(16px)` (with `-webkit-backdrop-filter` fallback), `background: rgba(255, 255, 255, 0.9)`, rounded top corners (e.g. `border-radius: 20px 20px 0 0`), and a light elevation box-shadow.
- Fixed position at the bottom, full width, safe-area aware (`padding-bottom: env(safe-area-inset-bottom)`).
- Add `padding-bottom: 80px` (or enough to clear the ~64-72px tall bar + safe area) to main page containers so content isn't hidden behind the fixed bar on phones. Scope this to a main-content container class — prefer adding it to the existing main content wrapper used across pages; if pages use a shared container, target that. Do not blindly add 80px padding to every element. If a shared main container class doesn't exist, apply it to `.dashboard-root` and document that other pages may need the same. Verify against App.jsx's actual layout structure.
- Hide the bottom navbar on desktop: `@media (min-width: 769px) { .bottom-nav { display: none; } }` and the bar is shown by default for `@media (max-width: 768px)`. Ensure the active-route pill pop animation keyframe is defined and prefers-reduced-motion disables it.
- Active tab pill: colorful primary gradient/ accent background, rounded pill, subtle pop animation keyframe (e.g. `@keyframes bottomNavPop { from { transform: scale(0.85); } to { transform: scale(1); } }`), active label visible; inactive labels can be hidden on very small screens if needed but keep at least the icon + active label legible.

## TASK 3 — Update `client/src/App.jsx`
- Render `<BottomNav />` inside the main router container so it stays persistently visible across all authenticated routes. Place it outside individual `<Route>` elements but inside the authenticated layout/router wrapper so it doesn't show on the login/auth page. Confirm against the actual App.jsx structure (e.g. inside a ProtectedRoute/layout wrapper, after the Routes).
- Import the component: `import BottomNav from './components/layout/BottomNav';` (adjust relative path to App.jsx location if needed).
- Do not remove or reorder existing routes/providers. Keep Sidebar/Navbar behavior intact (Sidebar is presumably a desktop sidebar; BottomNav is the mobile counterpart — that's fine, CSS hides each appropriately).

## Verification (REQUIRED)
- From `client/`: run `npm run build` (PowerShell). Confirm it compiles with no errors. If lucide-react was installed, confirm it resolves.
- Confirm BottomNav.jsx exists, is imported in App.jsx, and rendered inside the authenticated layout.
- Confirm dashboard.css was appended (not overwritten) — existing glassmorphism rules intact AND new `.bottom-nav*` rules present; desktop hides it via `@media (min-width: 769px)`.
- State exactly what was verified. Note: visual/active-route behavior cannot be auto-verified; recommend browser QA at 375px (bar visible + content clears it) and at >=769px (bar hidden).

## Constraints
- Presentation + app-shell only. Do not touch services, contexts' logic, backend, or other pages' functionality.
- APPEND to dashboard.css; never overwrite existing styles. Scope all new CSS under `.bottom-nav*`.
- If lucide-react is not installed, installing it is acceptable (well-known, maintained package); pin the version.
- Match existing JSX/code style. Edit in place (no worktree). Use forward slashes in paths.
