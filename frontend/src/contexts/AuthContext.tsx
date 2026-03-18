import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiClient, User, RegisterData } from '../utils/apiClient';

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
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const supabaseInitPromiseRef = useRef<Promise<SupabaseClient> | null>(null);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  const initSupabaseClient = async (): Promise<SupabaseClient> => {
    if (supabaseRef.current) return supabaseRef.current;
    if (supabaseInitPromiseRef.current) return supabaseInitPromiseRef.current;

    supabaseInitPromiseRef.current = (async () => {
      const backendUrl =
        process.env.REACT_APP_BACKEND_URL ||
        process.env.REACT_APP_API_URL ||
        'http://localhost:5001';

      const configRes = await fetch(`${backendUrl}/api/supabase/config`);
      if (!configRes.ok) {
        let details = '';
        try {
          const body = await configRes.json();
          details = body?.message || body?.error || '';
        } catch {
          // Ignore JSON parse failures
        }

        throw new Error(
          `Failed to load Supabase config from ${backendUrl}/api/supabase/config${details ? `: ${details}` : ''}`
        );
      }

      const { url, anonKey } = await configRes.json();
      if (!url || !anonKey) {
        throw new Error('Supabase config missing url or anonKey');
      }

      const supabase = createClient(url, anonKey);
      supabaseRef.current = supabase;
      return supabase;
    })();

    try {
      return await supabaseInitPromiseRef.current;
    } catch (e) {
      supabaseInitPromiseRef.current = null;
      throw e;
    }
  };

  const setupAuthStateSync = (supabase: SupabaseClient) => {
    if (authSubscriptionRef.current) return;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        apiClient.setToken(session.access_token);
        const { user } = await apiClient.getProfile();
        setUser(user);
      } else {
        apiClient.logout();
        setUser(null);
      }
    });

    authSubscriptionRef.current = { unsubscribe: subscription.unsubscribe };
  };

  // Check if user is already authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = await initSupabaseClient();
        supabaseRef.current = supabase;

        // Restore existing session (and therefore access token).
        const {
          data: { session }
        } = await supabase.auth.getSession();

        setupAuthStateSync(supabase);

        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          const { user } = await apiClient.getProfile();
          setUser(user);
        } else {
          apiClient.logout();
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid token
        apiClient.logout();
        setUser(null);

        const errorMessage = error instanceof Error ? error.message : 'Auth check failed';
        if (errorMessage.includes('Failed to load Supabase config') || errorMessage.includes('Supabase config')) {
          setError('Supabase is not reachable. Check backend `/api/supabase/config` and environment variables.');
        } else {
          setError('Unable to load authentication state. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      authSubscriptionRef.current?.unsubscribe();
      authSubscriptionRef.current = null;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = await initSupabaseClient();
      setupAuthStateSync(supabase);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      const session = data.session ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        throw new Error('No active session found after sign in');
      }

      apiClient.setToken(session.access_token);
      const { user } = await apiClient.getProfile();
      setUser(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      // Provide more user-friendly error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('Invalid credentials') || errorMessage.includes('Email or password is incorrect')) {
        userFriendlyError = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('Failed to load Supabase config') || errorMessage.includes('Supabase config')) {
        userFriendlyError = 'Supabase is not reachable. Check backend `/api/supabase/config` and environment variables.';
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

      const supabase = await initSupabaseClient();
      setupAuthStateSync(supabase);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role
          }
        }
      });

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // If email confirmation is enabled in Supabase, `session` might be null.
      const session = data.session ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        apiClient.logout();
        setUser(null);
        setError('Account created. Please sign in to continue.');
        return;
      }

      apiClient.setToken(session.access_token);
      const { user } = await apiClient.getProfile();
      setUser(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      // Provide more user-friendly error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('User already exists') || errorMessage.includes('already exists')) {
        userFriendlyError = 'An account with this email already exists. Please sign in instead.';
      } else if (errorMessage.includes('Failed to load Supabase config') || errorMessage.includes('Supabase config')) {
        userFriendlyError = 'Supabase is not reachable. Check backend `/api/supabase/config` and environment variables.';
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
    supabaseRef.current?.auth.signOut().catch(() => {
      // Ignore errors on logout in cleanup flows.
    });
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