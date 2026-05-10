import React from 'react';
import { useRouter } from 'next/router';
import { Camera, Check, X, Trash2, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { VerificationItem } from '@/lib/store';

const ITEM_TYPE_LABELS: Record<string, string> = {
  vehicle: 'Vehicle',
  property: 'Property',
  equipment: 'Equipment',
  inventory: 'Inventory',
  bank_account: 'Bank Account',
  financial_record: 'Financial Record',
  other: 'Other',
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  vehicle: 'bg-blue-50 text-blue-700 border-blue-200',
  property: 'bg-orange-50 text-orange-700 border-orange-200',
  equipment: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  inventory: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  bank_account: 'bg-green-50 text-green-700 border-green-200',
  financial_record: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface Props {
  item: VerificationItem;
  auditId: number;
  evidenceThumbnails?: string[];  // presigned URLs for first 3 photos
  evidenceCount?: number;
  selected?: boolean;
  showCheckbox?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  onVerify?: (id: number) => void;
  onReject?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function VerificationItemCard({
  item,
  auditId,
  evidenceThumbnails = [],
  evidenceCount = 0,
  selected = false,
  showCheckbox = false,
  onSelect,
  onVerify,
  onReject,
  onDelete,
}: Props) {
  const router = useRouter();
  const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? ITEM_TYPE_COLORS.other;

  return (
    <div
      className={`bg-white rounded-xl border transition-all ${
        selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect?.(item.id, e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${typeColor}`}>
                {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
              </span>
              <StatusBadge value={item.status} />
              {item.is_ai_parsed && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded">
                  <AlertTriangle className="w-3 h-3" /> AI parsed
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
            )}
            {item.reference_value && (
              <p className="text-xs text-gray-400 mt-0.5">
                <span className="font-medium text-gray-500">Client claims: </span>
                {item.reference_value}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {item.status === 'evidence_submitted' && (
              <>
                <button
                  onClick={() => onVerify?.(item.id)}
                  title="Verify"
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReject?.(item.id)}
                  title="Reject"
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => onDelete?.(item.id)}
              title="Delete"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Evidence thumbnails */}
        {evidenceCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-1">
              {evidenceThumbnails.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-8 h-8 rounded object-cover border-2 border-white ring-1 ring-gray-200"
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              <Camera className="w-3 h-3 inline mr-0.5" />
              {evidenceCount} photo{evidenceCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="mt-3">
          <button
            onClick={() => router.push(`/audits/${auditId}/item/${item.id}`)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Review Evidence →
          </button>
        </div>
      </div>
    </div>
  );
}
