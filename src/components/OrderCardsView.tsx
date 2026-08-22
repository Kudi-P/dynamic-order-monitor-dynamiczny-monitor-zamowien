import React from 'react';
import { Order } from '../types';
import { calculateOrderMetrics, formatShortDate, formatDateString } from '../utils/orderLogic';
import { GanttProgressBar } from './GanttProgressBar';
import { Check, Edit2, Trash2, ExternalLink, AlertTriangle, CheckCircle2, Clock, User, Paperclip, Copy } from 'lucide-react';

interface OrderCardsViewProps {
  orders: Order[];
  todayStr: string;
  onToggleComplete: (id: string) => void;
  onEdit: (order: Order) => void;
  onDuplicate: (order: Order) => void;
  onDelete: (id: string) => void;
  onViewDetails: (order: Order) => void;
}

export const OrderCardsView: React.FC<OrderCardsViewProps> = ({
  orders,
  todayStr,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onDelete,
  onViewDetails,
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        <p className="text-sm font-semibold">Brak zamówień spełniających kryteria filtrów.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {orders.map((order) => {
        const metrics = calculateOrderMetrics(order, todayStr);
        const { isCompleted, isLate, status } = metrics;

        let cardBorder = 'border-slate-200';
        let cardBg = 'bg-white';
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

        if (isCompleted) {
          cardBorder = 'border-emerald-300 ring-1 ring-emerald-200';
          cardBg = 'bg-emerald-50/20';
          badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        } else if (isLate) {
          cardBorder = 'border-rose-300 ring-1 ring-rose-200';
          cardBg = 'bg-rose-50/30';
          badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold';
        } else if (status === 'due_soon') {
          cardBorder = 'border-amber-300';
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        }

        return (
          <div
            key={order.id}
            className={`rounded-xl border p-4.5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${cardBorder} ${cardBg}`}
          >
            {/* Top Bar: Checkmark, Order ID & Status */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onToggleComplete(order.id)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : isLate
                        ? 'border-rose-400 hover:border-rose-600 bg-white text-rose-500'
                        : 'border-slate-300 hover:border-slate-600 bg-white text-transparent'
                    }`}
                    title={isCompleted ? 'Ukończono (Zasada 1)' : 'Kliknij, aby zakończyć (Zasada 1 -> Zielony)'}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <span className="font-mono font-bold text-sm text-slate-900">{order.orderNumber}</span>
                  {order.driveAttachments && order.driveAttachments.length > 0 && (
                    <span
                      className="inline-flex items-center gap-0.5 text-[10px] font-sans font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
                      title={`${order.driveAttachments.length} załączników z Google Drive`}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                      {order.driveAttachments.length}
                    </span>
                  )}
                </div>

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                  {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                  {isLate && <AlertTriangle className="w-3 h-3" />}
                  {!isCompleted && !isLate && <Clock className="w-3 h-3" />}
                  {metrics.statusLabel}
                </span>
              </div>

              {/* Title & Customer */}
              <div className="mt-3 cursor-pointer" onClick={() => onViewDetails(order)}>
                <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-indigo-600 transition">
                  {order.description}
                </h4>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{order.customerName}</span>
                </p>
              </div>
            </div>

            {/* In-Card Visual Gantt Progress Bar with Dashed Today Line */}
            <div className="pt-2 border-t border-slate-100">
              <GanttProgressBar order={order} todayStr={todayStr} showLabels={true} compact={false} />
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px]">
                {order.amount ? `${order.amount.toLocaleString('pl-PL')} zł` : ''}
                {order.category ? ` • ${order.category}` : ''}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onViewDetails(order)}
                  className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  Szczegóły
                </button>
                <button
                  onClick={() => onDuplicate(order)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                  title="Kopiuj zlecenie"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEdit(order)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                  title="Edytuj"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(order.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                  title="Usuń"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
