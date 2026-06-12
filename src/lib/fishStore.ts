import { sanitizeFishName } from "@/lib/sanitizeFishName";

const DB_NAME = "minisea";
const DB_VERSION = 1;
const STORE_NAME = "fish";
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

export type StoredFish = {
  fileName: string;
  name: string;
  level: number;
  xp: number;
  url: string;
};

export type SaveFishResult = {
  fileName: string;
  name: string;
  level: number;
  xp: number;
};

type FishRecord = {
  fileName: string;
  name: string;
  level: number;
  xp: number;
  blob: Blob;
  updatedAt: number;
};

function normalizeFishRecord(record: Partial<FishRecord> & Pick<FishRecord, "fileName" | "blob">): FishRecord {
  return {
    fileName: record.fileName,
    name: record.name ?? record.fileName,
    level: record.level ?? 0,
    xp: record.xp ?? 0,
    blob: record.blob,
    updatedAt: record.updatedAt ?? 0,
  };
}

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

export async function getFish(fileName: string): Promise<StoredFish | null> {
  const db = await openDb();

  try {
    const record = await new Promise<FishRecord | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(fileName);

      request.onerror = () => reject(request.error ?? new Error("No se pudo leer el pez."));
      request.onsuccess = () => {
        const raw = request.result as (Partial<FishRecord> & Pick<FishRecord, "fileName" | "blob">) | undefined;
        resolve(raw ? normalizeFishRecord(raw) : undefined);
      };
    });

    if (!record) return null;

    const { name, level, xp, blob } = record;
    return {
      fileName,
      name,
      level,
      xp,
      url: URL.createObjectURL(blob),
    };
  } finally {
    db.close();
  }
}

export async function listFish(): Promise<StoredFish[]> {
  const db = await openDb();

  try {
    const records = await new Promise<FishRecord[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onerror = () => reject(request.error ?? new Error("No se pudieron leer los peces."));
      request.onsuccess = () => {
        const raw = request.result as Array<Partial<FishRecord> & Pick<FishRecord, "fileName" | "blob">>;
        resolve(raw.map(normalizeFishRecord));
      };
    });

    return records
      .sort((left, right) => left.fileName.localeCompare(right.fileName))
      .map(({ fileName, name, level, xp, blob }) => ({
        fileName,
        name,
        level,
        xp,
        url: URL.createObjectURL(blob),
      }));
  } finally {
    db.close();
  }
}

export async function saveFish(name: string, imageDataUrl: string): Promise<SaveFishResult> {
  const displayName = name.trim();
  const fileName = sanitizeFishName(displayName);
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

  const record: FishRecord = {
    fileName,
    name: displayName,
    level: 0,
    xp: 0,
    blob,
    updatedAt: Date.now(),
  };

  const db = await openDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const request = transaction.objectStore(STORE_NAME).put(record);

      request.onerror = () => reject(request.error ?? new Error("No se pudo guardar el pez."));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo guardar el pez."));
    });
  } finally {
    db.close();
  }

  return {
    fileName: record.fileName,
    name: record.name,
    level: record.level,
    xp: record.xp,
  };
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
