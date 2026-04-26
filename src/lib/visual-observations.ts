export type VisualObservationCategory =
  | 'away'
  | 'integrity'
  | 'stress'
  | 'engagement'
  | 'aha'
  | 'gesture'
  | 'environment';

export type VisualObservationSeverity = 'low' | 'medium' | 'high';

export interface VisualObservation {
  id: string;
  timestamp: number;
  category: VisualObservationCategory;
  severity: VisualObservationSeverity;
  note: string;
}

export function categoryEmoji(c: VisualObservationCategory): string {
  switch (c) {
    case 'away': return '👁️‍🗨️';
    case 'integrity': return '🚨';
    case 'stress': return '😟';
    case 'engagement': return '✨';
    case 'aha': return '💡';
    case 'gesture': return '✋';
    case 'environment': return '🌅';
  }
}
