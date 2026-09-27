import { Card } from '../ui/card';
import { ClockWidget } from './ClockWidget';
import type { ClockWidgetProps } from './ClockWidget';

export type ClockCardProps = ClockWidgetProps & { aspectRatio?: string };

export function ClockCard({ aspectRatio, ...props }: ClockCardProps) {
  return (
    <Card
      data-testid="clock-card"
      className="h-full w-full"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      <ClockWidget {...props} />
    </Card>
  );
}
