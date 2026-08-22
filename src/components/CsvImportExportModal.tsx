import React, { useState, useRef } from 'react';
import { Order } from '../types';
import { exportOrdersToCsv, parseCsvToOrders, SAMPLE_ORDERS } from '../utils/orderLogic';
import { X, Download, Upload, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface CsvImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onImportOrders: (importedOrders: Partial<Order>[], replaceExisting: boolean) => void;
  onResetDefaults: () => void;
}

export const CsvImportExportModal: React.FC<CsvImportExportModalProps> = ({
  isOpen,
  onClose,
  orders,
  onImportOrders,
  onResetDefaults,
}) => {
  const [csvText, setCsvText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [previewOrders, setPreviewOrders] = useState<Partial<Order>[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const csvContent = exportOrdersToCsv(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage({ type: 'success', text: `Pomyślnie wyeksportowano ${orders.length} zamówień do pliku CSV.` });
  };

  const handleDownloadSampleTemplate = () => {
    const sampleCsv = exportOrdersToCsv(SAMPLE_ORDERS.slice(0, 3));
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'szablon_zamowien.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setCsvText(content);
      try {
        const parsed = parseCsvToOrders(content);
        setPreviewOrders(parsed);
        if (parsed.length === 0) {
          setMessage({ type: 'error', text: 'Nie znaleziono poprawnych wierszy zamówień w pliku CSV.' });
        } else {
          setMessage({ type: 'success', text: `Rozpoznano ${parsed.length} zamówień gotowych do zaimportowania.` });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Wystąpił błąd podczas przetwarzania formatu pliku CSV.' });
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setPreviewOrders([]);
      return;
    }
    try {
      const parsed = parseCsvToOrders(text);
      setPreviewOrders(parsed);
    } catch {
      // ignore live syntax errors during typing
    }
  };

  const handleApplyImport = () => {
    if (previewOrders.length === 0) {
      setMessage({ type: 'error', text: 'Wgraj plik lub wklej poprawne dane CSV.' });
      return;
    }
    onImportOrders(previewOrders, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Import i Eksport Zamówień (Excel / CSV)</h3>
              <p className="text-xs text-slate-500">Synchronizuj z arkuszami kalkulacyjnymi lub utwórz kopię zapasową</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {message && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-semibold ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Quick Actions (Export & Sample Template) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-slate-800 block">Eksportuj wszystkie zamówienia</span>
                <span className="text-[11px] text-slate-500">Pobierz plik .CSV ({orders.length} wierszy)</span>
              </div>
              <Download className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition" />
            </button>

            <button
              type="button"
              onClick={handleDownloadSampleTemplate}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-left transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-slate-800 block">Pobierz szablon CSV</span>
                <span className="text-[11px] text-slate-500">Wzorcowe nagłówki kolumn i formaty dat</span>
              </div>
              <FileText className="w-4 h-4 text-slate-600 group-hover:text-slate-900 transition" />
            </button>
          </div>

          {/* Upload / Paste Section */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Wczytaj plik CSV lub wklej tekst
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,text/csv"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Wybierz plik z dysku
              </button>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Wklej wartości oddzielone przecinkami (Nagłówki: Numer zamówienia, Opis zamówienia, Klient, Dane kontaktowe, Data rozpoczęcia, Termin zakończenia, Czy zrobione, ...)"
              rows={4}
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-xs resize-none"
            />

            {previewOrders.length > 0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900">
                    Podgląd: wykryto {previewOrders.length} zamówień
                  </span>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Zastąp wszystkie dotychczasowe zamówienia
                  </label>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-indigo-800">
                  {previewOrders.slice(0, 5).map((po, idx) => (
                    <div key={idx} className="flex justify-between border-b border-indigo-100 py-0.5">
                      <span className="font-mono font-bold">{po.orderNumber}</span>
                      <span className="truncate max-w-[200px]">{po.description}</span>
                      <span>{po.startDate} &rarr; {po.endDate}</span>
                    </div>
                  ))}
                  {previewOrders.length > 5 && (
                    <p className="text-center italic text-indigo-600">...oraz {previewOrders.length - 5} kolejnych</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Demo Data Button */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onResetDefaults();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Przywróć dane demo
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Zamknij
              </button>
              {previewOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Zaimportuj {previewOrders.length} zamówień
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
