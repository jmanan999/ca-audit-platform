import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import StatusBadge from '@/components/StatusBadge';
import EvidenceGallery from '@/components/EvidenceGallery';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useVerificationItemStore, Document } from '@/lib/store';
import { verificationItemsAPI } from '@/lib/api';
import {
  ArrowLeft, AlertTriangle, Check, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

const ITEM_TYPE_LABELS: Record<string, string> = {
  vehicle: 'Vehicle', property: 'Property', equipment: 'Equipment',
  inventory: 'Inventory', bank_account: 'Bank Account',
  financial_record: 'Financial Record', other: 'Other',
};

export default function ItemReview() {
  const router = useRouter();
  const { id, itemId } = router.query;
  const auditId = id ? parseInt(id as string) : null;
  const itemIdNum = itemId ? parseInt(itemId as string) : null;
  const { ready } = useAuthGuard();

  const items = useVerificationItemStore((s) => s.items);
  const updateItem = useVerificationItemStore((s) => s.updateItem);

  const item = items.find((i) => i.id === itemIdNum) ?? null;
  const auditItems = items.filter((i) => i.audit_id === auditId).sort((a, b) => a.id - b.id);
  const currentIdx = auditItems.findIndex((i) => i.id === itemIdNum);

  const [evidence, setEvidence] = useState<Document[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [caNotes, setCaNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!ready || !itemIdNum) return;
    setLoadingEvidence(true);
    verificationItemsAPI
      .getEvidence(itemIdNum)
      .then((res) => setEvidence(res.data))
      .catch(() => setEvidence([]))
      .finally(() => setLoadingEvidence(false));
  }, [ready, itemIdNum]);

  const navigate = (dir: 'prev' | 'next') => {
    const nextIdx = dir === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx < 0 || nextIdx >= auditItems.length) return;
    router.push(`/audits/${auditId}/item/${auditItems[nextIdx].id}`);
  };

  const handleVerify = async () => {
    if (!itemIdNum) return;
    setSubmitting(true);
    setActionError('');
    try {
      const res = await verificationItemsAPI.update(itemIdNum, {
        status: 'verified',
        ca_notes: caNotes || undefined,
      });
      updateItem(itemIdNum, res.data);
      navigate('next');
    } catch {
      setActionError('Failed to verify item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!itemIdNum || !rejectionReason.trim()) return;
    setSubmitting(true);
    setActionError('');
    try {
      const res = await verificationItemsAPI.update(itemIdNum, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        ca_notes: caNotes || undefined,
      });
      updateItem(itemIdNum, res.data);
      setShowRejectForm(false);
      navigate('next');
    } catch {
      setActionError('Failed to reject item');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <Layout>
        <div className="p-8 text-center text-gray-500 text-sm">Item not found.</div>
      </Layout>
    );
  }

  const alreadyReviewed = item.status === 'verified' || item.status === 'rejected';

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => router.push(`/audits/${auditId}`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Audit
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('prev')}
              disabled={currentIdx <= 0}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500">
              {currentIdx + 1} / {auditItems.length}
            </span>
            <button
              onClick={() => navigate('next')}
              disabled={currentIdx >= auditItems.length - 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — evidence */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Evidence Photos</h2>
              {loadingEvidence ? (
                <div className="py-8 text-center">
                  <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : (
                <EvidenceGallery docs={evidence} />
              )}
            </div>
          </div>

          {/* Right — item details + CA actions */}
          <div className="space-y-4">
            {/* Item info */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                  {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                </span>
                <StatusBadge value={item.status} />
              </div>

              <h1 className="text-base font-bold text-gray-900 mb-1">{item.title}</h1>
              {item.description && (
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              )}
              {item.reference_value && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mt-2">
                  <p className="font-semibold text-gray-700 mb-0.5">Client claims:</p>
                  <p>{item.reference_value}</p>
                </div>
              )}

              {item.is_ai_parsed && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  AI-parsed item — verify details before dispatching to executives.
                </div>
              )}

              {item.rejection_reason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <p className="font-semibold mb-0.5">Rejection reason:</p>
                  <p>{item.rejection_reason}</p>
                </div>
              )}
              {item.ca_notes && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <p className="font-semibold mb-0.5">CA notes:</p>
                  <p>{item.ca_notes}</p>
                </div>
              )}
            </div>

            {/* CA actions */}
            {!alreadyReviewed && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">CA Decision</h2>

                {actionError && (
                  <div className="mb-3 p-2.5 bg-red-50 text-red-700 rounded-lg text-xs">
                    {actionError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={caNotes}
                    onChange={(e) => setCaNotes(e.target.value)}
                    rows={2}
                    placeholder="Observations, remarks…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!showRejectForm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleVerify}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                    >
                      <Check className="w-4 h-4" /> Verify
                    </button>
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rejection reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      placeholder="Why is this item being rejected?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={submitting || !rejectionReason.trim()}
                        className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-200"
                      >
                        {submitting ? 'Rejecting…' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {alreadyReviewed && (
              <div className={`rounded-2xl border p-5 ${
                item.status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm font-semibold ${
                  item.status === 'verified' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {item.status === 'verified' ? '✓ Verified by CA' : '✗ Rejected by CA'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
