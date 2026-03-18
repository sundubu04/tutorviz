import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, User, LoginResponse, RegisterData } from '../utils/apiClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          const { user } = await apiClient.getProfile();
          setUser(user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid token
        apiClient.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: LoginResponse = await apiClient.login(email, password);
      setUser(response.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      // Provide more user-friendly error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Email or password is incorrect')) {
        userFriendlyError = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('Validation failed')) {
        userFriendlyError = 'Please check your input and try again.';
      } else if (errorMessage.includes('Login failed')) {
        userFriendlyError = 'Unable to sign in. Please try again later.';
      }
      setError(userFriendlyError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: LoginResponse = await apiClient.register(userData);
      setUser(response.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      // Provide more user-friendly error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('User already exists') || errorMessage.includes('already exists')) {
        userFriendlyError = 'An account with this email already exists. Please sign in instead.';
      } else if (errorMessage.includes('Validation failed')) {
        userFriendlyError = 'Please check your input and try again.';
      } else if (errorMessage.includes('Registration failed')) {
        userFriendlyError = 'Unable to create account. Please try again later.';
      }
      setError(userFriendlyError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    apiClient.logout();
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };



  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 