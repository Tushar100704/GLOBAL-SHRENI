import { logUiClick } from '../api/marketplaceApi';

export function trackUiAction(action: string, target: string, metadata: Record<string, unknown> = {}): void {
  const payload = {
    action,
    target,
    metadata,
    timestamp: new Date().toISOString(),
  };
  console.info('[UI_CLICK]', payload);
  void logUiClick(action, target, metadata);
}
