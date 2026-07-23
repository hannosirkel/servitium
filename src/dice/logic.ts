export const DICE_TYPES = [4, 6, 8, 10, 12, 20] as const;
export type DieType = (typeof DICE_TYPES)[number];
export type ThrowRecord = {
  id: string;
  die: DieType;
  count: number;
  values: number[];
  total: number;
  timestamp: number;
};
export type Point = { x: number; y: number; time: number };

export const HISTORY_KEY = 'servitium.dice.history.v1';
export const HISTORY_LIMIT = 10;
export const SHAKE_THRESHOLD = 22;
export const SHAKE_COOLDOWN = 1600;

export function isDieType(value: number): value is DieType {
  return DICE_TYPES.includes(value as DieType);
}

export function clampCount(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function makeRecord(die: DieType, count: number, values: number[], timestamp = Date.now()): ThrowRecord {
  const safeValues = values.slice(0, clampCount(count));
  return {
    id: `${timestamp}-${safeValues.join('')}`,
    die,
    count: clampCount(count),
    values: safeValues,
    total: safeValues.reduce((sum, value) => sum + value, 0),
    timestamp,
  };
}

export function restoreHistory(storage: Pick<Storage, 'getItem'>): ThrowRecord[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ThrowRecord => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Partial<ThrowRecord>;
        return isDieType(Number(entry.die))
          && Number.isInteger(entry.count)
          && Array.isArray(entry.values)
          && entry.values.every(Number.isFinite)
          && Number.isFinite(entry.total)
          && Number.isFinite(entry.timestamp);
      })
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function addHistory(history: ThrowRecord[], entry: ThrowRecord): ThrowRecord[] {
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

export function persistHistory(storage: Pick<Storage, 'setItem'>, history: ThrowRecord[]): void {
  storage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
}

export function clearHistory(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(HISTORY_KEY);
}

export function isFlick(start: Point, end: Point): boolean {
  const duration = end.time - start.time;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const velocity = distance / Math.max(duration, 1);
  return duration > 0 && duration < 700 && distance >= 76 && velocity >= 0.32;
}

export function motionMagnitude(event: Pick<DeviceMotionEvent, 'accelerationIncludingGravity'>): number {
  const acceleration = event.accelerationIncludingGravity;
  if (!acceleration) return 0;
  return Math.hypot(acceleration.x ?? 0, acceleration.y ?? 0, acceleration.z ?? 0);
}

export function shouldShakeRoll(magnitude: number, now: number, lastShake: number, rolling: boolean): boolean {
  return !rolling && magnitude >= SHAKE_THRESHOLD && now - lastShake >= SHAKE_COOLDOWN;
}

export function randomValues(die: DieType, count: number): number[] {
  return Array.from({ length: clampCount(count) }, () => Math.floor(Math.random() * die) + 1);
}

export function formatTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}
