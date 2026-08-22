import type { DriveFileAttachment, Order } from '../types';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  parents?: string[];
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Searches or lists files from Google Drive
 */
export async function listDriveFiles(
  token: string,
  options: {
    query?: string;
    folderId?: string;
    pageSize?: number;
    mimeTypeFilter?: string;
  } = {}
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
  const { query = '', folderId, pageSize = 30, mimeTypeFilter } = options;

  const queryParts: string[] = ['trashed = false'];

  if (folderId) {
    queryParts.push(`'${folderId}' in parents`);
  }

  if (query.trim()) {
    queryParts.push(`name contains '${query.replace(/'/g, "\\'")}'`);
  }

  if (mimeTypeFilter === 'spreadsheets') {
    queryParts.push("(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'text/csv' or name contains '.csv')");
  } else if (mimeTypeFilter === 'backups') {
    queryParts.push("(mimeType = 'application/json' or name contains 'Order_Tracker')");
  }

  const q = queryParts.join(' and ');
  const params = new URLSearchParams({
    q,
    pageSize: pageSize.toString(),
    fields: 'nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, size, modifiedTime, createdTime, parents)',
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`${DRIVE_API_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Błąd pobierania plików z Dysku Google (${res.status})`);
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
}

/**
 * Creates or gets the dedicated "Dynamic Order Tracker" folder on Google Drive
 */
export async function getOrCreateAppFolder(token: string): Promise<string> {
  const folderName = 'Dynamic Order Tracker';
  const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchRes = await fetch(`${DRIVE_API_URL}?q=${encodeURIComponent(query)}&fields=files(id, name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch(DRIVE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Nie udało się utworzyć folderu na Dysku Google.');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Uploads a local file (e.g. PDF, image, spreadsheet, drawing) directly to Google Drive
 */
export async function uploadFileToDrive(
  token: string,
  file: File,
  folderId?: string
): Promise<DriveFileAttachment> {
  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });

  // Read file as ArrayBuffer
  const fileArrayBuffer = await file.arrayBuffer();

  const multipartBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
    fileArrayBuffer,
    closeDelimiter,
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Nie udało się przesłać pliku na Dysk Google.');
  }

  const result = await res.json();
  return {
    id: result.id,
    name: result.name,
    mimeType: result.mimeType,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    size: file.size,
    modifiedTime: new Date().toISOString(),
  };
}

/**
 * Saves a full JSON backup snapshot of all orders to Google Drive
 */
export async function saveBackupToDrive(
  token: string,
  orders: Order[],
  todayStr: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const folderId = await getOrCreateAppFolder(token).catch(() => undefined);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `Order_Tracker_Kopia_${todayStr}_${timestamp}.json`;

  const payload = {
    appName: 'Dynamiczny Monitor Zamówień',
    version: '2.0',
    exportDate: new Date().toISOString(),
    referenceDate: todayStr,
    ordersCount: orders.length,
    orders,
  };

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'application/json',
    description: `Kopia zapasowa ${orders.length} zamówień utworzona z poziomu aplikacji Dynamiczny Monitor Zamówień`,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const contentBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

  const multipartBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    'Content-Type: application/json\r\n\r\n',
    contentBlob,
    closeDelimiter,
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Błąd zapisu kopii zapasowej na Dysku Google.');
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

/**
 * Saves a CSV export to Google Drive
 */
export async function saveCsvToDrive(
  token: string,
  csvContent: string,
  todayStr: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const folderId = await getOrCreateAppFolder(token).catch(() => undefined);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `Zamowienia_${todayStr}_${timestamp}.csv`;

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'text/csv',
    description: 'Eksport zamówień w formacie CSV z aplikacji Dynamiczny Monitor Zamówień',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const contentBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

  const multipartBody = new Blob([
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataBlob,
    delimiter,
    'Content-Type: text/csv\r\n\r\n',
    contentBlob,
    closeDelimiter,
  ]);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Błąd eksportu CSV na Dysk Google.');
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

/**
 * Reads file contents from Google Drive (for JSON backups or CSV files)
 */
export async function downloadDriveFileContent(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Nie udało się pobrać zawartości pliku z Dysku Google (${res.status})`);
  }

  return await res.text();
}

/**
 * Permanently or trash deletes a file from Google Drive
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<boolean> {
  const res = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Błąd podczas usuwania pliku z Dysku Google.');
  }

  return true;
}
