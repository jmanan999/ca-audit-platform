import React from 'react';

const COLORS: Record<string, string> = {
  // Audit status
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-red-100 text-red-700',
  // Verification item status
  pending: 'bg-gray-100 text-gray-600',
  evidence_submitted: 'bg-purple-100 text-purple-700',
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  // Risk
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  under_review: 'Under Review',
  completed: 'Completed',
  on_hold: 'On Hold',
  pending: 'Pending',
  evidence_submitted: 'Evidence Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

interface Props {
  value: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ value, size = 'sm' }: Props) {
  const cls = COLORS[value] ?? 'bg-gray-100 text-gray-600';
  const padding = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${padding} ${cls}`}>
      {LABELS[value] ?? value.replace(/_/g, ' ')}
    </span>
  );
}
