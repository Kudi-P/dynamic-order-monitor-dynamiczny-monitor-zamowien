import React from 'react';
import { Order } from '../types';
import { calculateOrderMetrics, formatShortDate } from '../utils/orderLogic';
import { GanttProgressBar } from './GanttProgressBar';
import { Check, MoreHorizontal, Edit2, Trash2, ExternalLink, AlertCircle, Sparkles, Paperclip, Copy } from 'lucide-react';

interface OrderRowProps {
  order: Order;
  todayStr: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onEdit: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
}

export const OrderRow: React.FC<OrderRowProps> = ({
  order,
  todayStr,
  isSelected,
  onToggleSelect,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onViewDetails,
}) => {
  const metrics = calculateOrderMetrics(order, todayStr);
  const { isCompleted, isLate, status } = metrics;

  // Determine row highlights according to Business Rules
  let rowClass = 'hover:bg-slate-50/80 bg-white';
  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (isCompleted) {
    // Rule 1: Green
    rowClass = 'bg-emerald-50/40 hover:bg-emerald-50/70 text-slate-900';
    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
  } else if (isLate) {
    // Rule 2: Red
    rowClass = 'bg-rose-50/50 hover:bg-rose-50/80 text-slate-900 border-l-4 border-l-rose-500';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse';
  } else if (status === 'due_soon') {
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
  }

  return (
    <tr className={`border-b border-slate-200 transition-colors ${rowClass}`}>
      {/* Selection Checkbox */}
      <td className="py-3 px-3 w-10 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(order.id)}
          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
        />
      </td>

      {/* Status Checkmark (Rule 1 Trigger) */}
      <td className="py-3 px-3 w-12 text-center">
        <button
          onClick={() => onToggleComplete(order.id)}
          className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center border-2 transition-all ${
            isCompleted
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
              : isLate
              ? 'border-rose-400 hover:border-rose-600 bg-white hover:bg-rose-50 text-rose-500'
              : 'border-slate-300 hover:border-slate-600 bg-white text-transparent hover:text-slate-400'
          }`}
          title={isCompleted ? 'Oznacz jako nieukończone' : 'Kliknij, aby zakończyć (Zasada 1: kolor zielony)'}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </button>
      </td>

      {/* Order Number & Category */}
      <td className="py-3 px-3 whitespace-nowrap">
        <div className="flex flex-col">
          <button
            onClick={() => onViewDetails(order)}
            className="font-mono text-xs font-bold text-slate-900 hover:text-indigo-600 text-left transition flex items-center gap-1.5 group"
          >
            <span>{order.orderNumber}</span>
            {order.driveAttachments && order.driveAttachments.length > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-sans font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
                title={`${order.driveAttachments.length} załączników z Google Drive`}
              >
                <Paperclip className="w-2.5 h-2.5" />
                {order.driveAttachments.length}
              </span>
            )}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
          </button>
          {order.category && (
            <span className="text-[10px] text-slate-500 font-medium">{order.category}</span>
          )}
        </div>
      </td>

      {/* Order Description */}
      <td className="py-3 px-3 min-w-[200px] max-w-[280px]">
        <div
          onClick={() => onViewDetails(order)}
          className="text-xs font-semibold text-slate-800 hover:text-indigo-700 cursor-pointer line-clamp-2 leading-relaxed"
          title={order.description}
        >
          {order.description}
        </div>
        {order.notes && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5" title={order.notes}>
            {order.notes}
          </p>
        )}
      </td>

      {/* Customer Name & Details */}
      <td className="py-3 px-3 min-w-[160px] max-w-[220px]">
        <div className="text-xs font-semibold text-slate-800 truncate">{order.customerName}</div>
        {order.customerDetails && (
          <div className="text-[11px] text-slate-500 truncate mt-0.5">{order.customerDetails}</div>
        )}
      </td>

      {/* Schedule Dates */}
      <td className="py-3 px-3 whitespace-nowrap text-xs text-slate-600">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] text-slate-500 font-mono">
            Od: <strong className="text-slate-700">{formatShortDate(order.startDate)}</strong>
          </span>
          <span className={`text-[11px] font-mono ${isLate ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
            Do: <strong>{formatShortDate(order.endDate)}</strong>
          </span>
        </div>
      </td>

      {/* THE CHART COLUMN: Gantt-style Visual Progress Bar with Dashed Today Line */}
      <td className="py-3 px-3 min-w-[240px] max-w-[320px]">
        <GanttProgressBar order={order} todayStr={todayStr} showLabels={true} compact={false} />
      </td>

      {/* Calculated Status Badge */}
      <td className="py-3 px-3 whitespace-nowrap text-center">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border ${badgeClass}`}>
          {isCompleted && <Check className="w-3.5 h-3.5" />}
          {isLate && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
          {metrics.statusLabel}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onDuplicate(order)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
            title="Kopiuj / Duplikuj zlecenie"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(order)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Edytuj zamówienie"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(order.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Usuń zamówienie"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};
