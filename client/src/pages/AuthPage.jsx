import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import { Check, WalletCards } from 'lucide-react';
import '../styles/auth.css';

const AuthPage = () => {
  const { isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return <main className="auth-page">
    <div className="auth-layout">
      <section className="auth-intro">
        <Link className="auth-brand" to="/auth">
          <span className="auth-brand__mark"><WalletCards size={21} /></span>
          <span>Walleto</span>
        </Link>
        <div className="auth-intro__copy">
          <p className="auth-kicker">Money, together</p>
          <h1>Shared plans.<br />Clear costs.</h1>
          <p className="auth-description">Keep group expenses, contributions and decisions in one calm, easy-to-follow place.</p>
        </div>
        <div className="auth-steps" aria-label="How Walleto works">
          <div className="auth-step"><span className="auth-step__number">01</span><span><strong>Make a group</strong><small>For a trip, home or team</small></span><Check size={17} /></div>
          <div className="auth-step"><span className="auth-step__number">02</span><span><strong>Add shared expenses</strong><small>Keep the details together</small></span><Check size={17} /></div>
          <div className="auth-step"><span className="auth-step__number">03</span><span><strong>Decide as a group</strong><small>Everyone knows what is due</small></span><Check size={17} /></div>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel__heading">
          <p className="auth-kicker">{isForgotPassword ? 'ACCOUNT RECOVERY' : isLogin ? 'YOUR WALLET, ORGANIZED' : 'GET STARTED'}</p>
          <h2 id="auth-title">{isForgotPassword ? 'Reset your password' : isLogin ? 'Welcome back' : 'Create your account'}</h2>
          <p>{isForgotPassword ? 'We’ll email you a secure link to choose a new password.' : isLogin ? 'Sign in to pick up where your group left off.' : 'Set up Walleto and start your first group.'}</p>
        </div>
        {isForgotPassword
          ? <ForgotPasswordForm onBack={() => setIsForgotPassword(false)} />
          : isLogin
          ? <LoginForm onToggleMode={() => setIsLogin(false)} onForgotPassword={() => setIsForgotPassword(true)} />
          : <SignupForm onToggleMode={() => setIsLogin(true)} />}
      </section>
    </div>
  </main>;
};

export default AuthPage;
