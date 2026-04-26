export type SpatialAudioListener = (chunk: ArrayBuffer, end: boolean) => void;

export class SpatialAudioBus {
  private listeners = new Set<SpatialAudioListener>();

  subscribe(fn: SpatialAudioListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  publish(chunk: ArrayBuffer, end: boolean): void {
    for (const fn of this.listeners) {
      fn(chunk, end);
    }
  }
}
