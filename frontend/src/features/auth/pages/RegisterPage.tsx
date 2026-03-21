import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import type { RegisterData } from '../../../utils/apiClient';
import Register from '../components/Register';
import AuthLoadingScreen from '../components/AuthLoadingScreen';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isLoading,
    sessionResolved,
    error,
    awaitingEmailConfirmation,
    register,
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

  const handleRegister = async (userData: RegisterData) => {
    const result = await register(userData);
    if (result.needsEmailConfirmation) {
      navigate('/pending', { replace: true });
    }
  };

  if (!sessionResolved) {
    return <AuthLoadingScreen />;
  }

  if (user && !awaitingEmailConfirmation) {
    return <AuthLoadingScreen />;
  }

  return (
    <Register
      onRegister={handleRegister}
      onSwitchToLogin={() => {
        clearError();
        navigate('/login');
      }}
      isLoading={isLoading}
      error={error}
      clearError={clearError}
    />
  );
};

export default RegisterPage;
