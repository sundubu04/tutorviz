import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type { User } from '../../../utils/apiClient';

/**
 * Landing page for Supabase email confirmation / magic links.
 * Add this exact URL to Supabase → Authentication → URL configuration → Redirect URLs
 * (e.g. http://localhost:3000/auth/confirm and your production origin).
 */
const EmailConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSessionFromEmailLink } = useAuth();
  const [phase, setPhase] = useState<'working' | 'success' | 'error'>('working');
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const result = await refreshSessionFromEmailLink();

      if (result.ok) {
        setPhase('success');
        const nextUser: User | null | undefined = result.user;
        window.setTimeout(() => {
          if (nextUser?.role === 'admin' || nextUser?.verified) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/pending', { replace: true });
          }
        }, 900);
        return;
      }

      setPhase('error');
      setMessage(result.message || 'Something went wrong confirming your email.');
    })();
  }, [refreshSessionFromEmailLink, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-white" />
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {phase === 'working' && (
            <>
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Confirming your email</h1>
              <p className="text-gray-600 text-sm">
                Please wait while we finish signing you in…
              </p>
            </>
          )}

          {phase === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Email confirmed</h1>
              <p className="text-gray-600 text-sm">Redirecting you to the app…</p>
            </>
          )}

          {phase === 'error' && (
            <>
              <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Could not confirm</h1>
              <p className="text-gray-600 text-sm mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/login"
                  className="inline-flex justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Back to sign in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex justify-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                >
                  Create an account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;
