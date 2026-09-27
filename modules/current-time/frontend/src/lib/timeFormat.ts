export type TimeFormat = '12h' | '24h';

export interface TimeParts {
  hours: string;
  minutes: string;
  seconds: string;
  ampm: 'AM' | 'PM' | null;
}

const STORAGE_KEY = 'current-time:time-format';

export function formatTimeParts(date: Date, format: TimeFormat): TimeParts {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  if (format === '12h') {
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return {
      hours: hours12.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      ampm: hours24 >= 12 ? 'PM' : 'AM',
    };
  }

  return {
    hours: hours24.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
    ampm: null,
  };
}

export function getTimeFormat(fallback: TimeFormat = '24h'): TimeFormat {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === '12h' || stored === '24h' ? stored : fallback;
}

export function setTimeFormat(format: TimeFormat): void {
  localStorage.setItem(STORAGE_KEY, format);
}
