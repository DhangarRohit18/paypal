import React from 'react';
import { motion } from 'framer-motion';

export interface BudgetMeterProps {
  current: number;
  limit: number;
  currency?: string;
  variant?: 'bar' | 'ring';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const BudgetMeter: React.FC<BudgetMeterProps> = ({
  current,
  limit,
  currency = 'USD',
  variant = 'bar',
  size = 'md',
  showLabels = true,
  className = '',
}) => {
  const safeLimit = Math.max(limit, 0.01);
  const percentage = Math.min(Math.max((current / safeLimit) * 100, 0), 100);

  // Color tiers: green -> amber -> red
  let statusColor = '#18A873'; // success
  let statusClass = 'text-status-success';
  let statusBg = 'bg-status-success';

  if (percentage >= 90) {
    statusColor = '#E05252'; // danger
    statusClass = 'text-status-danger';
    statusBg = 'bg-status-danger';
  } else if (percentage >= 70) {
    statusColor = '#E9A23B'; // warning
    statusClass = 'text-status-warning';
    statusBg = 'bg-status-warning';
  }

  if (variant === 'ring') {
    const radius = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
    const strokeWidth = size === 'sm' ? 4 : size === 'lg' ? 7 : 5;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const dimension = (radius + strokeWidth) * 2;

    return (
      <div className={`inline-flex flex-col items-center ${className}`}>
        <div className="relative inline-flex items-center justify-center">
          <svg width={dimension} height={dimension} className="-rotate-90">
            {/* Background Circle */}
            <circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-border"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <motion.circle
              cx={dimension / 2}
              cy={dimension / 2}
              r={radius}
              stroke={statusColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold tabular-nums text-text font-mono">
              {Math.round(percentage)}%
            </span>
          </div>
        </div>
        {showLabels && (
          <div className="mt-2 text-center">
            <div className="text-[11px] text-text-muted font-mono">
              <span className="font-bold text-text tabular-nums">${current.toFixed(2)}</span> / ${limit.toFixed(0)} {currency}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: Bar variant
  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          <span className="text-text-muted font-medium">Budget Utilization</span>
          <span className={`font-bold tabular-nums ${statusClass}`}>
            ${current.toFixed(2)} / ${limit.toFixed(0)} {currency} ({Math.round(percentage)}%)
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full bg-border/60 rounded-full h-2 overflow-hidden"
      >
        <motion.div
          className={`h-full rounded-full ${statusBg}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
};

