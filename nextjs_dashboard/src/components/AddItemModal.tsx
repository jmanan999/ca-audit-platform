import React, { useState } from 'react';
import { X } from 'lucide-react';
import { VerificationItem, ItemType } from '@/lib/store';
import { verificationItemsAPI } from '@/lib/api';

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'property', label: 'Property' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'financial_record', label: 'Financial Record' },
  { value: 'other', label: 'Other' },
];

interface Props {
  auditId: number;
  onClose: () => void;
  onCreated: (item: VerificationItem) => void;
}

const defaultForm = {
  title: '',
  description: '',
  item_type: 'other' as ItemType,
  reference_value: '',
};

export default function AddItemModal({ auditId, onClose, onCreated }: Props) {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await verificationItemsAPI.create(auditId, {
        audit_id: auditId,
        title: form.title,
        description: form.description || undefined,
        item_type: form.item_type,
        reference_value: form.reference_value || undefined,
        is_ai_parsed: false,
      });
      onCreated(res.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to create item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Add Verification Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Toyota Camry — MH12AB1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={form.item_type}
              onChange={(e) => setForm((f) => ({ ...f, item_type: e.target.value as ItemType }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Client's claim / Reference value
            </label>
            <input
              value={form.reference_value}
              onChange={(e) => setForm((f) => ({ ...f, reference_value: e.target.value }))}
              placeholder="e.g. Reg. No. MH12AB1234, Value ₹12L"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Additional details for the executive"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {submitting ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
