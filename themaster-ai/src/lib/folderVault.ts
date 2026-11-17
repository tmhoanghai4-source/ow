import { WorkspaceFile } from '../types';
import { detectWorkspaceLanguages } from './workspaceBuilder';

export interface SavedWorkspaceFolder {
  id: string;
  accountKey: string;
  name: string;
  files: WorkspaceFile[];
  languages: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RememberedGoogleAccount {
  email: string;
  username: string;
  role?: string;
  lastUsedAt: number;
}

const DB_NAME = 'TheMasterFolderVaultDB';
const DB_VERSION = 1;
const STORE_FOLDERS = 'folders';
const LS_FALLBACK_KEY = 'tm_folder_vault_fallback_v1';
const LS_ACCOUNTS_KEY = 'tm_google_accounts_v1';

export function getAccountVaultKey(user: { email?: string; username?: string } | null | undefined): string {
  const email = user?.email?.trim().toLowerCase();
  if (email) return email;
  const uname = user?.username?.trim().toLowerCase();
  if (uname) return uname;
  return 'guest';
}

export function getRememberedGoogleAccounts(): RememberedGoogleAccount[] {
  try {
    const raw = localStorage.getItem(LS_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
      : [];
  } catch {
    return [];
  }
}

export function rememberGoogleAccount(user: { email?: string; username?: string; role?: string }) {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return;
  try {
    const list = getRememberedGoogleAccounts().filter(a => a.email !== email);
    list.unshift({
      email,
      username: user.username || email.split('@')[0],
      role: user.role || 'user',
      lastUsedAt: Date.now(),
    });
    localStorage.setItem(LS_ACCOUNTS_KEY, JSON.stringify(list.slice(0, 12)));
  } catch {
    // Ignore storage limit errors
  }
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const store = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
        store.createIndex('accountKey', 'accountKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function readFallbackMap(): Record<string, SavedWorkspaceFolder> {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeFallbackMap(map: Record<string, SavedWorkspaceFolder>) {
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota overflow
  }
}

export async function listVaultFolders(accountKey: string): Promise<SavedWorkspaceFolder[]> {
  const normalizedKey = (accountKey || 'guest').toLowerCase();
  try {
    const db = await openVaultDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readonly');
      const store = tx.objectStore(STORE_FOLDERS);
      const idx = store.index('accountKey');
      const req = idx.getAll(IDBKeyRange.only(normalizedKey));
      req.onsuccess = () => {
        const rows = (req.result || []) as SavedWorkspaceFolder[];
        resolve(rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    const map = readFallbackMap();
    return Object.values(map)
      .filter(f => (f.accountKey || 'guest').toLowerCase() === normalizedKey)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
}

export async function saveVaultFolder(
  accountKey: string,
  folder: {
    id?: string;
    name: string;
    files: WorkspaceFile[];
    createdAt?: number;
  }
): Promise<SavedWorkspaceFolder> {
  const normalizedKey = (accountKey || 'guest').toLowerCase();
  const now = Date.now();
  const entry: SavedWorkspaceFolder = {
    id: folder.id || `fld_${now}_${Math.random().toString(36).slice(2, 7)}`,
    accountKey: normalizedKey,
    name: folder.name.trim() || 'untitled-folder',
    files: folder.files.map(f => ({ ...f })),
    languages: detectWorkspaceLanguages(folder.files),
    createdAt: folder.createdAt || now,
    updatedAt: now,
  };

  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      tx.objectStore(STORE_FOLDERS).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const map = readFallbackMap();
    map[entry.id] = entry;
    writeFallbackMap(map);
  }

  return entry;
}

export async function renameVaultFolder(
  accountKey: string,
  folderId: string,
  newName: string
): Promise<SavedWorkspaceFolder | null> {
  const cleanName = newName.trim();
  if (!cleanName) return null;
  const list = await listVaultFolders(accountKey);
  const target = list.find(f => f.id === folderId);
  if (!target) return null;
  return await saveVaultFolder(accountKey, {
    ...target,
    name: cleanName,
  });
}

export async function deleteVaultFolder(accountKey: string, folderId: string): Promise<void> {
  const normalizedKey = (accountKey || 'guest').toLowerCase();
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      const getReq = store.get(folderId);
      getReq.onsuccess = () => {
        const existing = getReq.result as SavedWorkspaceFolder | undefined;
        if (existing && (existing.accountKey || 'guest').toLowerCase() === normalizedKey) {
          store.delete(folderId);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const map = readFallbackMap();
    if (map[folderId] && (map[folderId].accountKey || 'guest').toLowerCase() === normalizedKey) {
      delete map[folderId];
      writeFallbackMap(map);
    }
  }
}
