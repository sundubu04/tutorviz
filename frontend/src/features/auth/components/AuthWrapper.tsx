import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../utils/apiClient';
import Login from './Login';
import Register from './Register';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isLoading, error, login, register, logout, clearError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const isPendingVerification =
    user?.role !== 'admin' && user?.verified === false;

  useEffect(() => {
    if (!isPendingVerification) return;

    const interval = window.setInterval(async () => {
      try {
        const { user: refreshed } = await apiClient.getProfile();
        if (refreshed.verified) {
          window.location.reload();
        }
      } catch {
        // Ignore transient errors while polling.
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isPendingVerification]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication forms if user is not authenticated
  if (!user) {
    return (
      <>
        {isLoginMode ? (
          <Login
            onLogin={login}
            onSwitchToRegister={() => {
              setIsLoginMode(false);
              clearError();
            }}
            isLoading={isLoading}
            error={error}
            clearError={clearError}
          />
        ) : (
          <Register
            onRegister={register}
            onSwitchToLogin={() => {
              setIsLoginMode(true);
              clearError();
            }}
            isLoading={isLoading}
            error={error}
          />
        )}
      </>
    );
  }

  if (isPendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Verification required</h2>
          <p className="text-gray-600 mb-6">
            Your account needs to be verified by an administrator before you can access the app.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show the main app if user is authenticated
  return <>{children}</>;
};

export default AuthWrapper; 