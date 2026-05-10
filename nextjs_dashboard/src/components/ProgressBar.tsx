import React from 'react';

interface Props {
  verified: number;
  total: number;
  showLabel?: boolean;
}

export default function ProgressBar({ verified, total, showLabel = true }: Props) {
  const pct = total === 0 ? 0 : Math.round((verified / total) * 100);
  const color =
    pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-yellow-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 tabular-nums shrink-0">
          {verified}/{total}
        </span>
      )}
    </div>
  );
}
