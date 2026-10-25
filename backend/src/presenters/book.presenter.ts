import { PUBLISHED_STATUS } from '../constants/domain';
import type { BookFacts } from '../ai-sdk/ticket-ai';
import { BookAttrs } from '../models';

type BookRecord = BookAttrs & { _id: unknown };

/** The public shape of a book, with `isPublished` derived so clients never parse status strings. */
export const presentBook = (book: BookRecord) => ({
  id: String(book._id),
  bookCode: book.bookCode,
  title: book.title,
  isbn: book.isbn,
  genre: book.genre,
  publicationDate: book.publicationDate,
  status: book.status,
  isPublished: book.status === PUBLISHED_STATUS,
  mrp: book.mrp,
  royaltyPerCopy: book.royaltyPerCopy,
  copiesSold: book.copiesSold,
  royaltyEarned: book.royaltyEarned,
  royaltyPaid: book.royaltyPaid,
  royaltyPending: book.royaltyPending,
  lastPayoutDate: book.lastPayoutDate,
  printPartner: book.printPartner,
  platforms: book.platforms,
});

export const toBookFacts = (book: BookRecord): BookFacts => ({
  title: book.title,
  status: book.status,
  isPublished: book.status === PUBLISHED_STATUS,
  publicationDate: book.publicationDate ?? null,
  mrp: book.mrp ?? null,
  royaltyPerCopy: book.royaltyPerCopy ?? null,
  copiesSold: book.copiesSold ?? 0,
  royaltyEarned: book.royaltyEarned ?? 0,
  royaltyPaid: book.royaltyPaid ?? 0,
  royaltyPending: book.royaltyPending ?? 0,
  lastPayoutDate: book.lastPayoutDate ?? null,
  platforms: book.platforms ?? [],
  printPartner: book.printPartner ?? null,
});
