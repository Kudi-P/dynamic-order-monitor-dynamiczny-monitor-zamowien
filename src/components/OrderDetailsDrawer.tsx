import React from 'react';
import { Order, DriveFileAttachment } from '../types';
import { calculateOrderMetrics, formatDateString, formatShortDate } from '../utils/orderLogic';
import { GanttProgressBar } from './GanttProgressBar';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  Tag,
  DollarSign,
  Package,
  FileText,
  Check,
  Edit2,
  Copy,
  ShieldAlert,
  Paperclip,
  ExternalLink,
  Trash2,
  Plus
} from 'lucide-react';

interface OrderDetailsDrawerProps {
  order: Order | null;
  todayStr: string;
  isOpen: boolean;
  onClose: () => void;
  onToggleComplete: (id: string) => void;
  onEdit: (order: Order) => void;
  onDuplicate?: (order: Order) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onOpenDrivePicker?: (order: Order) => void;
  onRemoveDriveAttachment?: (orderId: string, fileId: string) => void;
}

export const OrderDetailsDrawer: React.FC<OrderDetailsDrawerProps> = ({
  order,
  todayStr,
  isOpen,
  onClose,
  onToggleComplete,
  onEdit,
  onDuplicate,
  onUpdateNotes,
  onOpenDrivePicker,
  onRemoveDriveAttachment,
}) => {
  if (!isOpen || !order) return null;

  const metrics = calculateOrderMetrics(order, todayStr);
  const { isCompleted, isLate, status } = metrics;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-slate-900">{order.orderNumber}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isLate
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {metrics.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Szczegóły zamówienia i oś czasu</p>
            </div>
            <div className="flex items-center gap-1">
              {onDuplicate && (
                <button
                  onClick={() => onDuplicate(order)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  title="Kopiuj / Utwórz kopię zlecenia"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:inline">Kopiuj</span>
                </button>
              )}
              <button
                onClick={() => onEdit(order)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                title="Edytuj zamówienie"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Primary Status Toggle Action */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status realizacji</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isCompleted ? 'Zaznaczono ukończenie (Zasada 1: Zielony)' : 'Nieukończone (oceniane wg Zasad 2 i 3)'}
                </p>
              </div>
              <button
                onClick={() => onToggleComplete(order.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'
                }`}
              >
                {isCompleted ? (
                  <>
                    <Check className="w-4 h-4" /> Zakończone
                  </>
                ) : (
                  'Oznacz jako zrobione'
                )}
              </button>
            </div>

            {/* Description & Customer */}
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Opis</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 leading-relaxed">{order.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" /> Klient
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">{order.customerName}</p>
                  {order.customerDetails && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{order.customerDetails}</p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" /> Szczegóły
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {order.amount ? `${order.amount.toLocaleString('pl-PL')} zł` : 'Brak kwoty'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ilość: {order.quantity || 1} szt. • {order.category || 'Ogólne'}
                  </p>
                </div>
              </div>
            </div>

            {/* Gantt Progress Visualizer */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Wizualny pasek postępu Gantta
              </span>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <GanttProgressBar order={order} todayStr={todayStr} showLabels={true} compact={false} />
                
                {/* Visual Logic Diagnosis */}
                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200 text-slate-600">
                  <div className="flex justify-between">
                    <span>Data rozpoczęcia:</span>
                    <strong className="font-mono text-slate-800">{formatDateString(order.startDate)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Termin zakończenia (Deadline):</span>
                    <strong className={`font-mono ${isLate ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatDateString(order.endDate)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Data odniesienia („Dziś”):</span>
                    <strong className="font-mono text-slate-800">{formatDateString(todayStr)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Czas trwania:</span>
                    <strong className="font-mono text-slate-800">{metrics.daysTotal} dni łącznie</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Aktualna pozycja:</span>
                    <strong className={`font-mono ${isLate ? 'text-rose-600' : isCompleted ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {metrics.statusText}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Rule Explanation */}
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              isCompleted
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : isLate
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isLate ? (
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                ) : (
                  <Clock className="w-4 h-4 text-indigo-600" />
                )}
                <span>Diagnoza aktywnej reguły</span>
              </div>
              {isCompleted ? (
                <p>
                  <strong>Zastosowano Zasadę 1:</strong> Zamówienie jest oznaczone jako ukończone. Nawet po przekroczeniu terminu, ukończone zamówienia zawsze mają kolor <strong className="text-emerald-700">Zielony</strong>.
                </p>
              ) : isLate ? (
                <p>
                  <strong>Zastosowano Zasadę 2:</strong> Zamówienie nie jest ukończone ORAZ Dziś ({todayStr}) jest po terminie ({order.endDate}). To zamówienie ma <strong className="text-rose-700">{Math.abs(metrics.daysRemaining)} dni opóźnienia</strong> i wyświetla się w kolorze <strong className="text-rose-700">Czerwonym</strong>.
                </p>
              ) : (
                <p>
                  <strong>Zastosowano Zasadę 3:</strong> Zamówienie nie jest ukończone ORAZ Dziś ({todayStr}) mieści się w terminie ({order.endDate}). Realizacja przebiega zgodnie z planem, pozostało <strong className="text-slate-900">{metrics.daysRemaining} dni</strong>.
                </p>
              )}
            </div>

            {/* Google Drive Attachments Section */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  Załączniki Google Drive ({order.driveAttachments?.length || 0})
                </span>
                {onOpenDrivePicker && (
                  <button
                    type="button"
                    onClick={() => onOpenDrivePicker(order)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Dołącz plik
                  </button>
                )}
              </div>

              {order.driveAttachments && order.driveAttachments.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {order.driveAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate" title={att.name}>
                          {att.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {att.webViewLink && (
                          <a
                            href={att.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                            title="Otwórz plik na Dysku Google"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {onRemoveDriveAttachment && (
                          <button
                            type="button"
                            onClick={() => onRemoveDriveAttachment(order.id, att.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Odepnij załącznik"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/70 text-slate-400 text-[11px]">
                  Brak dołączonych plików z Dysku Google (rysunków CAD, PDF, specyfikacji).
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Uwagi produkcyjne / wysyłkowe
              </span>
              <textarea
                defaultValue={order.notes || ''}
                onBlur={(e) => onUpdateNotes(order.id, e.target.value)}
                placeholder="Kliknij tutaj, aby wpisać uwagi..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs resize-none"
              />
              <span className="text-[10px] text-slate-400 block">Uwagi zapisują się automatycznie po kliknięciu poza pole.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
