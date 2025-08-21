import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Login from './Login';
import Register from './Register';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { user, isLoading, error, login, register, clearError } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
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

  // Show the main app if user is authenticated
  return <>{children}</>;
};

export default AuthWrapper; 