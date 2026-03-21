import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';

/**
 * Allows access only when the user is signed in and (admin or verified).
 * Otherwise redirects to login, pending email confirmation, or admin-approval pending.
 */
const RequireVerifiedUser: React.FC = () => {
  const { user, sessionResolved, awaitingEmailConfirmation } = useAuth();
  const location = useLocation();

  if (!sessionResolved) {
    return <AuthLoadingScreen />;
  }

  if (awaitingEmailConfirmation) {
    return <Navigate to="/pending" replace state={{ from: location }} />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = user.role === 'admin' || user.verified;
  if (!allowed) {
    return <Navigate to="/pending" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireVerifiedUser;
