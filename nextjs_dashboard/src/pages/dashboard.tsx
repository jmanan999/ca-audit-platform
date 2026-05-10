import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useAuditStore, useClientStore, useVerificationItemStore } from '@/lib/store';
import { auditsAPI, clientsAPI, verificationItemsAPI } from '@/lib/api';
import { ClipboardList, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { ready } = useAuthGuard();
  const audits = useAuditStore((s) => s.audits);
  const setAudits = useAuditStore((s) => s.setAudits);
  const clients = useClientStore((s) => s.clients);
  const setClients = useClientStore((s) => s.setClients);
  const allItems = useVerificationItemStore((s) => s.items);
  const setItems = useVerificationItemStore((s) => s.setItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const load = async () => {
      try {
        const [auditsRes, clientsRes] = await Promise.all([
          auditsAPI.list({ limit: 100 }),
          clientsAPI.list(),
        ]);
        setAudits(auditsRes.data);
        setClients(clientsRes.data);

        // Load verification items for active audits to compute stats
        const activeAudits = auditsRes.data.filter(
          (a: any) => a.status === 'in_progress' || a.status === 'under_review',
        );
        if (activeAudits.length > 0) {
          const itemResponses = await Promise.all(
            activeAudits.slice(0, 10).map((a: any) =>
              verificationItemsAPI.list(a.id, { limit: 200 }),
            ),
          );
          setItems(itemResponses.flatMap((r) => r.data));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ready]);

  const activeAudits = audits.filter((a) => a.status === 'in_progress');
  const needsReview = audits.filter((a) => a.status === 'under_review');
  const evidenceItems = allItems.filter((i) => i.status === 'evidence_submitted').length;
  const completedThisMonth = audits.filter((a) => {
    if (a.status !== 'completed' || !a.completion_date) return false;
    const d = new Date(a.completion_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const auditItemMap = new Map<number, typeof allItems>();
  allItems.forEach((item) => {
    if (!auditItemMap.has(item.audit_id)) auditItemMap.set(item.audit_id, []);
    auditItemMap.get(item.audit_id)!.push(item);
  });

  const attentionAudits = audits
    .filter(
      (a) =>
        a.status === 'under_review' ||
        (auditItemMap.get(a.id) ?? []).some((i) => i.status === 'evidence_submitted'),
    )
    .slice(0, 8);

  const clientMap = new Map(clients.map((c) => [c.id, c.company_name]));

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of your active audits</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active Audits"
            value={activeAudits.length}
            icon={<ClipboardList className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            label="Awaiting Review"
            value={needsReview.length}
            icon={<Clock className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-50"
          />
          <StatCard
            label="Evidence to Review"
            value={evidenceItems}
            icon={<AlertTriangle className="w-5 h-5 text-purple-600" />}
            color="bg-purple-50"
          />
          <StatCard
            label="Completed This Month"
            value={completedThisMonth}
            icon={<CheckCircle className="w-5 h-5 text-green-600" />}
            color="bg-green-50"
          />
        </div>

        {/* Audits needing attention */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Audits Needing Attention</h2>

          {attentionAudits.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No audits currently need review.
            </div>
          ) : (
            <div className="space-y-3">
              {attentionAudits.map((audit) => {
                const items = auditItemMap.get(audit.id) ?? [];
                const verified = items.filter((i) => i.status === 'verified').length;
                const rejected = items.filter((i) => i.status === 'rejected').length;
                const reviewed = verified + rejected;
                const evidenceCount = items.filter((i) => i.status === 'evidence_submitted').length;

                return (
                  <div
                    key={audit.id}
                    onClick={() => router.push(`/audits/${audit.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {audit.audit_type}
                        </p>
                        <StatusBadge value={audit.status} />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {clientMap.get(audit.client_id) ?? '—'} · Due{' '}
                        {new Date(audit.deadline).toLocaleDateString('en-IN')}
                      </p>
                      {items.length > 0 && (
                        <ProgressBar verified={reviewed} total={items.length} />
                      )}
                    </div>
                    {evidenceCount > 0 && (
                      <span className="shrink-0 px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                        {evidenceCount} to review
                      </span>
                    )}
                    <span className="text-gray-400 text-sm shrink-0">→</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
