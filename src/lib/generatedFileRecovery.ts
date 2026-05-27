import { isImageFile } from './files';

import type { ManagedFile } from '../types';

const DB_NAME = 'etsy-masks-admin-generated-files';
const DB_VERSION = 1;
const STORE_NAME = 'pending-generated-files';

type StoredGeneratedFile = Omit<ManagedFile, 'objectUrl'> & {
  projectId: string;
  savedAt: string;
};

const openRecoveryDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open recovery store.'));
  });

const runTransaction = async <Result>(
  mode: IDBTransactionMode,
  task: (store: IDBObjectStore) => Promise<Result> | Result,
): Promise<Result> => {
  const db = await openRecoveryDb();
  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const result = await task(transaction.objectStore(STORE_NAME));

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Recovery store failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Recovery store aborted.'));
    });

    return result;
  } finally {
    db.close();
  }
};

const requestToPromise = <Result>(request: IDBRequest<Result>): Promise<Result> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Recovery store request failed.'));
  });

const toStoredFile = (projectId: string, managedFile: ManagedFile): StoredGeneratedFile => {
  const storedFile = { ...managedFile, projectId, savedAt: new Date().toISOString() };
  delete storedFile.objectUrl;
  return storedFile;
};

const isStoredGeneratedFile = (value: unknown): value is StoredGeneratedFile =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'file' in value &&
  value.file instanceof File &&
  'projectId' in value &&
  typeof value.projectId === 'string' &&
  'savedAt' in value &&
  typeof value.savedAt === 'string';

const toManagedFile = (storedFile: StoredGeneratedFile): ManagedFile => {
  const managedFile = { ...storedFile } as ManagedFile & {
    projectId?: string;
    savedAt?: string;
  };
  delete managedFile.projectId;
  delete managedFile.savedAt;
  const objectUrl = isImageFile(storedFile.file) ? URL.createObjectURL(storedFile.file) : undefined;

  return {
    ...managedFile,
    ...(objectUrl ? { objectUrl } : {}),
  };
};

export const persistGeneratedFileBackups = async (
  projectId: string,
  files: ManagedFile[],
): Promise<void> => {
  if (files.length === 0 || typeof indexedDB === 'undefined') {
    return;
  }

  await runTransaction('readwrite', (store) => {
    for (const file of files) {
      store.put(toStoredFile(projectId, file));
    }
  });
};

export const loadGeneratedFileBackups = async (projectId: string): Promise<ManagedFile[]> => {
  if (typeof indexedDB === 'undefined') {
    return [];
  }

  return runTransaction('readonly', async (store) => {
    const index = store.index('projectId');
    const records = await requestToPromise(index.getAll(projectId) as IDBRequest<unknown[]>);

    return records
      .filter(isStoredGeneratedFile)
      .sort((left, right) => left.savedAt.localeCompare(right.savedAt))
      .map(toManagedFile);
  });
};

export const discardGeneratedFileBackups = async (fileIds: string[]): Promise<void> => {
  if (fileIds.length === 0 || typeof indexedDB === 'undefined') {
    return;
  }

  await runTransaction('readwrite', (store) => {
    for (const fileId of fileIds) {
      store.delete(fileId);
    }
  });
};
