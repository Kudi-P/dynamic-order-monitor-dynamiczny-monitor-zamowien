import React from 'react';
import { Order } from '../types';
import { calculateOrderMetrics } from '../utils/orderLogic';
import { CheckCircle2, AlertTriangle, Clock, Layers, DollarSign, Percent, ShieldCheck } from 'lucide-react';

interface MetricsHeaderProps {
  orders: Order[];
  todayStr: string;
  onFilterChange: (status: 'all' | 'in_progress' | 'overdue' | 'completed' | 'due_soon') => void;
  activeFilter: string;
}

export const MetricsHeader: React.FC<MetricsHeaderProps> = ({
  orders,
  todayStr,
  onFilterChange,
  activeFilter,
}) => {
  const stats = React.useMemo(() => {
    let completedCount = 0;
    let overdueCount = 0;
    let inProgressCount = 0;
    let dueSoonCount = 0;
    let totalValue = 0;
    let completedValue = 0;

    orders.forEach((o) => {
      const m = calculateOrderMetrics(o, todayStr);
      if (m.isCompleted) {
        completedCount++;
        completedValue += o.amount || 0;
      } else if (m.isLate) {
        overdueCount++;
      } else if (m.status === 'due_soon') {
        dueSoonCount++;
        inProgressCount++;
      } else {
        inProgressCount++;
      }
      totalValue += o.amount || 0;
    });

    const total = orders.length;
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const onTrackRate = total > 0 ? Math.round(((total - overdueCount) / total) * 100) : 100;

    return {
      total,
      completedCount,
      overdueCount,
      inProgressCount,
      dueSoonCount,
      totalValue,
      completedValue,
      completionRate,
      onTrackRate,
    };
  }, [orders, todayStr]);

  return (
    <div className="space-y-3">
      {/* 4 Interactive KPI Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Orders */}
        <button
          onClick={() => onFilterChange('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${activeFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Wszystkie zamówienia
            </span>
            <Layers className={`w-4 h-4 ${activeFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black">{stats.total}</span>
            <span className={`text-xs font-medium ${activeFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              {(stats.totalValue / 1000).toFixed(1)} tys. zł
            </span>
          </div>
        </button>

        {/* Completed (Rule 1: Green) */}
        <button
          onClick={() => onFilterChange('completed')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-emerald-50/50 text-slate-800 border-emerald-200 hover:bg-emerald-50 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${activeFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700'}`}>
              Zakończone (Zasada 1)
            </span>
            <CheckCircle2 className={`w-4 h-4 ${activeFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${activeFilter === 'completed' ? 'text-white' : 'text-emerald-900'}`}>
              {stats.completedCount}
            </span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${activeFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {stats.completionRate}% Ukończono
            </span>
          </div>
        </button>

        {/* Overdue (Rule 2: Red) */}
        <button
          onClick={() => onFilterChange('overdue')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-500/20'
              : stats.overdueCount > 0
              ? 'bg-rose-50/60 text-slate-800 border-rose-200 hover:bg-rose-50 hover:shadow-xs'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${activeFilter === 'overdue' ? 'text-rose-100' : stats.overdueCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
              Po terminie (Zasada 2)
            </span>
            <AlertTriangle className={`w-4 h-4 ${activeFilter === 'overdue' ? 'text-rose-100' : stats.overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black ${activeFilter === 'overdue' ? 'text-white' : stats.overdueCount > 0 ? 'text-rose-900' : 'text-slate-700'}`}>
              {stats.overdueCount}
            </span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${activeFilter === 'overdue' ? 'bg-rose-700 text-white' : stats.overdueCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
              {stats.overdueCount > 0 ? 'Wymaga reakcji' : 'Wszystko w terminie'}
            </span>
          </div>
        </button>

        {/* In Progress / On Track (Rule 3: Neutral) */}
        <button
          onClick={() => onFilterChange('in_progress')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === 'in_progress'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${activeFilter === 'in_progress' ? 'text-indigo-100' : 'text-slate-500'}`}>
              W toku (Zasada 3)
            </span>
            <Clock className={`w-4 h-4 ${activeFilter === 'in_progress' ? 'text-indigo-100' : 'text-indigo-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black">{stats.inProgressCount}</span>
            <span className={`text-xs font-medium ${activeFilter === 'in_progress' ? 'text-indigo-100' : 'text-slate-500'}`}>
              {stats.dueSoonCount > 0 ? `${stats.dueSoonCount} blisko terminu` : 'Zgodnie z planem'}
            </span>
          </div>
        </button>
      </div>

      {/* Visual Hierarchy Rules Badge strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Aktywne reguły statusu:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/80 text-emerald-800 border border-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <strong>Zasada 1:</strong> Zrobione zaznaczone &rarr; Zielony
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-100/80 text-rose-800 border border-rose-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <strong>Zasada 2:</strong> Niezrobione ORAZ Dziś &gt; Termin &rarr; Czerwony
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-200/80 text-slate-800 border border-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <strong>Zasada 3:</strong> Niezrobione ORAZ Dziś &le; Termin &rarr; Neutralny
          </span>
        </div>
      </div>
    </div>
  );
};
