import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface MapErrorBoundaryProps {
  /** Called when the map subtree throws (e.g. the tile source is unreachable). */
  onError: () => void;
  children: ReactNode;
}

interface MapErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches render errors from the map subtree so the app can fall back to the
 * list view instead of blanking.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  override state: MapErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
