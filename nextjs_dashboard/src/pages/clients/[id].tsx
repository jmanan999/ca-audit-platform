import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useClientStore, useAuditStore, useVerificationItemStore } from '@/lib/store';
import { auditsAPI, verificationItemsAPI } from '@/lib/api';
import { ArrowLeft, Building2, Phone, Mail, FileText, Calendar, Plus } from 'lucide-react';

export default function ClientDetail() {
  const router = useRouter();
  const { id } = router.query;
  const clientId = id ? parseInt(id as string) : null;
  const { ready } = useAuthGuard();

  const clients = useClientStore((s) => s.clients);
  const audits = useAuditStore((s) => s.audits);
  const setAudits = useAuditStore((s) => s.setAudits);
  const allItems = useVerificationItemStore((s) => s.items);
  const addItems = useVerificationItemStore((s) => s.addItems);

  const [loading, setLoading] = useState(true);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const clientAudits = audits.filter((a) => a.client_id === clientId);

  const itemsByAudit = new Map<number, typeof allItems>();
  allItems.forEach((item) => {
    if (!itemsByAudit.has(item.audit_id)) itemsByAudit.set(item.audit_id, []);
    itemsByAudit.get(item.audit_id)!.push(item);
  });

  useEffect(() => {
    if (!ready || !clientId) return;
    auditsAPI
      .list({ client_id: clientId, limit: 100 })
      .then(async (res) => {
        setAudits([...audits.filter((a) => a.client_id !== clientId), ...res.data]);
        const results = await Promise.allSettled(
          res.data.map((a: any) => verificationItemsAPI.list(a.id, { limit: 500 })),
        );
        const fetched = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .flatMap((r) => r.value.data);
        addItems(fetched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ready, clientId]);

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-500 text-sm">Client not found.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/clients')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Clients
        </button>

        {/* Client info card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-0.5">{client.company_name}</h1>
              <p className="text-sm text-gray-500">{client.industry} · FY {client.financial_year}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">GST Number</p>
              <p className="font-mono text-gray-800">{client.gst_number}</p>
            </div>
            {client.pan_number && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">PAN</p>
                <p className="font-mono text-gray-800">{client.pan_number}</p>
              </div>
            )}
            {client.cin_number && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">CIN</p>
                <p className="font-mono text-gray-800">{client.cin_number}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Contact Person</p>
              <p className="text-gray-800">{client.contact_person}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
              <a
                href={`mailto:${client.contact_email}`}
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Mail className="w-3.5 h-3.5" /> {client.contact_email}
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Phone</p>
              <a
                href={`tel:${client.contact_phone}`}
                className="text-gray-800 flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5 text-gray-400" /> {client.contact_phone}
              </a>
            </div>
            {client.address && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Address</p>
                <p className="text-gray-700">{client.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit history */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Audits ({clientAudits.length})
            </h2>
            <button
              onClick={() => router.push(`/audits?client=${clientId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Audit
            </button>
          </div>

          {clientAudits.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No audits for this client yet.
            </div>
          ) : (
            <div className="space-y-3">
              {clientAudits.map((audit) => {
                const items = itemsByAudit.get(audit.id) ?? [];
                const verified = items.filter((i) => i.status === 'verified').length;
                const rejected = items.filter((i) => i.status === 'rejected').length;
                const reviewed = verified + rejected;

                return (
                  <div
                    key={audit.id}
                    onClick={() => router.push(`/audits/${audit.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {audit.audit_type}
                        </p>
                        <StatusBadge value={audit.status} />
                      </div>
                      {items.length > 0 ? (
                        <ProgressBar verified={reviewed} total={items.length} />
                      ) : (
                        <p className="text-xs text-gray-400">No items yet</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(audit.deadline).toLocaleDateString('en-IN')}
                    </p>
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
