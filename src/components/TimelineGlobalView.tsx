import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { calculateOrderMetrics, formatShortDate, parseDate, getDaysDifference } from '../utils/orderLogic';
import { Check, CheckCircle2, AlertTriangle, Clock, Calendar, ZoomIn, ZoomOut, Eye } from 'lucide-react';

interface TimelineGlobalViewProps {
  orders: Order[];
  todayStr: string;
  onToggleComplete: (id: string) => void;
  onSelectOrder: (order: Order) => void;
}

export const TimelineGlobalView: React.FC<TimelineGlobalViewProps> = ({
  orders,
  todayStr,
  onToggleComplete,
  onSelectOrder,
}) => {
  const [zoomLevel, setZoomLevel] = useState<'normal' | 'wide' | 'compact'>('normal');

  // Compute earliest start date and latest end date across all orders
  const { minDate, maxDate, totalTimelineDays, dateRangeList } = useMemo(() => {
    if (orders.length === 0) {
      const today = parseDate(todayStr);
      const min = new Date(today.getTime() - 7 * 86400000);
      const max = new Date(today.getTime() + 21 * 86400000);
      const list: { date: Date; dateStr: string; isToday: boolean; isWeekend: boolean }[] = [];
      const totalDays = 28;
      for (let i = 0; i <= totalDays; i++) {
        const cur = new Date(min.getTime() + i * 86400000);
        const yr = cur.getFullYear();
        const mo = String(cur.getMonth() + 1).padStart(2, '0');
        const dy = String(cur.getDate()).padStart(2, '0');
        const curStr = `${yr}-${mo}-${dy}`;
        list.push({
          date: cur,
          dateStr: curStr,
          isToday: curStr === todayStr,
          isWeekend: cur.getDay() === 0 || cur.getDay() === 6,
        });
      }
      return {
        minDate: min,
        maxDate: max,
        totalTimelineDays: 28,
        dateRangeList: list,
      };
    }

    let min = parseDate(orders[0].startDate);
    let max = parseDate(orders[0].endDate);
    const today = parseDate(todayStr);

    // Ensure today is in bounds
    if (today < min) min = new Date(today);
    if (today > max) max = new Date(today);

    orders.forEach((o) => {
      const s = parseDate(o.startDate);
      const e = parseDate(o.endDate);
      if (s < min) min = new Date(s);
      if (e > max) max = new Date(e);
    });

    // Add padding days to start and end
    const paddedMin = new Date(min.getTime() - 3 * 86400000);
    const paddedMax = new Date(max.getTime() + 5 * 86400000);
    const totalDays = Math.max(7, getDaysDifference(paddedMin, paddedMax));

    // Generate list of dates for headers
    const list: { date: Date; dateStr: string; isToday: boolean; isWeekend: boolean }[] = [];
    for (let i = 0; i <= totalDays; i++) {
      const cur = new Date(paddedMin.getTime() + i * 86400000);
      const yr = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, '0');
      const dy = String(cur.getDate()).padStart(2, '0');
      const curStr = `${yr}-${mo}-${dy}`;
      const dayOfWeek = cur.getDay();
      list.push({
        date: cur,
        dateStr: curStr,
        isToday: curStr === todayStr,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return {
      minDate: paddedMin,
      maxDate: paddedMax,
      totalTimelineDays: totalDays,
      dateRangeList: list,
    };
  }, [orders, todayStr]);

  // Calculate today's global position percentage across the timeline
  const todayPositionPercent = useMemo(() => {
    if (totalTimelineDays <= 0) return 0;
    const daysFromMin = getDaysDifference(minDate, todayStr);
    return Math.min(100, Math.max(0, (daysFromMin / totalTimelineDays) * 100));
  }, [minDate, todayStr, totalTimelineDays]);

  const columnWidthClass = zoomLevel === 'compact' ? 'min-w-[28px]' : zoomLevel === 'wide' ? 'min-w-[64px]' : 'min-w-[42px]';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* View Toolbar Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Zbiorcza tablica osi czasu Gantta</h3>
            <p className="text-xs text-slate-500">
              Zsynchronizowany widok ze wspólnym <span className="font-semibold text-slate-800">pionowym znacznikiem „Dziś”</span> przecinającym wszystkie zamówienia.
            </p>
          </div>
        </div>

        {/* Zoom Controls & Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-slate-200">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Zakończone (Zielony)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Po terminie (Czerwony)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> W toku
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 border-b-2 border-dashed border-slate-900"></span> Znacznik Dziś
            </span>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
            <button
              onClick={() => setZoomLevel('compact')}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                zoomLevel === 'compact' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Widok kompaktowy"
            >
              Kompaktowy
            </button>
            <button
              onClick={() => setZoomLevel('normal')}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                zoomLevel === 'normal' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Widok standardowy"
            >
              Standardowy
            </button>
            <button
              onClick={() => setZoomLevel('wide')}
              className={`px-2 py-1 rounded text-xs font-medium transition ${
                zoomLevel === 'wide' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Widok szeroki"
            >
              Szeroki
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Grid Scroll Container */}
      <div className="overflow-x-auto relative max-h-[640px] select-none">
        <div className="inline-min-w-full">
          {/* Header Row: Dates */}
          <div className="flex border-b border-slate-200 bg-slate-100/80 sticky top-0 z-20">
            {/* Left frozen column: Order Name / Customer */}
            <div className="w-64 min-w-[256px] max-w-[256px] px-4 py-2.5 bg-slate-100 border-r border-slate-200 font-semibold text-xs text-slate-700 uppercase tracking-wider sticky left-0 z-30 shadow-[2px_0_4px_rgba(0,0,0,0.03)] flex items-center justify-between">
              <span>Szczegóły zamówienia</span>
              <span className="text-[10px] text-slate-500 font-normal">Ptak = Zrobione</span>
            </div>

            {/* Date Columns Header */}
            <div className="flex relative">
              {dateRangeList.map((d, idx) => {
                const dayNum = d.date.getDate();
                const monthShort = d.date.toLocaleDateString('pl-PL', { month: 'short' });
                return (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center py-2 px-1 border-r border-slate-200 text-center ${columnWidthClass} ${
                      d.isToday
                        ? 'bg-indigo-100/70 text-indigo-950 font-bold'
                        : d.isWeekend
                        ? 'bg-slate-50/80 text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] uppercase">{monthShort}</span>
                    <span className={`text-xs ${d.isToday ? 'text-indigo-900 font-extrabold underline decoration-2 decoration-indigo-600' : 'font-semibold'}`}>
                      {dayNum}
                    </span>
                    {d.isToday && (
                      <span className="inline-block mt-0.5 px-1 bg-indigo-600 text-white text-[9px] font-bold rounded-sm uppercase tracking-tighter">
                        Dziś
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Rows */}
          <div className="relative">
            {/* Continuous Vertical Dashed Line across the whole grid */}
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                left: `calc(256px + ${todayPositionPercent}%)`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="h-full border-r-2 border-dashed border-slate-900 opacity-90 shadow-[0_0_4px_rgba(0,0,0,0.4)]" />
              <div className="sticky top-12 -ml-2.5 px-1.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-bold shadow-md whitespace-nowrap">
                Dziś ({formatShortDate(todayStr)})
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                Brak zamówień spełniających kryteria.
              </div>
            ) : (
              orders.map((order) => {
                const metrics = calculateOrderMetrics(order, todayStr);
                const { isCompleted, isLate, status } = metrics;

                // Calculate relative bar coordinates
                const daysFromMin = getDaysDifference(minDate, order.startDate);
                const orderDuration = Math.max(1, getDaysDifference(order.startDate, order.endDate));
                const leftPercent = Math.max(0, (daysFromMin / totalTimelineDays) * 100);
                const widthPercent = Math.max(1.5, (orderDuration / totalTimelineDays) * 100);

                // Row colors based on Rules
                let rowBgClass = 'hover:bg-slate-50/80';
                let barColorClass = 'bg-indigo-600 text-white';
                let barBorderClass = 'border-indigo-700';

                if (isCompleted) {
                  rowBgClass = 'bg-emerald-50/30 hover:bg-emerald-50/60';
                  barColorClass = 'bg-emerald-600 text-white';
                  barBorderClass = 'border-emerald-700';
                } else if (isLate) {
                  rowBgClass = 'bg-rose-50/40 hover:bg-rose-50/70';
                  barColorClass = 'bg-rose-600 text-white';
                  barBorderClass = 'border-rose-700';
                } else if (status === 'due_soon') {
                  barColorClass = 'bg-amber-600 text-white';
                  barBorderClass = 'border-amber-700';
                }

                return (
                  <div
                    key={order.id}
                    className={`flex border-b border-slate-200 transition-colors group relative ${rowBgClass}`}
                  >
                    {/* Left Sticky Details Card */}
                    <div className="w-64 min-w-[256px] max-w-[256px] p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50/90 sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.03)] flex items-center gap-2.5">
                      {/* Checkbox trigger with rule 1 visual feedback */}
                      <button
                        onClick={() => onToggleComplete(order.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-700 text-white'
                            : 'border-slate-300 hover:border-slate-500 bg-white'
                        }`}
                        title={isCompleted ? 'Oznacz jako nieukończone' : 'Oznacz jako ukończone (Zasada 1 -> Zielony)'}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelectOrder(order)}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-xs font-bold text-slate-900 truncate">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : isLate
                                ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isCompleted ? 'Zrobione' : isLate ? `${Math.abs(metrics.daysRemaining)} dni opóźn.` : `${metrics.daysRemaining} dni`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium truncate mt-0.5" title={order.description}>
                          {order.description}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {order.customerName}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Gantt Track Row */}
                    <div className="flex-1 relative flex items-center py-2 px-1 min-h-[56px]">
                      {/* Visual Day Grid Background Lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {dateRangeList.map((d, idx) => (
                          <div
                            key={idx}
                            className={`border-r border-slate-100 h-full ${columnWidthClass} ${
                              d.isWeekend ? 'bg-slate-50/50' : ''
                            }`}
                          />
                        ))}
                      </div>

                      {/* Order Horizontal Schedule Bar */}
                      <div
                        className="absolute h-9 rounded-lg shadow-sm border flex items-center justify-between px-2 cursor-pointer transition-all hover:ring-2 hover:ring-slate-900/30 group/bar z-10 overflow-hidden"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        onClick={() => onSelectOrder(order)}
                      >
                        {/* Shaded Background & Striping */}
                        <div className={`absolute inset-0 ${barColorClass}`} />
                        
                        {/* Progress Fill inside the bar up to today's fraction */}
                        {!isCompleted && metrics.percentElapsed > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 bg-black/20"
                            style={{ width: `${metrics.percentElapsed}%` }}
                          />
                        )}

                        {/* Text Label inside the bar */}
                        <div className="relative z-10 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis drop-shadow-sm">
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : isLate ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-200" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-200" />
                          )}
                          <span className="truncate">{order.orderNumber}</span>
                          <span className="opacity-90 font-normal text-[11px] hidden md:inline">
                            ({formatShortDate(order.startDate)} - {formatShortDate(order.endDate)})
                          </span>
                        </div>

                        {/* Right side status badge inside bar */}
                        <div className="relative z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/25 text-white shrink-0 ml-1">
                          {metrics.statusText}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
