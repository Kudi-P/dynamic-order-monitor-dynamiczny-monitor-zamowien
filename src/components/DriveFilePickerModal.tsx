import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  Search,
  Upload,
  Check,
  FileText,
  ExternalLink,
  Plus,
  Paperclip
} from 'lucide-react';
import type { DriveFileAttachment } from '../types';
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreateAppFolder,
  type GoogleDriveFile
} from '../services/googleDrive';

interface DriveFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSelectFiles: (attachments: DriveFileAttachment[]) => void;
}

export const DriveFilePickerModal: React.FC<DriveFilePickerModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSelectFiles,
}) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles();
      setSelectedFileIds([]);
      setErrorMessage(null);
    }
  }, [isOpen, accessToken]);

  const loadFiles = async () => {
    if (!accessToken) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await listDriveFiles(accessToken, {
        query: searchQuery,
        pageSize: 40,
      });
      setFiles(result.files);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Błąd wczytywania plików z Dysku Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleConfirmSelection = () => {
    const selectedAttachments: DriveFileAttachment[] = files
      .filter((f) => selectedFileIds.includes(f.id))
      .map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
        modifiedTime: f.modifiedTime,
      }));

    onSelectFiles(selectedAttachments);
    onClose();
  };

  const handleUploadAndAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    setUploading(true);
    setErrorMessage(null);
    try {
      const folderId = await getOrCreateAppFolder(accessToken);
      const uploaded = await uploadFileToDrive(accessToken, file, folderId);
      onSelectFiles([uploaded]);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Błąd podczas wgrywania pliku na Dysk Google: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Paperclip className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Wybierz pliki z Dysku Google
              </h3>
              <p className="text-[11px] text-slate-500">
                Dołącz dokumentację, rysunki CAD, faktury lub specyfikacje
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Upload Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-2">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFiles()}
                placeholder="Filtruj pliki na Dysku Google..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={loadFiles}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Szukaj
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Wgrywanie...' : 'Wgraj i dołącz'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadAndAttach}
              className="hidden"
            />
          </div>
        </div>

        {/* File List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-1.5 min-h-[220px]">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Wczytywanie listy plików z Dysku Google...
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nie znaleziono pasujących plików na Dysku.
            </div>
          ) : (
            files.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => handleToggleSelect(file.id)}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Podgląd w Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Zaznaczono: <strong>{selectedFileIds.length}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedFileIds.length === 0}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition cursor-pointer shadow-xs"
            >
              Dołącz wybrane ({selectedFileIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
