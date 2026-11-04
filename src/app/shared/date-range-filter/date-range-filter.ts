/** Date filter state + helpers shared by the Inward and Outward inventory pages. */

export type DatePreset = 'all' | 'today' | '7d' | 'month' | 'lastMonth' | 'pickMonth' | 'custom';

export interface DateFilterState {
  preset: DatePreset;
  /** 'YYYY-MM' — used when preset is 'pickMonth'. */
  month: string;
  /** 'YYYY-MM-DD' bounds — used when preset is 'custom' (either may be empty). */
  from: string;
  to: string;
}

export interface DateMonthOption {
  /** 'YYYY-MM' */
  value: string;
  /** e.g. 'Nov 2026' */
  label: string;
  count: number;
}

/** Inclusive 'YYYY-MM-DD' bounds; a null side is open-ended. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export const EMPTY_DATE_FILTER: DateFilterState = { preset: 'all', month: '', from: '', to: '' };

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthRange(year: number, monthIndex: number): DateRange {
  return { from: fmt(new Date(year, monthIndex, 1)), to: fmt(new Date(year, monthIndex + 1, 0)) };
}

/** Resolves the filter to concrete bounds, or null when nothing is being filtered. Uses the local calendar. */
export function getDateRange(state: DateFilterState, now: Date = new Date()): DateRange | null {
  switch (state.preset) {
    case 'today': {
      const t = fmt(now);
      return { from: t, to: t };
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: fmt(start), to: fmt(now) };
    }
    case 'month':
      return monthRange(now.getFullYear(), now.getMonth());
    case 'lastMonth':
      return monthRange(now.getFullYear(), now.getMonth() - 1);
    case 'pickMonth': {
      const m = /^(\d{4})-(\d{2})$/.exec(state.month);
      return m ? monthRange(Number(m[1]), Number(m[2]) - 1) : null;
    }
    case 'custom': {
      let from = state.from || null;
      let to = state.to || null;
      if (from && to && from > to) [from, to] = [to, from];
      return from || to ? { from, to } : null;
    }
    default:
      return null;
  }
}

/** True when the date's calendar day (first 10 chars, matching how the pages bucket by day) is inside the range. */
export function isWithinRange(date: string | null | undefined, range: DateRange): boolean {
  const day = (date || '').slice(0, 10);
  if (!day) return false;
  return (!range.from || day >= range.from) && (!range.to || day <= range.to);
}

function monthLabel(value: string): string {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/** Months that actually have entries (newest first) with their counts; `keep` is always included. */
export function buildMonthOptions(dates: (string | null | undefined)[], keep = ''): DateMonthOption[] {
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = (d || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (/^\d{4}-\d{2}$/.test(keep) && !counts.has(keep)) counts.set(keep, 0);
  return Array.from(counts.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([value, count]) => ({ value, count, label: monthLabel(value) }));
}
