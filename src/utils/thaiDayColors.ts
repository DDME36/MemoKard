// สีประจำวันแบบไทย (ตามเวลาประเทศไทย UTC+7)
export interface DayStyle {
  gradient: string;
  shadow: string;
}

export const THAI_DAY_COLORS: Record<number, DayStyle> = {
  0: { gradient: 'from-red-600 to-rose-600', shadow: 'shadow-red-200' },
  1: { gradient: 'from-yellow-400 to-amber-500', shadow: 'shadow-amber-200' },
  2: { gradient: 'from-pink-600 to-rose-600', shadow: 'shadow-pink-200' },
  3: { gradient: 'from-green-600 to-emerald-600', shadow: 'shadow-green-200' },
  4: { gradient: 'from-orange-600 to-amber-600', shadow: 'shadow-orange-200' },
  5: { gradient: 'from-sky-600 to-blue-600', shadow: 'shadow-sky-200' },
  6: { gradient: 'from-purple-600 to-violet-600', shadow: 'shadow-purple-200' },
};

export const getThaiDayColor = (): DayStyle => {
  const now = new Date();
  const thaiTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const dayOfWeek = thaiTime.getUTCDay();
  return THAI_DAY_COLORS[dayOfWeek as keyof typeof THAI_DAY_COLORS];
};

// Map deck color key → gradient/shadow
export const DECK_COLOR_MAP: Record<string, DayStyle> = {
  violet:  { gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
  sky:     { gradient: 'from-sky-500 to-blue-600',      shadow: 'shadow-sky-200' },
  teal:    { gradient: 'from-teal-500 to-emerald-600',  shadow: 'shadow-teal-200' },
  rose:    { gradient: 'from-rose-500 to-pink-600',     shadow: 'shadow-rose-200' },
  amber:   { gradient: 'from-amber-500 to-orange-600',  shadow: 'shadow-amber-200' },
  emerald: { gradient: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-200' },
  pink:    { gradient: 'from-pink-500 to-fuchsia-600',  shadow: 'shadow-pink-200' },
  indigo:  { gradient: 'from-indigo-500 to-blue-600',   shadow: 'shadow-indigo-200' },
};
