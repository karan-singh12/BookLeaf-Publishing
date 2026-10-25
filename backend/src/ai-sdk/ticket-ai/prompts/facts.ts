import { BookFacts, DraftInput } from '../ai.types';
import { MINIMUM_PAYOUT_INR, getPayoutSchedule, monthsBetween } from '../../../utils/royalty-schedule';

const inr = (amount: number | null): string => (amount !== null ? `₹${amount.toLocaleString('en-IN')}` : 'n/a');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "30 Sep 2026". Hand-rolled because Intl's abbreviations differ between Node/ICU versions ("Sept"). */
const date = (value: Date): string => `${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;

const describeBook = (book: BookFacts, today: Date): string => {
  if (!book.isPublished) {
    return [
      `Book: "${book.title}"`,
      `Production status: ${book.status}. Not yet published, so no sales or royalties exist for it.`,
    ].join('\n');
  }

  const lines = [
    `Book: "${book.title}"`,
    `Status: ${book.status}${book.publicationDate ? `, published ${date(book.publicationDate)} (${monthsBetween(book.publicationDate, today)} months ago)` : ''}`,
    `MRP ${inr(book.mrp)}, author royalty per copy ${inr(book.royaltyPerCopy)}, copies sold ${book.copiesSold}`,
    // `paid` is cumulative. The size of the most recent payout is not recorded, so say so: otherwise a model
    // happily reports the cumulative total as "your last payment".
    `Royalty: earned ${inr(book.royaltyEarned)} in total, ${inr(book.royaltyPaid)} paid so far (cumulative), ${inr(book.royaltyPending)} pending`,
    book.lastPayoutDate ? `Most recent payout was on ${date(book.lastPayoutDate)} (its individual amount is not recorded; do not state it)` : 'Last royalty payout: none yet (no payout has ever been made for this book)',
    book.royaltyPending > 0
      ? book.royaltyPending >= MINIMUM_PAYOUT_INR
        ? `Pending amount is above the ${inr(MINIMUM_PAYOUT_INR)} minimum payout threshold, so it is eligible for the next payout.`
        : `Pending amount is below the ${inr(MINIMUM_PAYOUT_INR)} minimum payout threshold, so it rolls over to the next quarter.`
      : 'Nothing is pending.',
    `Available on: ${book.platforms.length ? book.platforms.join(', ') : 'no platforms yet'}. Printed by: ${book.printPartner ?? 'n/a'}`,
  ];
  return lines.join('\n');
};

/**
 * Authoritative, system-derived facts about this author and book. The model is told to quote
 * numbers and dates from here only, which is what keeps drafts specific without hallucination.
 */
export const buildFactsContext = (input: DraftInput): string => {
  const schedule = getPayoutSchedule(input.today);
  const parts = [
    `Today: ${date(input.today)}`,
    `Payout calendar: last quarter ended ${date(schedule.lastQuarterEnd)} (payout due by ${date(schedule.lastQuarterPayoutDue)}); current quarter ends ${date(schedule.currentQuarterEnd)} (payout due by ${date(schedule.currentQuarterPayoutDue)}).`,
  ];

  if (input.focusBook) {
    parts.push(describeBook(input.focusBook, input.today));
  } else if (input.otherBooks.length > 0) {
    parts.push(
      'This is an account-level ticket. The author\'s books:',
      ...input.otherBooks.map(
        (book) =>
          `- "${book.title}" [${book.status}] pending royalty ${inr(book.royaltyPending)}, last payout ${book.lastPayoutDate ? date(book.lastPayoutDate) : 'none'}`,
      ),
    );
  } else {
    parts.push('No book data is linked to this ticket.');
  }

  return parts.join('\n');
};
