import { ClockWidget } from './ClockWidget';
import type { ClockWidgetProps } from './ClockWidget';

export type ClockPlainProps = ClockWidgetProps & { aspectRatio?: string };

export function ClockPlain({ aspectRatio, ...props }: ClockPlainProps) {
  return (
    <div
      data-testid="clock-plain"
      className="h-full w-full"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <ClockWidget {...props} />
    </div>
  );
}
