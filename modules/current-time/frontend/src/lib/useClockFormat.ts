import { useCallback, useState } from 'react';
import { getTimeFormat, setTimeFormat } from './timeFormat';
import type { TimeFormat } from './timeFormat';

export interface UseClockFormatOptions {
  defaultFormat: TimeFormat;
  switchable: boolean;
}

export function useClockFormat({ defaultFormat, switchable }: UseClockFormatOptions) {
  const [format, setFormatState] = useState<TimeFormat>(() =>
    switchable ? getTimeFormat(defaultFormat) : defaultFormat,
  );

  const setFormat = useCallback(
    (next: TimeFormat) => {
      setFormatState(next);
      if (switchable) {
        setTimeFormat(next);
      }
    },
    [switchable],
  );

  return { format, setFormat };
}
