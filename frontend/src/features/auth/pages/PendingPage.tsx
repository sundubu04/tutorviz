import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../utils/apiClient';
import AuthLoadingScreen from '../components/AuthLoadingScreen';

const PendingPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    sessionResolved,
    awaitingEmailConfirmation,
    logout,
    clearAwaitingEmailConfirmation,
    clearError
  } = useAuth();

  const isPendingVerification =
    Boolean(user) && user!.role !== 'admin' && user!.verified === false;

  useEffect(() => {
    if (!sessionResolved) return;
    if (awaitingEmailConfirmation) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role === 'admin' || user.verified) {
      navigate('/dashboard', { replace: true });
    }
  }, [sessionResolved, user, awaitingEmailConfirmation, navigate]);

  useEffect(() => {
    if (!isPendingVerification) return;

    const interval = window.setInterval(async () => {
      try {
        const { user: refreshed } = await apiClient.getProfile();
        if (refreshed.verified) {
          window.location.assign('/dashboard');
        }
      } catch {
        // Ignore transient errors while polling.
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isPendingVerification]);

  if (!sessionResolved) {
    return <AuthLoadingScreen />;
  }

  if (awaitingEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-4">
            We sent a confirmation link to your address. Open it to finish setting up your account.
          </p>
          <p className="text-gray-600 mb-6">
            After you sign in, your request will stay pending until an administrator approves your
            account.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                clearAwaitingEmailConfirmation();
                clearError();
                navigate('/login');
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your request is pending</h2>
        <p className="text-gray-600 mb-6">
          An administrator still needs to approve your account before you can use the app. This page
          will refresh automatically once you are approved.
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
};

export default PendingPage;
