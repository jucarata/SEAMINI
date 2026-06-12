import { sanitizeFishName } from "@/lib/sanitizeFishName";

const DB_NAME = "minisea";
const DB_VERSION = 1;
const STORE_NAME = "fish";
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

export type StoredFish = {
  fileName: string;
  url: string;
};

export type SaveFishResult = {
  fileName: string;
};

type FishRecord = {
  fileName: string;
  blob: Blob;
  updatedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir IndexedDB."));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "fileName" });
      }
    };
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
    return null;
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: "image/png" });
}

export function revokeFishUrls(fish: StoredFish[]): void {
  for (const { url } of fish) {
    URL.revokeObjectURL(url);
  }
}

export async function listFish(): Promise<StoredFish[]> {
  const db = await openDb();

  try {
    const records = await new Promise<FishRecord[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onerror = () => reject(request.error ?? new Error("No se pudieron leer los peces."));
      request.onsuccess = () => resolve(request.result as FishRecord[]);
    });

    return records
      .sort((left, right) => left.fileName.localeCompare(right.fileName))
      .map(({ fileName, blob }) => ({
        fileName,
        url: URL.createObjectURL(blob),
      }));
  } finally {
    db.close();
  }
}

export async function saveFish(name: string, imageDataUrl: string): Promise<SaveFishResult> {
  const fileName = sanitizeFishName(name);
  if (!fileName) {
    throw new Error("Nombre inválido. Usa letras, números, guiones o guiones bajos.");
  }

  const blob = dataUrlToBlob(imageDataUrl);
  if (!blob) {
    throw new Error("Formato de imagen inválido.");
  }

  if (blob.size === 0) {
    throw new Error("La imagen está vacía.");
  }

  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put({
        fileName,
        blob,
        updatedAt: Date.now(),
      } satisfies FishRecord);

      request.onerror = () => reject(request.error ?? new Error("No se pudo guardar el pez."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo guardar el pez."));
    });
  } finally {
    db.close();
  }

  return { fileName };
}

export async function clearAllFish(): Promise<void> {
  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).clear();

      request.onerror = () => reject(request.error ?? new Error("No se pudieron eliminar los peces."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("No se pudieron eliminar los peces."));
    });
  } finally {
    db.close();
  }
}
