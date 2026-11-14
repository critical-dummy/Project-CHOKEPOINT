export interface MissionRecord {
  missionId: string;
  bestTimeMs: number;
  completions: number;
  lastCompletedAt: string;
}

const DATABASE_NAME = "chokepoint-local";
const DATABASE_VERSION = 1;
const STORE_NAME = "missions";
const FALLBACK_PREFIX = "chokepoint:mission:";
let databasePromise: Promise<IDBDatabase> | undefined;

export function mergeMissionRecord(
  missionId: string,
  elapsedMs: number,
  previous: MissionRecord | null,
  completedAt = new Date().toISOString(),
): MissionRecord {
  const safeElapsed = Math.max(0, Math.round(elapsedMs));

  return {
    missionId,
    bestTimeMs: previous
      ? Math.min(previous.bestTimeMs, safeElapsed)
      : safeElapsed,
    completions: (previous?.completions ?? 0) + 1,
    lastCompletedAt: completedAt,
  };
}

function isMissionRecord(value: unknown, missionId: string): value is MissionRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<MissionRecord>;
  return (
    record.missionId === missionId &&
    typeof record.bestTimeMs === "number" &&
    Number.isFinite(record.bestTimeMs) &&
    record.bestTimeMs >= 0 &&
    typeof record.completions === "number" &&
    Number.isInteger(record.completions) &&
    record.completions >= 0 &&
    typeof record.lastCompletedAt === "string"
  );
}

function readFallback(missionId: string): MissionRecord | null {
  try {
    const raw = localStorage.getItem(FALLBACK_PREFIX + missionId);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isMissionRecord(value, missionId) ? value : null;
  } catch {
    return null;
  }
}

function writeFallback(record: MissionRecord): void {
  try {
    localStorage.setItem(
      FALLBACK_PREFIX + record.missionId,
      JSON.stringify(record),
    );
  } catch {
    // Private browsing or storage limits can disable local fallback storage.
  }
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "missionId" });
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };

      request.onerror = () => {
        databasePromise = undefined;
        reject(request.error ?? new Error("Unable to open the save database."));
      };

      request.onblocked = () => {
        databasePromise = undefined;
        reject(new Error("The save database upgrade is blocked by another tab."));
      };
    });
  }

  return databasePromise;
}

export async function loadMissionRecord(
  missionId: string,
): Promise<MissionRecord | null> {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(missionId);

      request.onsuccess = () => {
        const value: unknown = request.result;
        resolve(isMissionRecord(value, missionId) ? value : readFallback(missionId));
      };
      request.onerror = () => reject(
        request.error ?? new Error("Unable to read the mission save."),
      );
      transaction.onabort = () => reject(
        transaction.error ?? new Error("Mission save read was aborted."),
      );
    });
  } catch {
    return readFallback(missionId);
  }
}

export async function recordMissionCompletion(
  missionId: string,
  elapsedMs: number,
): Promise<MissionRecord> {
  const previous = await loadMissionRecord(missionId);
  const record = mergeMissionRecord(missionId, elapsedMs, previous);

  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(
        transaction.error ?? new Error("Unable to write the mission save."),
      );
      transaction.onabort = () => reject(
        transaction.error ?? new Error("Mission save write was aborted."),
      );
    });
  } catch {
    writeFallback(record);
  }

  return record;
}
