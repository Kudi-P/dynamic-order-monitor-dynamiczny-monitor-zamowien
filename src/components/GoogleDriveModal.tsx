import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  Upload,
  RefreshCw,
  X,
  FileText,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Check,
  AlertTriangle,
  FolderOpen,
  Search,
  HardDrive
} from 'lucide-react';
import type { Order } from '../types';
import {
  listDriveFiles,
  saveBackupToDrive,
  saveCsvToDrive,
  downloadDriveFileContent,
  deleteDriveFile,
  uploadFileToDrive,
  getOrCreateAppFolder,
  type GoogleDriveFile
} from '../services/googleDrive';
import { exportOrdersToCsv, parseCsvToOrders } from '../utils/orderLogic';
import type { User } from 'firebase/auth';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  todayStr: string;
  onRestoreOrders: (orders: Order[]) => void;
  currentUser: User | null;
  accessToken: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  orders,
  todayStr,
  onRestoreOrders,
  currentUser,
  accessToken,
  onSignIn,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'backups' | 'explorer'>('backups');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Backup files list
  const [backupFiles, setBackupFiles] = useState<GoogleDriveFile[]>([]);
  // Drive explorer files
  const [explorerFiles, setExplorerFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation dialog for destructive operation (skill requirement)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);

  // Uploading file
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveData();
    }
  }, [isOpen, accessToken, activeTab]);

  const loadDriveData = async () => {
    if (!accessToken) return;
    setLoading(true);
    setMessage(null);
    try {
      if (activeTab === 'backups') {
        const result = await listDriveFiles(accessToken, {
          query: 'Order_Tracker',
          pageSize: 20,
        });
        setBackupFiles(result.files);
      } else {
        const result = await listDriveFiles(accessToken, {
          query: searchQuery,
          pageSize: 30,
        });
        setExplorerFiles(result.files);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Nie udało się wczytać plików z Dysku Google.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!accessToken) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const backup = await saveBackupToDrive(accessToken, orders, todayStr);
      setMessage({
        type: 'success',
        text: `Pomyślnie utworzono kopię zapasową "${backup.name}" na Dysku Google w dedykowanym folderze!`,
      });
      loadDriveData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Błąd tworzenia kopii zapasowej.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsvToDrive = async () => {
    if (!accessToken) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const csv = exportOrdersToCsv(orders);
      const file = await saveCsvToDrive(accessToken, csv, todayStr);
      setMessage({
        type: 'success',
        text: `Pomyślnie zapisano plik CSV "${file.name}" na Twoim Dysku Google!`,
      });
      loadDriveData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Błąd zapisu pliku CSV na Dysk Google.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreBackup = async (file: GoogleDriveFile) => {
    if (!accessToken) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const content = await downloadDriveFileContent(accessToken, file.id);
      if (file.name.endsWith('.json') || file.mimeType === 'application/json') {
        const parsed = JSON.parse(content);
        if (parsed.orders && Array.isArray(parsed.orders)) {
          onRestoreOrders(parsed.orders);
          setMessage({
            type: 'success',
            text: `Pomyślnie przywrócono ${parsed.orders.length} zamówień z kopii zapasowej!`,
          });
        } else if (Array.isArray(parsed)) {
          onRestoreOrders(parsed);
          setMessage({
            type: 'success',
            text: `Pomyślnie przywrócono ${parsed.length} zamówień!`,
          });
        } else {
          throw new Error('Niepoprawny format pliku kopii zapasowej JSON.');
        }
      } else if (file.name.endsWith('.csv') || file.mimeType === 'text/csv') {
        const parsed = parseCsvToOrders(content);
        onRestoreOrders(parsed as Order[]);
        setMessage({
          type: 'success',
          text: `Pomyślnie zaimportowano ${parsed.length} zamówień z pliku CSV!`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Błąd podczas przywracania danych z Dysku.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Mandatory user confirmation dialog before destructive delete
  const confirmDeleteFile = async () => {
    if (!fileToDelete || !accessToken) return;
    setActionLoading(true);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      setMessage({
        type: 'success',
        text: `Plik "${fileToDelete.name}" został trwale usunięty z Dysku Google.`,
      });
      setFileToDelete(null);
      loadDriveData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Nie udało się usunąć pliku.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setActionLoading(true);
    setMessage(null);
    try {
      const folderId = await getOrCreateAppFolder(accessToken);
      const uploaded = await uploadFileToDrive(accessToken, file, folderId);
      setMessage({
        type: 'success',
        text: `Plik "${uploaded.name}" został pomyślnie przesłany na Twój Dysk Google!`,
      });
      loadDriveData();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Błąd podczas przesyłania pliku.' });
    } finally {
      setActionLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Integracja z Google Drive
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Chmura
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Kopie zapasowe zamówień, synchronizacja arkuszy i załączniki do zleceń
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Auth State Banner */}
          {!currentUser || !accessToken ? (
            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/80 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Połącz swoje konto Google Drive</h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Zaloguj się, aby tworzyć bezpieczne kopie zapasowe harmonogramu zamówień na swoim Dysku Google oraz dołączać dokumentację i rysunki techniczne.
                </p>
              </div>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-xs transition hover:shadow-md cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Zaloguj się przez Google
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-9 h-9 rounded-full border border-slate-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    {currentUser.displayName || currentUser.email}
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                  <p className="text-[11px] text-slate-500">{currentUser.email} • Połączono z Google Drive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-rose-200"
              >
                Wyloguj
              </button>
            </div>
          )}

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : message.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-2 font-bold cursor-pointer">
                &times;
              </button>
            </div>
          )}

          {/* Tabs */}
          {currentUser && accessToken && (
            <>
              <div className="flex border-b border-slate-200 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('backups')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'backups'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4" />
                  Kopie zapasowe i Synchronizacja
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('explorer')}
                  className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
                    activeTab === 'explorer'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  Przeglądarka plików Dysku
                </button>
              </div>

              {activeTab === 'backups' ? (
                <div className="space-y-4">
                  {/* Backup Actions Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleCreateBackup}
                      className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <div>
                        <span className="text-xs font-bold text-blue-950 block">
                          Zapisz kopię zapasową na Dysku
                        </span>
                        <span className="text-[11px] text-blue-700">
                          Pełny snapshot {orders.length} zamówień (JSON)
                        </span>
                      </div>
                      <Cloud className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleExportCsvToDrive}
                      className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
                    >
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">
                          Eksportuj arkusz CSV na Dysk
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Zapisz plik kalkulacyjny .CSV
                        </span>
                      </div>
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                    </button>
                  </div>

                  {/* List of existing backups on Drive */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Kopie zapasowe na Twoim Dysku Google
                      </h4>
                      <button
                        type="button"
                        onClick={loadDriveData}
                        disabled={loading}
                        className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Odśwież
                      </button>
                    </div>

                    {loading ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Wczytywanie plików z Dysku Google...
                      </div>
                    ) : backupFiles.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                        Brak zapisanych kopii zapasowych na Dysku Google. Kliknij przycisk powyżej, aby utworzyć pierwszą kopię.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {backupFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                {file.name.endsWith('.csv') ? (
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {file.modifiedTime
                                    ? new Date(file.modifiedTime).toLocaleString('pl-PL')
                                    : 'Brak daty'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                  title="Otwórz na Dysku Google"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRestoreBackup(file)}
                                disabled={actionLoading}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                                title="Przywróć dane z tej kopii"
                              >
                                Przywróć
                              </button>
                              <button
                                type="button"
                                onClick={() => setFileToDelete(file)}
                                disabled={actionLoading}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Usuń z Dysku Google"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Drive Explorer Tab */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadDriveData()}
                        placeholder="Szukaj plików na Dysku Google..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Prześlij plik
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Przeszukiwanie Dysku Google...
                    </div>
                  ) : explorerFiles.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                      Nie znaleziono plików na Dysku Google.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {explorerFiles.map((file) => (
                        <div
                          key={file.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Otwórz <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setFileToDelete(file)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                              title="Usuń plik"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>

      {/* Mandatory User Confirmation Dialog for Destructive Delete (Workspace Integration Standard) */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Potwierdzenie usunięcia z Google Drive
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Czy na pewno chcesz trwale usunąć plik <strong className="text-slate-900 font-semibold">"{fileToDelete.name}"</strong> ze swojego Dysku Google? Tej operacji nie można cofnąć.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={actionLoading}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Usuwanie...' : 'Usuń plik'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
