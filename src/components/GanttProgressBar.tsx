import React from 'react';
import { calculateOrderMetrics, formatShortDate } from '../utils/orderLogic';
import { Order } from '../types';
import { CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react';

interface GanttProgressBarProps {
  order: Order;
  todayStr: string;
  showLabels?: boolean;
  compact?: boolean;
}

export const GanttProgressBar: React.FC<GanttProgressBarProps> = ({
  order,
  todayStr,
  showLabels = true,
  compact = false,
}) => {
  const metrics = calculateOrderMetrics(order, todayStr);
  const {
    status,
    percentElapsed,
    todayMarkerPercent,
    daysTotal,
    daysRemaining,
    isCompleted,
    isLate,
  } = metrics;

  // Clamped position of the today dashed line for display inside the bar frame
  const markerClamped = Math.min(100, Math.max(0, todayMarkerPercent));

  // Determine bar theme based on the 3 core rules
  let barBg = 'bg-slate-100 dark:bg-slate-800';
  let fillBg = 'bg-blue-500';
  let dashedLineColor = 'border-slate-800';
  let badgeColor = 'text-slate-700 bg-slate-100 border-slate-200';

  if (isCompleted) {
    // Rule 1: Completed -> Green
    fillBg = 'bg-emerald-500';
    barBg = 'bg-emerald-50';
    dashedLineColor = 'border-emerald-700';
    badgeColor = 'text-emerald-800 bg-emerald-100/90 border-emerald-300';
  } else if (isLate) {
    // Rule 2: Not completed & Today > End Date -> Red
    fillBg = 'bg-rose-500';
    barBg = 'bg-rose-50';
    dashedLineColor = 'border-rose-700';
    badgeColor = 'text-rose-800 bg-rose-100/90 border-rose-300 animate-pulse';
  } else {
    // Rule 3: Neutral / On Track (Amber if due soon <= 2 days, else Slate/Indigo)
    if (status === 'due_soon') {
      fillBg = 'bg-amber-500';
      barBg = 'bg-amber-50';
      dashedLineColor = 'border-amber-700';
      badgeColor = 'text-amber-800 bg-amber-100/90 border-amber-300';
    } else {
      fillBg = 'bg-indigo-500';
      barBg = 'bg-slate-100';
      dashedLineColor = 'border-slate-800';
      badgeColor = 'text-slate-700 bg-slate-100 border-slate-200';
    }
  }

  return (
    <div className="w-full select-none" title={`Start: ${order.startDate} | Termin: ${order.endDate} | Status: ${metrics.statusLabel}`}>
      {/* Top micro dates & status badge if showLabels */}
      {showLabels && !compact && (
        <div className="flex items-center justify-between text-xs mb-1.5 text-slate-600 font-medium">
          <span className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">Od:</span>
            <span>{formatShortDate(order.startDate)}</span>
          </span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
            {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />}
            {isLate && <AlertTriangle className="w-3 h-3 text-rose-600 inline" />}
            {!isCompleted && !isLate && <Clock className="w-3 h-3 text-indigo-600 inline" />}
            {metrics.statusText}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500">Do:</span>
            <span className={isLate ? 'font-bold text-rose-600' : ''}>{formatShortDate(order.endDate)}</span>
          </span>
        </div>
      )}

      {/* Main Gantt Progress Track */}
      <div
        className={`relative w-full rounded-md overflow-visible border transition-all ${
          compact ? 'h-3.5' : 'h-5'
        } ${barBg} ${
          isLate ? 'border-rose-300 ring-1 ring-rose-200' : isCompleted ? 'border-emerald-300' : 'border-slate-200'
        }`}
      >
        {/* Shaded elapsed progress bar */}
        <div
          className={`h-full rounded-sm transition-all duration-300 relative ${fillBg}`}
          style={{ width: `${isCompleted ? 100 : percentElapsed}%` }}
        >
          {/* Subtle striped pattern on active progress */}
          {!isCompleted && (
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] bg-[length:12px_12px]" />
          )}
        </div>

        {/* Vertical Dashed Line representing "Today" */}
        <div
          className="absolute top-[-4px] bottom-[-4px] z-10 pointer-events-none transition-all duration-300"
          style={{ left: `${markerClamped}%` }}
        >
          {/* Dashed vertical marker */}
          <div
            className={`h-full border-r-2 border-dashed ${dashedLineColor} shadow-[0_0_2px_rgba(0,0,0,0.3)]`}
          />
          {/* Micro indicator pin on top if not compact */}
          {!compact && (
            <div className="absolute -top-2 -translate-x-1/2 flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-slate-900 ring-2 ring-white" />
            </div>
          )}
        </div>

        {/* Overdue Overflow Warning Pin if today is past the end date and order not completed */}
        {isLate && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20">
            <span className="flex h-3.5 w-3.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border border-white items-center justify-center text-[8px] text-white font-bold">!</span>
            </span>
          </div>
        )}
      </div>

      {/* Footer labels if compact mode */}
      {compact && showLabels && (
        <div className="flex items-center justify-between text-[10px] mt-1 text-slate-500">
          <span>{formatShortDate(order.startDate)}</span>
          <span className={`font-semibold ${isLate ? 'text-rose-600' : isCompleted ? 'text-emerald-600' : 'text-slate-600'}`}>
            {metrics.statusText}
          </span>
          <span className={isLate ? 'text-rose-600 font-bold' : ''}>{formatShortDate(order.endDate)}</span>
        </div>
      )}
    </div>
  );
};
