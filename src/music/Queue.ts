import type { TrackInfo } from '../types/track';
import { LoopMode } from '../types/track';

export class Queue {
  private items: TrackInfo[] = [];
  private currentTrack: TrackInfo | null = null;
  public loopMode: LoopMode = LoopMode.Off;

  get length(): number {
    return this.items.length;
  }

  get current(): TrackInfo | null {
    return this.currentTrack;
  }

  get list(): TrackInfo[] {
    return [...this.items];
  }

  get totalDuration(): number {
    return this.items.reduce((acc, t) => acc + (t.isLive ? 0 : t.duration), 0);
  }

  push(...tracks: TrackInfo[]): void {
    this.items.push(...tracks);
  }

  unshift(...tracks: TrackInfo[]): void {
    this.items.unshift(...tracks);
  }

  next(): TrackInfo | null {
    if (this.loopMode === LoopMode.Track && this.currentTrack) {
      return this.currentTrack;
    }

    if (this.loopMode === LoopMode.Queue && this.currentTrack) {
      this.items.push(this.currentTrack);
    }

    const track = this.items.shift() ?? null;
    this.currentTrack = track;
    return track;
  }

  peek(): TrackInfo | null {
    return this.items[0] ?? null;
  }

  removeAt(index: number): TrackInfo | null {
    if (index < 0 || index >= this.items.length) return null;
    return this.items.splice(index, 1)[0] ?? null;
  }

  clear(): void {
    this.items = [];
  }

  shuffle(): void {
    for (let i = this.items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    }
  }

  setLoop(mode: LoopMode): void {
    this.loopMode = mode;
  }

  setCurrent(track: TrackInfo | null): void {
    this.currentTrack = track;
  }
}
