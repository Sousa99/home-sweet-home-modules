export type TransitionVariant = 'slide' | 'slide-up';

export interface ExitPreset {
  x: number;
  y: number;
}

const EXIT_PRESETS: Record<TransitionVariant, ExitPreset> = {
  slide: { x: 500, y: 0 },
  'slide-up': { x: 0, y: -48 },
};

export function resolveExitPreset(variant: TransitionVariant = 'slide'): ExitPreset {
  return EXIT_PRESETS[variant];
}
