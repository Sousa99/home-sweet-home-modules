import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import type { TimeFormat } from '../../lib/timeFormat';
import { formatTimeParts } from '../../lib/timeFormat';
import { useClockFormat } from '../../lib/useClockFormat';
import { useCurrentTime } from '../../lib/useCurrentTime';
import { ClockFace } from './ClockFace';
import { TimeFormatToggle } from './TimeFormatToggle';

export type ClockAlign = 'left' | 'center' | 'right';

export interface ClockWidgetProps {
  align?: ClockAlign;
  defaultFormat?: TimeFormat;
  switchable?: boolean;
}

const ALIGN_CLASS: Record<ClockAlign, string> = {
  left: 'items-start',
  center: 'items-center',
  right: 'items-end',
};

function useScaledFontSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 0, height: 0 };
      if (width > 0 && height > 0) {
        setFontSize(Math.max(16, Math.min(width / 8, height / 2.5)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, fontSize };
}

export function ClockWidget({
  align = 'center',
  defaultFormat = '24h',
  switchable = true,
}: ClockWidgetProps) {
  const now = useCurrentTime();
  const { format, setFormat } = useClockFormat({ defaultFormat, switchable });
  const { ref, fontSize } = useScaledFontSize<HTMLDivElement>();
  const parts = formatTimeParts(now, format);

  return (
    <div
      ref={ref}
      data-testid="clock-widget"
      className={cn('flex h-full w-full flex-col justify-center gap-2', ALIGN_CLASS[align])}
    >
      <div data-testid="clock-scale" style={fontSize ? { fontSize } : undefined}>
        <ClockFace time={parts} />
      </div>
      {switchable ? <TimeFormatToggle format={format} onChange={setFormat} /> : null}
    </div>
  );
}
