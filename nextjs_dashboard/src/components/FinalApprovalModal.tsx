import React, { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { auditsAPI } from '@/lib/api';

interface Props {
  auditId: number;
  onClose: () => void;
  onApproved: () => void;
}

export default function FinalApprovalModal({ auditId, onClose, onApproved }: Props) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setSubmitting(true);
    setError('');
    try {
      await auditsAPI.finalize(auditId, notes || undefined);
      onApproved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to finalize audit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Finalize Audit</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Ready for final sign-off</p>
              <p className="text-xs text-green-700 mt-0.5">
                This will mark the audit as Completed. This action cannot be undone.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              CA Approval Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Overall findings, observations, or sign-off remarks…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {submitting ? 'Finalizing…' : 'Approve & Close Audit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
