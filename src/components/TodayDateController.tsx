import React from 'react';
import { Calendar as CalendarIcon, RotateCcw, ChevronLeft, ChevronRight, Play, Info } from 'lucide-react';
import { formatDateString } from '../utils/orderLogic';

interface TodayDateControllerProps {
  todayStr: string;
  onDateChange: (newDate: string) => void;
  onResetToday: () => void;
  systemRealDate: string;
}

export const TodayDateController: React.FC<TodayDateControllerProps> = ({
  todayStr,
  onDateChange,
  onResetToday,
  systemRealDate,
}) => {
  const isSimulated = todayStr !== systemRealDate;

  const shiftDays = (days: number) => {
    const [y, m, d] = todayStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const dy = String(date.getDate()).padStart(2, '0');
    onDateChange(`${yr}-${mo}-${dy}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
      {/* Left Info: Current "Today" Context */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg border ${
          isSimulated ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-900 text-white border-slate-900'
        }`}>
          <CalendarIcon className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data odniesienia (Przerywana linia „Dziś”)
            </span>
            {isSimulated ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Symulacja daty
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Bieżąca data systemowa
              </span>
            )}
          </div>
          <p className="text-base font-bold text-slate-900 flex items-center gap-2">
            {formatDateString(todayStr)}
            <span className="text-xs font-normal text-slate-500 font-mono">({todayStr})</span>
          </p>
        </div>
      </div>

      {/* Center/Right: Stepper & Scrubber controls to move the dashed line */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => shiftDays(-1)}
            className="p-1.5 rounded hover:bg-white hover:shadow-xs text-slate-700 transition"
            title="Cofnij o 1 dzień"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => shiftDays(-7)}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-xs rounded transition"
            title="Cofnij o 7 dni (1 tydzień)"
          >
            -7 dni
          </button>
          <button
            onClick={() => shiftDays(1)}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-xs rounded transition"
            title="Przesuń o +1 dzień w przód (Przesuwa przerywaną linię)"
          >
            +1 dzień
          </button>
          <button
            onClick={() => shiftDays(7)}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:shadow-xs rounded transition"
            title="Przesuń o +7 dni (Testuj progi opóźnienia)"
          >
            +7 dni
          </button>
          <button
            onClick={() => shiftDays(1)}
            className="p-1.5 rounded hover:bg-white hover:shadow-xs text-slate-700 transition"
            title="Przesuń o +1 dzień"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Date Input */}
        <input
          type="date"
          value={todayStr}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs cursor-pointer"
          title="Wybierz niestandardową datę odniesienia"
        />

        {/* Reset to Actual Today button */}
        {isSimulated && (
          <button
            onClick={onResetToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
            title="Przywróć bieżącą datę kalendarzową"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Wróć do dzisiaj
          </button>
        )}
      </div>
    </div>
  );
};
