import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useAuditStore, useClientStore, useVerificationItemStore } from '@/lib/store';
import { auditsAPI, clientsAPI, verificationItemsAPI, dashboardAPI } from '@/lib/api';
import { ClipboardList, Clock, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

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

interface RiskRow {
  audit_type: string;
  client_name: string;
  total: number;
  high_risk: number;
  rejected: number;
  status: string;
}

function riskColor(highRisk: number, total: number): string {
  if (total === 0) return '#6B7280';
  const pct = highRisk / total;
  if (pct >= 0.3) return '#DC2626';  // red
  if (pct >= 0.15) return '#F59E0B'; // amber
  return '#10B981';                   // green
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-2 truncate max-w-[200px]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill || p.color }} className="flex justify-between gap-4">
          <span>{p.name}</span>
          <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

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
  const [riskData, setRiskData] = useState<{ by_audit: RiskRow[]; by_client: any[] } | null>(null);
  const [riskView, setRiskView] = useState<'audit' | 'client'>('audit');

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

        // Load risk summary for heatmap
        try {
          const riskRes = await dashboardAPI.riskSummary();
          setRiskData(riskRes.data);
        } catch {
          // Non-fatal — heatmap just stays hidden
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

  // Build chart data
  const chartData = riskView === 'audit'
    ? (riskData?.by_audit ?? [])
        .sort((a, b) => (b.high_risk + b.rejected) - (a.high_risk + a.rejected))
        .slice(0, 12)
        .map((row) => ({
          name: `${row.audit_type.slice(0, 18)}…\n${row.client_name.slice(0, 14)}`,
          'High Risk': row.high_risk,
          'Rejected': row.rejected,
          'Clean': Math.max(0, row.total - row.high_risk - row.rejected),
          _total: row.total,
          _pct: row.total > 0 ? Math.round((row.high_risk / row.total) * 100) : 0,
        }))
    : (riskData?.by_client ?? [])
        .slice(0, 12)
        .map((row) => ({
          name: row.client_name.slice(0, 22),
          'High Risk': row.high_risk,
          'Rejected': row.rejected,
          'Clean': Math.max(0, row.total - row.high_risk - row.rejected),
          _total: row.total,
          _pct: row.total > 0 ? Math.round((row.high_risk / row.total) * 100) : 0,
        }));

  const totalHighRisk = riskData?.by_audit.reduce((s, r) => s + r.high_risk, 0) ?? 0;

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

        {/* ── Risk Heatmap ──────────────────────────────── */}
        {riskData && chartData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Risk Heatmap
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totalHighRisk} high-risk item{totalHighRisk !== 1 ? 's' : ''} flagged across all audits
                </p>
              </div>

              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                <button
                  onClick={() => setRiskView('audit')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    riskView === 'audit'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  By Audit
                </button>
                <button
                  onClick={() => setRiskView('client')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    riskView === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  By Client
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -20, bottom: 60 }}
                barCategoryGap="30%"
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="square"
                  iconSize={10}
                />
                <Bar dataKey="High Risk" stackId="a" fill="#DC2626" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Rejected" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Clean" stackId="a" fill="#D1FAE5" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Risk legend cards */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {chartData.slice(0, 6).map((row, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: riskColor(row['High Risk'], row._total) }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{row.name.replace(/\n.*/, '')}</p>
                    <p className="text-xs text-gray-400">
                      {row['High Risk']} high-risk · {row._pct}% of {row._total}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                const highRiskCount = items.filter((i) => i.is_high_risk).length;

                return (
                  <div
                    key={audit.id}
                    onClick={() => router.push(`/audits/${audit.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {audit.audit_type}
                        </p>
                        <StatusBadge value={audit.status} />
                        {highRiskCount > 0 && (
                          <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 font-medium rounded">
                            {highRiskCount} high-risk
                          </span>
                        )}
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
