import { AiError } from '../core/errors';

/**
 * Caps concurrent model calls so a burst (say, fifty tickets arriving together) queues politely
 * instead of tripping provider rate limits. When the queue is also full it rejects immediately,
 * which the application treats as "AI busy" and degrades gracefully.
 */
export class Bulkhead {
  private running = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly maxConcurrent: number,
    private readonly maxQueued: number,
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      if (this.waiting.length >= this.maxQueued) {
        throw new AiError('rate_limited', 'AI request queue is full.');
      }
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.running += 1;
    }

    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) next(); // hand the slot straight to the next waiter
      else this.running -= 1;
    }
  }

  get stats() {
    return { running: this.running, queued: this.waiting.length };
  }
}
