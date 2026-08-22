import React, { useState, useEffect } from 'react';
import { Order, OrderPriority } from '../types';
import { X, Calendar, User, Tag, DollarSign, FileText, CheckCircle2, AlertCircle, Copy, History, ArrowLeft, ArrowRight } from 'lucide-react';
import { getTodayDateString, formatShortDate, getDaysDifference, parseDate } from '../utils/orderLogic';

interface OrderModalProps {
  isOpen: boolean;
  order: Order | null; // null for new order
  isDuplicate?: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<Order>) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  order,
  isDuplicate = false,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(order) && !isDuplicate;

  const [orderNumber, setOrderNumber] = useState('');
  const [description, setDescription] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerDetails, setCustomerDetails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [priority, setPriority] = useState<OrderPriority>('medium');
  const [amount, setAmount] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [category, setCategory] = useState('Manufacturing');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      if (isDuplicate) {
        setOrderNumber(`${order.orderNumber}-KOPIA`);
        setDescription(order.description);
        setCustomerName(order.customerName);
        setCustomerDetails(order.customerDetails || '');
        const today = getTodayDateString();
        setStartDate(today);
        // Calculate new end date preserving original duration
        const origStart = new Date(order.startDate).getTime();
        const origEnd = new Date(order.endDate).getTime();
        const durationDays = Math.max(1, Math.round((origEnd - origStart) / 86400000));
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + durationDays);
        const nextYr = newEndDate.getFullYear();
        const nextMo = String(newEndDate.getMonth() + 1).padStart(2, '0');
        const nextDy = String(newEndDate.getDate()).padStart(2, '0');
        setEndDate(`${nextYr}-${nextMo}-${nextDy}`);
        setIsCompleted(false);
        setPriority(order.priority || 'medium');
        setAmount(order.amount ?? '');
        setQuantity(order.quantity ?? 1);
        setCategory(order.category || 'Manufacturing');
        setNotes(order.notes || '');
      } else {
        setOrderNumber(order.orderNumber);
        setDescription(order.description);
        setCustomerName(order.customerName);
        setCustomerDetails(order.customerDetails || '');
        setStartDate(order.startDate);
        setEndDate(order.endDate);
        setIsCompleted(order.isCompleted);
        setPriority(order.priority || 'medium');
        setAmount(order.amount ?? '');
        setQuantity(order.quantity ?? 1);
        setCategory(order.category || 'Manufacturing');
        setNotes(order.notes || '');
      }
    } else {
      const today = getTodayDateString();
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);
      const nextYr = nextDate.getFullYear();
      const nextMo = String(nextDate.getMonth() + 1).padStart(2, '0');
      const nextDy = String(nextDate.getDate()).padStart(2, '0');
      const nextWeek = `${nextYr}-${nextMo}-${nextDy}`;
      const randomNum = Math.floor(100 + Math.random() * 900);
      setOrderNumber(`ORD-2026-${randomNum}`);
      setDescription('');
      setCustomerName('');
      setCustomerDetails('');
      setStartDate(today);
      setEndDate(nextWeek);
      setIsCompleted(false);
      setPriority('medium');
      setAmount('');
      setQuantity(1);
      setCategory('Manufacturing');
      setNotes('');
    }
    setError(null);
  }, [order, isDuplicate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setError('Podaj numer zamówienia.');
      return;
    }
    if (!description.trim()) {
      setError('Podaj opis zamówienia.');
      return;
    }
    if (!customerName.trim()) {
      setError('Podaj nazwę klienta lub firmy.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Data rozpoczęcia oraz termin zakończenia są wymagane.');
      return;
    }

    let validStart = startDate;
    let validEnd = endDate;
    if (new Date(validStart) > new Date(validEnd)) {
      // Auto-reconcile if start date is after end date
      validStart = validEnd;
    }

    onSave({
      orderNumber: orderNumber.trim(),
      description: description.trim(),
      customerName: customerName.trim(),
      customerDetails: customerDetails.trim(),
      startDate: validStart,
      endDate: validEnd,
      isCompleted,
      completedDate: isCompleted ? (isEditing ? order?.completedDate : new Date().toISOString().split('T')[0]) : undefined,
      priority,
      amount: amount === '' ? 0 : Number(amount),
      quantity: quantity === '' ? 1 : Number(quantity),
      category: category.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDuplicate && (
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Copy className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                {isDuplicate
                  ? 'Kopiowanie zlecenia'
                  : isEditing
                  ? 'Edycja szczegółów zamówienia'
                  : 'Utwórz nowe zamówienie'}
              </h3>
              <p className="text-xs text-slate-500">
                {isDuplicate
                  ? `Tworzenie nowej kopii na podstawie zlecenia ${order?.orderNumber}`
                  : isEditing
                  ? 'Zaktualizuj harmonogram, klienta i status realizacji'
                  : 'Dodaj zamówienie do dynamicznego monitora i osi Gantta'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Order Number & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Numer zamówienia *
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="np. ZAM-2026/105"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Priorytet
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              >
                <option value="low">Niski priorytet</option>
                <option value="medium">Średni priorytet</option>
                <option value="high">Wysoki priorytet</option>
                <option value="urgent">Pilny / Krytyczny</option>
              </select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Opis zamówienia *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="np. Precyzyjne uchwyty aluminiowe obrabiane CNC"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              required
            />
          </div>

          {/* Row 3: Customer Name & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nazwa klienta / firmy *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="np. AeroDynamics Lab"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dane kontaktowe klienta
              </label>
              <input
                type="text"
                value={customerDetails}
                onChange={(e) => setCustomerDetails(e.target.value)}
                placeholder="np. zaopatrzenie@aerodynamics.pl • Warszawa"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              />
            </div>
          </div>

          {/* Row 4: Start Date & End Date (Deadline) with Backwards Date Support */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Data rozpoczęcia *
                  </span>
                  {startDate && (
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      {formatShortDate(startDate)}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setStartDate(newStart);
                    setError(null);
                    // If user moves start date after current end date, push end date forward
                    if (newStart && endDate && new Date(newStart) > new Date(endDate)) {
                      setEndDate(newStart);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs cursor-pointer"
                  required
                />
                {/* Start Date Quick Presets */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium mr-0.5">Szybki wybór:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayDateString();
                      setStartDate(today);
                      setError(null);
                      if (endDate && new Date(today) > new Date(endDate)) {
                        setEndDate(today);
                      }
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    Dzisiaj
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      const yr = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const dy = String(d.getDate()).padStart(2, '0');
                      const pastDate = `${yr}-${mo}-${dy}`;
                      setStartDate(pastDate);
                      setError(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    -7 dni wstecz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      const yr = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const dy = String(d.getDate()).padStart(2, '0');
                      const pastDate = `${yr}-${mo}-${dy}`;
                      setStartDate(pastDate);
                      setError(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    -30 dni
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Termin zakończenia (Deadline) *
                  </span>
                  {endDate && (
                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                      {formatShortDate(endDate)}
                    </span>
                  )}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setEndDate(newEnd);
                    setError(null);
                    // If user moves end date backwards before start date, auto adjust start date to avoid blocking
                    if (newEnd && startDate && new Date(startDate) > new Date(newEnd)) {
                      setStartDate(newEnd);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs cursor-pointer"
                  required
                />
                {/* End Date Quick Presets */}
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-medium mr-0.5">Szybki wybór:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      const yr = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const dy = String(d.getDate()).padStart(2, '0');
                      const pastDate = `${yr}-${mo}-${dy}`;
                      setEndDate(pastDate);
                      setError(null);
                      if (startDate && new Date(startDate) > new Date(pastDate)) {
                        setStartDate(pastDate);
                      }
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition cursor-pointer"
                    title="Ustaw termin na 7 dni wstecz"
                  >
                    -7 dni wstecz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayDateString();
                      setEndDate(today);
                      setError(null);
                      if (startDate && new Date(startDate) > new Date(today)) {
                        setStartDate(today);
                      }
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    Dzisiaj
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      const yr = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const dy = String(d.getDate()).padStart(2, '0');
                      const nextDate = `${yr}-${mo}-${dy}`;
                      setEndDate(nextDate);
                      setError(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    +7 dni
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 14);
                      const yr = d.getFullYear();
                      const mo = String(d.getMonth() + 1).padStart(2, '0');
                      const dy = String(d.getDate()).padStart(2, '0');
                      const nextDate = `${yr}-${mo}-${dy}`;
                      setEndDate(nextDate);
                      setError(null);
                    }}
                    className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition cursor-pointer"
                  >
                    +14 dni
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline Info Banner */}
            {startDate && endDate && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Czas realizacji:{' '}
                    <strong>
                      {Math.max(1, getDaysDifference(startDate, endDate))}{' '}
                      {Math.max(1, getDaysDifference(startDate, endDate)) === 1 ? 'dzień' : 'dni'}
                    </strong>{' '}
                    ({formatShortDate(startDate)} &rarr; {formatShortDate(endDate)})
                  </span>
                </div>
                {new Date(endDate) < new Date(getTodayDateString()) && !isCompleted && (
                  <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Termin upłynął (zaległe / wsteczne)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Row 5: Financial / Quantity Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kategoria
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="np. Obróbka, Montaż"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Wartość (zł / PLN)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ilość (szt.)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1"
                min="1"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs"
              />
            </div>
          </div>

          {/* Row 6: Status Checkbox (Rule 1) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition" onClick={() => setIsCompleted(!isCompleted)}>
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Status ukończenia zamówienia (Zasada 1)
              </span>
              <span className="text-xs text-slate-500">
                Zaznaczenie aktywuje Zasadę 1: natychmiast zmienia wskaźnik zamówienia na <strong className="text-emerald-700">Zielony</strong>.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Row 7: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Uwagi produkcyjne / wysyłkowe
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodaj uwagi wewnętrzne, numer listu przewozowego, uwagi z kontroli jakości..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                isDuplicate
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isDuplicate && <Copy className="w-3.5 h-3.5" />}
              {isDuplicate ? 'Utwórz kopię zlecenia' : isEditing ? 'Zapisz zmiany' : 'Utwórz zamówienie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
