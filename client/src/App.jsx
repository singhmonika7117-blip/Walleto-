import React, { useState, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { NotificationProvider, NotificationContext } from './context/NotificationContext';

// Layout & Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import GroupDetailPage from './pages/GroupDetailPage';
import WalletPage from './pages/WalletPage';
import ApprovalsPage from './pages/ApprovalsPage';
import SettingsPage from './pages/SettingsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Authenticated Layout Wrapper
const AppLayout = () => {
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          unreadCount={unreadCount}
        />
        <main key={location.pathname} className="page-wrapper">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <GroupProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </NotificationProvider>
      </GroupProvider>
    </AuthProvider>
  );
}

export default App;
