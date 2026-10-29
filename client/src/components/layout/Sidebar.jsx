import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, CheckSquare, Settings, LogOut, WalletCards } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, user } = useAuth();
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  return <>
    {isOpen && <button className="app-sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`app-sidebar${isOpen ? ' app-sidebar--open' : ''}`}>
      <div>
        <Link className="app-sidebar__brand" to="/" onClick={onClose}>
          <span className="app-sidebar__mark"><WalletCards size={20} /></span>
          <span>Walleto</span>
        </Link>
        <p className="app-sidebar__caption">Workspace</p>
        <nav className="app-nav" aria-label="Main navigation">
          {navItems.map(({ name, path, icon: Icon }) => <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onClose}
            className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{name}</span>
          </NavLink>)}
        </nav>
      </div>

      <div className="app-sidebar__profile">
        <div className="app-sidebar__user">
          <span className="app-sidebar__avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
          <span style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-main)', fontSize: '.84rem' }}>{user?.name || 'Your account'}</strong>
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: '.72rem' }}>{user?.email}</span>
          </span>
        </div>
        <button className="app-sidebar__logout" onClick={logout}>
          <LogOut size={16} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  </>;
};

export default Sidebar;
