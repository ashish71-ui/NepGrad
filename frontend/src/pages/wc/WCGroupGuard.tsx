import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWCGroup } from './WCGroupContext';

/**
 * Protects /wc/matches and /wc/tournament.
 * - Not logged in → /login
 * - Logged in, admin → always allowed
 * - Logged in, no group yet → back to /wc (join prompt)
 * - Logged in, has group → allowed
 */
const WCGroupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const { myGroup, loading } = useWCGroup();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (loading) return null; // brief flash while group loads
  if (!user?.is_staff && !myGroup) return <Navigate to="/wc" replace />;

  return <>{children}</>;
};

export default WCGroupGuard;
