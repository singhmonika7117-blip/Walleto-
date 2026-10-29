import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Bell, Wallet, Settings } from 'lucide-react';

// Tab paths are adapted to the ACTUAL routes defined in App.jsx:
//   "/" (Dashboard), "/groups/:id", "/approvals", "/wallet", "/settings".
// There is no "/groups" index route today; the Groups tab points at "/groups"
// (the literal requested path) and uses prefix matching so "/groups/:id"
// highlights it. See bottomnav-plan.md for the documented gap.
const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, match: '/', end: true },
  { name: 'Groups', path: '/groups', icon: Users, match: '/groups', end: false },
  { name: 'Approvals', path: '/approvals', icon: Bell, match: '/approvals', end: false },
  { name: 'Virtual Wallet', path: '/wallet', icon: Wallet, match: '/wallet', end: false },
  { name: 'Settings', path: '/settings', icon: Settings, match: '/settings', end: false }
];

const BottomNav = () => {
  const { pathname } = useLocation();

  const isActive = (item) =>
    item.end
      ? pathname === item.match
      : pathname === item.match || pathname.startsWith(item.match + '/');

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-label={item.name}
            aria-current={active ? 'page' : undefined}
            className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}
          >
            <span className="bottom-nav__icon">
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="bottom-nav__label">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
