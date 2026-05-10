import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useAuditStore, useClientStore, useVerificationItemStore } from '@/lib/store';
import { auditsAPI, clientsAPI, verificationItemsAPI } from '@/lib/api';
import { useRouter } from 'next/router';
import { Plus, Trash2, Calendar } from 'lucide-react';

const AUDIT_TYPES = [
  'Financial Audit', 'Tax Audit', 'GST Audit', 'Statutory Audit',
  'Internal Audit', 'Compliance Audit', 'Forensic Audit', 'Other',
];

const defaultForm = {
  client_id: '',
  audit_type: '',
  risk_level: 'medium',
  scope: '',
  description: '',
  deadline: '',
};

const STATUS_TABS = ['all', 'planned', 'in_progress', 'under_review', 'completed', 'on_hold'];

export default function Audits() {
  const router = useRouter();
  const { ready } = useAuthGuard();
  const audits = useAuditStore((s) => s.audits);
  const setAudits = useAuditStore((s) => s.setAudits);
  const addAudit = useAuditStore((s) => s.addAudit);
  const removeAudit = useAuditStore((s) => s.removeAudit);
  const clients = useClientStore((s) => s.clients);
  const setClients = useClientStore((s) => s.setClients);
  const allItems = useVerificationItemStore((s) => s.items);
  const addItems = useVerificationItemStore((s) => s.addItems);

  const [tab, setTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      auditsAPI.list({ limit: 100 }),
      clientsAPI.list(),
    ]).then(async ([auditsRes, clientsRes]) => {
      setAudits(auditsRes.data);
      setClients(clientsRes.data);
      // Fetch item counts for first 15 audits so progress bars render
      const toFetch: any[] = auditsRes.data.slice(0, 15);
      const results = await Promise.allSettled(
        toFetch.map((a: any) => verificationItemsAPI.list(a.id, { limit: 500 })),
      );
      const fetched = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .flatMap((r) => r.value.data);
      addItems(fetched);
    }).catch(console.error);
  }, [ready]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        client_id: parseInt(form.client_id),
        deadline: form.deadline + 'T23:59:59',
      };
      const res = await auditsAPI.create(payload);
      addAudit(res.data);
      setShowModal(false);
      setForm(defaultForm);
      router.push(`/audits/${res.data.id}`);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((e: any) => e.msg).join(', ')
          : 'Failed to create audit',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this audit? This cannot be undone.')) return;
    try {
      await auditsAPI.delete(id);
      removeAudit(id);
    } catch {
      alert('Failed to delete audit');
    }
  };

  const filtered = tab === 'all' ? audits : audits.filter((a) => a.status === tab);
  const clientMap = new Map(clients.map((c) => [c.id, c.company_name]));

  const itemsByAudit = new Map<number, typeof allItems>();
  allItems.forEach((item) => {
    if (!itemsByAudit.has(item.audit_id)) itemsByAudit.set(item.audit_id, []);
    itemsByAudit.get(item.audit_id)!.push(item);
  });

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audits</h1>
            <p className="text-sm text-gray-500 mt-0.5">{audits.length} total</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Audit
          </button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {STATUS_TABS.map((s) => {
            const count = s === 'all' ? audits.length : audits.filter((a) => a.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  tab === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : s.replace(/_/g, ' ')} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-sm text-gray-400">
            {tab === 'all'
              ? 'No audits yet. Create your first audit.'
              : `No audits with status "${tab.replace(/_/g, ' ')}".`}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((audit) => {
              const items = itemsByAudit.get(audit.id) ?? [];
              const verified = items.filter((i) => i.status === 'verified').length;
              const rejected = items.filter((i) => i.status === 'rejected').length;
              const reviewed = verified + rejected;
              const hasItems = items.length > 0;

              return (
                <div
                  key={audit.id}
                  onClick={() => router.push(`/audits/${audit.id}`)}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-bold text-gray-900">{audit.audit_type}</p>
                        <StatusBadge value={audit.status} />
                        <StatusBadge value={audit.risk_level} />
                      </div>
                      <p className="text-xs text-gray-500">
                        {clientMap.get(audit.client_id) ?? `Client #${audit.client_id}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, audit.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      {hasItems ? (
                        <ProgressBar verified={reviewed} total={items.length} />
                      ) : (
                        <p className="text-xs text-gray-400">No verification items yet</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(audit.deadline).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Audit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Create New Audit</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
                <select
                  required
                  value={form.client_id}
                  onChange={(e) => set('client_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No clients found. Add a client first.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Audit Type *</label>
                <select
                  required
                  value={form.audit_type}
                  onChange={(e) => set('audit_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select type…</option>
                  {AUDIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Risk Level *</label>
                  <select
                    value={form.risk_level}
                    onChange={(e) => set('risk_level', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Deadline *</label>
                  <input
                    required
                    type="date"
                    value={form.deadline}
                    onChange={(e) => set('deadline', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scope</label>
                <textarea
                  value={form.scope}
                  onChange={(e) => set('scope', e.target.value)}
                  rows={2}
                  placeholder="Describe the scope of this audit…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || clients.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {submitting ? 'Creating…' : 'Create Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
