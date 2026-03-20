import React, { useEffect, useState } from 'react';
import { apiClient, type User } from '../utils/apiClient';
import { Button } from '../components/ui';
import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

const AdminVerification: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getPendingUsers();
      setUsers(res.users);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load pending users';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyUser = async (userId: string) => {
    try {
      await apiClient.verifyUser(userId);
      await fetchPending();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to verify user';
      alert(message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Users</h2>
          <p className="text-gray-600 mt-1">
            Approve student and teacher accounts before they can access the app.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void fetchPending()}
          icon={<RefreshCw className="w-4 h-4" />}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading pending users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <p className="text-gray-600">No pending users right now.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 text-sm font-semibold text-gray-700">
            Pending accounts ({users.length})
          </div>
          <div className="divide-y divide-gray-200">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {u.firstName} {u.lastName}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{u.email}</div>
                  <div className="text-xs text-gray-400 mt-1 capitalize">Role: {u.role}</div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => void verifyUser(u.id)}
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Verify
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerification;

