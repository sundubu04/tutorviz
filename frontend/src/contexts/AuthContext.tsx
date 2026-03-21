import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getBackendOriginForConfig, getPublicAppOriginFromEnv } from '../config/api';
import { apiClient, User, RegisterData } from '../utils/apiClient';

export type RegisterResult = { needsEmailConfirmation: boolean };

interface AuthContextType {
  user: User | null;
  /** True during initial session restore or while login/register requests are in flight. */
  isLoading: boolean;
  /** True only until the first session check on app load has finished (not toggled by login/register). */
  sessionResolved: boolean;
  error: string | null;
  awaitingEmailConfirmation: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<RegisterResult>;
  logout: () => void;
  clearError: () => void;
  clearAwaitingEmailConfirmation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const supabaseInitPromiseRef = useRef<Promise<SupabaseClient> | null>(null);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const supabaseSiteUrlRef = useRef<string | null>(null);

  const initSupabaseClient = async (): Promise<SupabaseClient> => {
    if (supabaseRef.current) return supabaseRef.current;
    if (supabaseInitPromiseRef.current) return supabaseInitPromiseRef.current;

    supabaseInitPromiseRef.current = (async () => {
      const backendOrigin = getBackendOriginForConfig();
      const configUrl = `${backendOrigin}/api/supabase/config`;

      const configRes = await fetch(configUrl);
      if (!configRes.ok) {
        let details = '';
        try {
          const body = await configRes.json();
          details = body?.message || body?.error || '';
        } catch {
          // Ignore JSON parse failures
        }

        throw new Error(
          `Failed to load Supabase config from ${configUrl}${details ? `: ${details}` : ''}`
        );
      }

      const { url, anonKey, siteUrl } = await configRes.json();
      if (!url || !anonKey) {
        throw new Error('Supabase config missing url or anonKey');
      }

      const normalizedSite =
        typeof siteUrl === 'string' ? siteUrl.trim().replace(/\/$/, '') : '';
      supabaseSiteUrlRef.current = normalizedSite || null;

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
        const { user: nextUser } = await apiClient.getProfile();
        setUser(nextUser);
      } else {
        apiClient.logout();
        setUser(null);
      }
    });

    authSubscriptionRef.current = { unsubscribe: subscription.unsubscribe };
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = await initSupabaseClient();
        supabaseRef.current = supabase;

        const {
          data: { session }
        } = await supabase.auth.getSession();

        setupAuthStateSync(supabase);

        if (session?.access_token) {
          apiClient.setToken(session.access_token);
          const { user: profileUser } = await apiClient.getProfile();
          setUser(profileUser);
        } else {
          apiClient.logout();
          setUser(null);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        apiClient.logout();
        setUser(null);

        const errorMessage = err instanceof Error ? err.message : 'Auth check failed';
        if (errorMessage.includes('Failed to load Supabase config') || errorMessage.includes('Supabase config')) {
          setError('Supabase is not reachable. Check backend `/api/supabase/config` and environment variables.');
        } else {
          setError('Unable to load authentication state. Please try again.');
        }
      } finally {
        setIsLoading(false);
        setSessionResolved(true);
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
      setAwaitingEmailConfirmation(false);

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
      const { user: profileUser } = await apiClient.getProfile();
      setUser(profileUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
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
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<RegisterResult> => {
    try {
      setIsLoading(true);
      setError(null);
      setAwaitingEmailConfirmation(false);

      const supabase = await initSupabaseClient();
      setupAuthStateSync(supabase);

      const origin =
        supabaseSiteUrlRef.current?.trim() || getPublicAppOriginFromEnv();
      const emailRedirectTo = `${origin.replace(/\/$/, '')}/dashboard`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo,
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

      const session = data.session ?? (await supabase.auth.getSession()).data.session;
      if (!session?.access_token) {
        apiClient.logout();
        setUser(null);
        setAwaitingEmailConfirmation(true);
        return { needsEmailConfirmation: true };
      }

      apiClient.setToken(session.access_token);
      const { user: profileUser } = await apiClient.getProfile();
      setUser(profileUser);
      return { needsEmailConfirmation: false };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
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
      throw err;
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
    setAwaitingEmailConfirmation(false);
  };

  const clearError = () => {
    setError(null);
  };

  const clearAwaitingEmailConfirmation = () => {
    setAwaitingEmailConfirmation(false);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    sessionResolved,
    error,
    awaitingEmailConfirmation,
    login,
    register,
    logout,
    clearError,
    clearAwaitingEmailConfirmation
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
