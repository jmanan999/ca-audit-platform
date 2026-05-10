import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { executivesAPI } from '@/lib/api';
import {
  UserCheck, UserX, Trash2, Clock, CheckCircle, XCircle,
  Phone, Mail, User, RefreshCw,
} from 'lucide-react';

interface Executive {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_approved: boolean;
  is_active: boolean;
  created_at: string;
}

type FilterTab = 'pending' | 'approved' | 'rejected';

const ROLE_LABELS: Record<string, string> = {
  auditor: 'Field Executive',
  article_trainee: 'Article Trainee',
};

export default function Executives() {
  const { ready } = useAuthGuard();
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [tab, setTab] = useState<FilterTab>('pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await executivesAPI.list();
      setExecutives(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    loadAll();
  }, [ready]);

  const pending = executives.filter((e) => !e.is_approved && e.is_active);
  const approved = executives.filter((e) => e.is_approved);
  const rejected = executives.filter((e) => !e.is_approved && !e.is_active);

  const displayed = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      const res = await executivesAPI.approve(id);
      setExecutives((prev) => prev.map((e) => (e.id === id ? res.data : e)));
    } catch {
      alert('Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionId(id);
    try {
      const res = await executivesAPI.reject(id);
      setExecutives((prev) => prev.map((e) => (e.id === id ? res.data : e)));
    } catch {
      alert('Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this executive account?')) return;
    setActionId(id);
    try {
      await executivesAPI.delete(id);
      setExecutives((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete');
    } finally {
      setActionId(null);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const TABS: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'pending', label: 'Pending Approval', count: pending.length, color: 'text-yellow-600' },
    { key: 'approved', label: 'Approved', count: approved.length, color: 'text-green-600' },
    { key: 'rejected', label: 'Rejected', count: rejected.length, color: 'text-red-600' },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Executives</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage who can access the field audit app
            </p>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* How it works banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 text-sm text-blue-800">
          <p className="font-semibold mb-1">How executive access works</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs text-blue-700">
            <li>Executive registers at <strong>/register</strong> and selects "Field Executive"</li>
            <li>Their account appears here as <strong>Pending Approval</strong></li>
            <li>You approve them — they can now use the mobile field app</li>
            <li>The CA dashboard remains restricted to CA / Admin accounts only</li>
          </ol>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mb-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white border-2 border-blue-600 text-blue-700 shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t.key === 'pending' && <Clock className={`w-3.5 h-3.5 ${tab === t.key ? 'text-yellow-500' : 'text-gray-400'}`} />}
              {t.key === 'approved' && <CheckCircle className={`w-3.5 h-3.5 ${tab === t.key ? 'text-green-500' : 'text-gray-400'}`} />}
              {t.key === 'rejected' && <XCircle className={`w-3.5 h-3.5 ${tab === t.key ? 'text-red-500' : 'text-gray-400'}`} />}
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Executive cards */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-400">
            {tab === 'pending'
              ? 'No executives waiting for approval.'
              : tab === 'approved'
              ? 'No approved executives yet.'
              : 'No rejected accounts.'}
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((exec) => {
              const busy = actionId === exec.id;
              return (
                <div
                  key={exec.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900">{exec.name}</p>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                            {ROLE_LABELS[exec.role] ?? exec.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {exec.email}
                          </span>
                          {exec.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {exec.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered {new Date(exec.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {tab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(exec.id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {busy ? '…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(exec.id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            {busy ? '…' : 'Reject'}
                          </button>
                        </>
                      )}
                      {tab === 'approved' && (
                        <button
                          onClick={() => handleReject(exec.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-40 transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          {busy ? '…' : 'Revoke Access'}
                        </button>
                      )}
                      {tab === 'rejected' && (
                        <button
                          onClick={() => handleApprove(exec.id)}
                          disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {busy ? '…' : 'Approve'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(exec.id)}
                        disabled={busy}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Delete account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                    {exec.is_approved ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Active — can use the field app
                      </span>
                    ) : exec.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-yellow-700">
                        <Clock className="w-3.5 h-3.5" /> Awaiting your approval
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-600">
                        <XCircle className="w-3.5 h-3.5" /> Access revoked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
