export type TransitionVariant = 'slide' | 'gentle';

const EXIT_TRAVEL: Record<TransitionVariant, number> = {
  slide: 500,
  gentle: 80,
};

export function resolveExitTravel(variant: TransitionVariant = 'slide'): number {
  return EXIT_TRAVEL[variant];
}
