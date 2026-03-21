import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Login from '../components/Login';
import AuthLoadingScreen from '../components/AuthLoadingScreen';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isLoading,
    sessionResolved,
    error,
    awaitingEmailConfirmation,
    login,
    clearError
  } = useAuth();

  useEffect(() => {
    if (!sessionResolved) return;
    if (awaitingEmailConfirmation) {
      navigate('/pending', { replace: true });
      return;
    }
    if (user) {
      if (user.role === 'admin' || user.verified) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/pending', { replace: true });
      }
    }
  }, [sessionResolved, user, awaitingEmailConfirmation, navigate]);

  if (!sessionResolved) {
    return <AuthLoadingScreen />;
  }

  if (user && !awaitingEmailConfirmation) {
    return <AuthLoadingScreen />;
  }

  return (
    <Login
      onLogin={login}
      onSwitchToRegister={() => {
        clearError();
        navigate('/register');
      }}
      isLoading={isLoading}
      error={error}
      clearError={clearError}
    />
  );
};

export default LoginPage;
