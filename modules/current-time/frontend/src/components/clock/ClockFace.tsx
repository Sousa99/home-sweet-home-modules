import type { TimeParts } from '../../lib/timeFormat';

export interface ClockFaceProps {
  time: TimeParts;
}

export function ClockFace({ time }: ClockFaceProps) {
  return (
    <div data-testid="clock" className="flex items-baseline font-mono tabular-nums tracking-tight">
      <span className="text-[1.6em] font-bold leading-none text-slate-800">{time.hours}</span>
      <span className="mx-[0.12em] text-[1em] font-light text-slate-400">:</span>
      <span className="text-[1.6em] font-bold leading-none text-slate-800">{time.minutes}</span>
      <span className="mx-[0.12em] text-[1em] font-light text-slate-400">:</span>
      <span className="text-[1.6em] font-bold leading-none text-slate-800">{time.seconds}</span>
      {time.ampm ? (
        <span className="ml-[0.3em] text-[0.5em] font-medium text-amber-600">{time.ampm}</span>
      ) : null}
    </div>
  );
}
