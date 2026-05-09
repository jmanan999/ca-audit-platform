import React, { useEffect, useState } from 'react';
import { useAuthStore, useAuditStore } from '@/lib/store';
import { useRouter } from 'next/router';
import { auditsAPI } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const audits = useAuditStore((state) => state.audits);
  const setAudits = useAuditStore((state) => state.setAudits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch audits
    const fetchAudits = async () => {
      try {
        const response = await auditsAPI.list();
        setAudits(response.data);
      } catch (err) {
        console.error('Failed to fetch audits', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, [user, router, setAudits]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const activeAudits = audits.filter((a) => a.status === 'in_progress').length;
  const completedAudits = audits.filter((a) => a.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">CA Audit Platform</h1>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/login');
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Total Audits</div>
            <div className="text-3xl font-bold text-gray-900">{audits.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Active</div>
            <div className="text-3xl font-bold text-blue-600">{activeAudits}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Completed</div>
            <div className="text-3xl font-bold text-green-600">{completedAudits}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 text-sm font-medium">Welcome</div>
            <div className="text-lg font-semibold text-gray-900">{user?.name}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold text-gray-900">Recent Audits</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Risk</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {audits.slice(0, 5).map((audit) => (
                  <tr key={audit.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">#{audit.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">Client {audit.client_id}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(audit.status)}`}>
                        {audit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{audit.risk_level}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(audit.deadline).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
