import React from 'react';

/** Full-screen loader used while auth state is resolving (matches login/register backdrop). */
const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-blue-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

export default AuthLoadingScreen;
