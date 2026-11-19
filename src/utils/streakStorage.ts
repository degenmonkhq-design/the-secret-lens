const STREAK_KEY = 'tsl_daily_streak_v1';

interface StoredStreak {
  count: number;
  lastDate: string;
}

function getLocalDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isYesterdayKey(prevKey: string, todayKey: string): boolean {
  const [py, pm, pd] = prevKey.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  if (!py || !pm || !pd || !ty || !tm || !td) return false;
  const prevMs = new Date(py, pm - 1, pd).getTime();
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const diffDays = Math.round((todayMs - prevMs) / 86400000);
  return diffDays === 1;
}

function readStoredStreak(): StoredStreak | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredStreak>;
    if (typeof parsed.count === 'number' && typeof parsed.lastDate === 'string') {
      return { count: Math.max(1, Math.floor(parsed.count)), lastDate: parsed.lastDate };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredStreak(data: StoredStreak): void {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {
    // ignore storage quota errors
  }
}

export function getOrInitDailyStreak(): number {
  const today = getLocalDayKey();
  const stored = readStoredStreak();

  if (!stored) {
    writeStoredStreak({ count: 1, lastDate: today });
    return 1;
  }

  if (stored.lastDate === today) {
    return stored.count;
  }

  if (isYesterdayKey(stored.lastDate, today)) {
    const nextCount = stored.count + 1;
    writeStoredStreak({ count: nextCount, lastDate: today });
    return nextCount;
  }

  writeStoredStreak({ count: 1, lastDate: today });
  return 1;
}

export function recordDailyExplorerAction(): {
  count: number;
  justIncremented: boolean;
  unlockedGoldenAura: boolean;
} {
  const today = getLocalDayKey();
  const stored = readStoredStreak();

  if (!stored) {
    writeStoredStreak({ count: 1, lastDate: today });
    return { count: 1, justIncremented: true, unlockedGoldenAura: false };
  }

  if (stored.lastDate === today) {
    return {
      count: stored.count,
      justIncremented: false,
      unlockedGoldenAura: stored.count >= 3,
    };
  }

  if (isYesterdayKey(stored.lastDate, today)) {
    const nextCount = stored.count + 1;
    writeStoredStreak({ count: nextCount, lastDate: today });
    return {
      count: nextCount,
      justIncremented: true,
      unlockedGoldenAura: nextCount >= 3,
    };
  }

  writeStoredStreak({ count: 1, lastDate: today });
  return { count: 1, justIncremented: true, unlockedGoldenAura: false };
}
