/**
 * Stops hammering a provider that is down or rate-limiting us.
 *
 * After `failureThreshold` consecutive failures the breaker opens and calls are skipped instantly
 * (so users never wait on a dead dependency). After `cooldownMs` a single trial request is let
 * through; success closes the breaker, failure re-opens it.
 */
export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  canRequest(): boolean {
    if (this.openedAt === null) return true;
    if (this.now() - this.openedAt >= this.cooldownMs) {
      // Half-open: allow one probe, and re-arm the cooldown so concurrent callers still skip.
      this.openedAt = this.now();
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openedAt = this.now();
    }
  }

  get isOpen(): boolean {
    return this.openedAt !== null;
  }
}
