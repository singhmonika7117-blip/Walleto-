import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const routeTitles = [
  { path: '/', title: 'Dashboard', exact: true },
  { path: '/wallet', title: 'Wallet' },
  { path: '/approvals', title: 'Approvals' },
  { path: '/settings', title: 'Settings' },
  { path: '/groups/', title: 'Group details' }
];

const Navbar = ({ onToggleSidebar, unreadCount = 0 }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const pageTitle = routeTitles.find((route) => route.exact ? pathname === route.path : pathname.startsWith(route.path))?.title || 'Walleto';

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('walleto-theme', nextTheme);
    setTheme(nextTheme);
  };

  return <header className="app-topbar">
    <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
      <button className="app-icon-button app-menu-button" onClick={onToggleSidebar} aria-label="Open navigation">
        <Menu size={19} />
      </button>
      <span className="app-topbar__title">{pageTitle}</span>
    </div>
    <div className="app-topbar__actions">
      <button className="app-icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <Link to="/approvals" className="app-icon-button" aria-label={`Approvals${unreadCount ? `, ${unreadCount} unread` : ''}`}>
        <Bell size={18} />
        {unreadCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: 18, height: 18, padding: '0 4px', display: 'grid', placeItems: 'center', borderRadius: 99, color: '#fff', background: '#d85959', border: '2px solid var(--bg-main)', fontSize: '.62rem', fontWeight: 800 }}>{unreadCount}</span>}
      </Link>
      <Link to="/settings" className="app-topbar__avatar" aria-label="Open settings">
        {user?.name?.charAt(0).toUpperCase() || 'U'}
      </Link>
    </div>
  </header>;
};

export default Navbar;
