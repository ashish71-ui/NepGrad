import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './wc.css';

const NAV_LINKS = [
  { to: '/wc', label: '🏆 Leaderboard', exact: true },
  { to: '/wc/matches', label: '⚽ Matches' },
  { to: '/wc/tournament', label: '🌍 Tournament' },
];

const WCLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="wc-app">
      <nav className="wc-nav">
        <div className="wc-nav-inner">
          <Link to="/wc" className="wc-nav-brand">
            <span className="wc-nav-trophy">🏆</span>
            <span>WC Predictor</span>
          </Link>
          <div className="wc-nav-links">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`wc-nav-link ${isActive(link.to, link.exact) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            {user?.is_staff && (
              <Link
                to="/wc/admin"
                className={`wc-nav-link ${isActive('/wc/admin') ? 'active' : ''}`}
              >
                ⚙️ Admin
              </Link>
            )}
          </div>
          <div className="wc-nav-right">
            {user ? (
              <span className="wc-nav-user">👤 {user.username}</span>
            ) : (
              <>
                <Link to="/login" className="wc-nav-back">Sign In</Link>
                <Link to="/signup" className="wc-nav-signup">Sign Up</Link>
              </>
            )}
            <Link to="/universities" className="wc-nav-back">← Main App</Link>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
};

export default WCLayout;
