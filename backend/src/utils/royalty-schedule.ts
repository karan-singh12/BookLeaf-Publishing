/** BookLeaf pays royalties within this many days of a calendar quarter ending. */
export const PAYOUT_WINDOW_DAYS = 45;
/** Below this accumulated amount (INR), royalties roll over to the next quarter. */
export const MINIMUM_PAYOUT_INR = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PayoutSchedule {
  lastQuarterEnd: Date;
  lastQuarterPayoutDue: Date;
  currentQuarterEnd: Date;
  currentQuarterPayoutDue: Date;
}

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

/**
 * Deterministic payout calendar. Dates are computed in code, never by the LLM,
 * so the draft can quote exact dates without any risk of hallucination.
 */
export const getPayoutSchedule = (today: Date): PayoutSchedule => {
  const year = today.getUTCFullYear();
  const quarterStartMonth = Math.floor(today.getUTCMonth() / 3) * 3;

  // Day 0 of a month is the last day of the previous month.
  const lastQuarterEnd = new Date(Date.UTC(year, quarterStartMonth, 0));
  const currentQuarterEnd = new Date(Date.UTC(year, quarterStartMonth + 3, 0));

  return {
    lastQuarterEnd,
    lastQuarterPayoutDue: addDays(lastQuarterEnd, PAYOUT_WINDOW_DAYS),
    currentQuarterEnd,
    currentQuarterPayoutDue: addDays(currentQuarterEnd, PAYOUT_WINDOW_DAYS),
  };
};

/** Whole calendar months between two dates (floored, never negative). */
export const monthsBetween = (from: Date, to: Date): number => {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()) -
    (to.getUTCDate() < from.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
};
