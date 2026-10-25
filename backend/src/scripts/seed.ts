import bcrypt from 'bcryptjs';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { env } from '../config/env';
import { deriveSortKeys, Book, Counter, Ticket, TicketMessage, User } from '../models';

interface RawBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner?: string;
  available_on?: string[];
}

interface RawAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: RawBook[];
}

interface Dataset {
  authors: RawAuthor[];
}

const DEFAULT_PASSWORD = 'Password123!';

/** Same "provider:model" format the live AI writes, so seeded and new tickets read identically. */
const SEEDED_AI_MODEL = `gemini:${env.ai.providers.gemini.defaultModel}`;

/** `npm run seed -- --reset` wipes every collection first. Without it the seed is safe to re-run. */
const RESET = process.argv.includes('--reset');

type Fields = Record<string, unknown>;

/** Insert-or-update by a natural key. Passwords are only set on insert so re-seeding never resets them. */
const upsertUser = async (email: string, fields: Fields, passwordHash: string) =>
  User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { $set: { ...fields, email: email.toLowerCase() }, $setOnInsert: { passwordHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

const upsertBook = async (bookCode: string, fields: Fields) =>
  Book.findOneAndUpdate({ bookCode }, { $set: { ...fields, bookCode } }, { upsert: true, new: true, setDefaultsOnInsert: true });

async function seed() {
  console.info('[seed] Connecting to MongoDB...');
  await mongoose.connect(env.mongodbUri);
  console.info('[seed] MongoDB connected.');

  const samplePath = path.resolve(__dirname, '../../data/bookleaf-sample-data.json');
  if (!fs.existsSync(samplePath)) {
    throw new Error(`Sample dataset not found at ${samplePath}`);
  }

  const rawData: Dataset = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

  if (RESET) {
    console.info('[seed] --reset given: clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Book.deleteMany({}),
      Ticket.deleteMany({}),
      TicketMessage.deleteMany({}),
      Counter.deleteMany({}),
    ]);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // 1. Create Admins
  console.info('[seed] Creating admin accounts...');
  const admin = await upsertUser(
    'admin@bookleaf.pub',
    { name: 'Aditi Verma (Support Ops)', role: 'admin', phone: '+91-98111-22334', city: 'Delhi', isActive: true },
    passwordHash,
  );

  const secondaryAdmin = await upsertUser(
    'karan@bookleaf.pub',
    { name: 'Karan Mehra (Publishing Lead)', role: 'admin', phone: '+91-98222-33445', city: 'Mumbai', isActive: true },
    passwordHash,
  );

  // 2. Create Authors & Books
  console.info(`[seed] Seeding ${rawData.authors.length} authors and their books...`);
  const authorDocs = new Map<string, typeof User.prototype>();
  const bookDocs = new Map<string, typeof Book.prototype>();

  for (const a of rawData.authors) {
    const authorDoc = await upsertUser(
      a.email,
      {
        authorCode: a.author_id,
        name: a.name,
        role: 'author',
        phone: a.phone,
        city: a.city,
        joinedDate: new Date(a.joined_date),
        isActive: true,
      },
      passwordHash,
    );
    authorDocs.set(a.author_id, authorDoc);

    for (const b of a.books) {
      const bookDoc = await upsertBook(b.book_id, {
        author: authorDoc._id,
        title: b.title,
        isbn: b.isbn,
        genre: b.genre,
        publicationDate: b.publication_date ? new Date(b.publication_date) : null,
        status: b.status,
        mrp: b.mrp,
        royaltyPerCopy: b.author_royalty_per_copy,
        copiesSold: b.total_copies_sold,
        royaltyEarned: b.total_royalty_earned,
        royaltyPaid: b.royalty_paid,
        royaltyPending: b.royalty_pending,
        lastPayoutDate: b.last_royalty_payout_date ? new Date(b.last_royalty_payout_date) : null,
        // Books still in production have no print partner and are not listed anywhere yet.
        printPartner: b.print_partner ?? null,
        platforms: b.available_on ?? [],
      });
      bookDocs.set(b.book_id, bookDoc);
    }
  }

  console.info(`[seed] Seeded ${authorDocs.size} authors and ${bookDocs.size} books.`);

  // 3. Seed Realistic Support Tickets across Categories and Statuses
  if ((await Ticket.estimatedDocumentCount()) > 0) {
    console.info('[seed] Tickets already exist; leaving them untouched (use --reset to start over).');
    return finish(authorDocs.size, bookDocs.size);
  }
  console.info('[seed] Seeding initial tickets & conversations...');

  // Ticket 1: Royalty query from Priya Sharma (AUTH001)
  const priya = authorDocs.get('AUTH001')!;
  const gangaBook = bookDocs.get('BK001')!;

  const t1 = await Ticket.create({
    number: 1001,
    author: priya._id,
    book: gangaBook._id,
    subject: 'Quarterly royalty payment status for Whispers of the Ganges',
    description: 'Hello, I see that I have pending royalties of ₹3,570 for the last quarter. Could you please confirm when this will be credited to my linked HDFC account?',
    attachments: [],
    status: 'In Progress',
    category: 'Royalty & Payments',
    priority: 'Medium',
    assignee: admin._id,
    ai: {
      status: 'completed',
      source: 'llm',
      category: 'Royalty & Payments',
      priority: 'Medium',
      reasoning: 'Author inquiring about quarterly royalty payout timeline and bank transfer details.',
      model: SEEDED_AI_MODEL,
      classifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    },
    firstResponseAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    ...deriveSortKeys('Medium', 'In Progress'),
  });

  await TicketMessage.create([
    {
      ticket: t1._id,
      sender: priya._id,
      senderName: priya.name,
      senderRole: 'author',
      visibility: 'public',
      body: 'Hello, I see that I have pending royalties of ₹3,570 for the last quarter. Could you please confirm when this will be credited to my linked HDFC account?',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20),
    },
    {
      ticket: t1._id,
      sender: admin._id,
      senderName: admin.name,
      senderRole: 'admin',
      visibility: 'internal',
      body: 'Checked finance logs: Q4 payout batch is scheduled for processing by 15th Feb. Bank verification passed.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 19),
    },
    {
      ticket: t1._id,
      sender: admin._id,
      senderName: admin.name,
      senderRole: 'admin',
      visibility: 'public',
      body: 'Dear Priya,\n\nThank you for reaching out! As per BookLeaf policy, royalties are calculated quarterly and disbursed within 45 days of the quarter ending.\n\nYour pending balance of ₹3,570 meets our ₹1,000 threshold and is scheduled in our upcoming payout batch on February 15th via NEFT transfer to your linked HDFC account.\n\nPlease let us know if your bank details require any update before February 10th.',
      fromAiDraft: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
    },
    {
      ticket: t1._id,
      sender: priya._id,
      senderName: priya.name,
      senderRole: 'author',
      visibility: 'public',
      body: 'Thank you Aditi! The account details remain unchanged. I will watch out for the transfer.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
  ]);

  // Ticket 2: Critical ISBN issue from Rohit Kapoor (AUTH002)
  const rohit = authorDocs.get('AUTH002')!;
  const codeKarmaBook = bookDocs.get('BK003')!;

  const t2 = await Ticket.create({
    number: 1002,
    author: rohit._id,
    book: codeKarmaBook._id,
    subject: 'CRITICAL: ISBN mismatch on Amazon listing for Code & Karma',
    description: 'My readers informed me that the Amazon India page displays ISBN 978-93-5XXXX-02-8 instead of 978-93-5XXXX-03-5. This is causing confusion with another title!',
    attachments: [{ fileName: 'amazon_listing_screenshot.png', sizeBytes: 524288 }],
    status: 'Open',
    category: 'ISBN & Metadata Issues',
    priority: 'Critical',
    ai: {
      status: 'completed',
      source: 'llm',
      category: 'ISBN & Metadata Issues',
      priority: 'Critical',
      reasoning: 'Critical data integrity issue with live retailer ISBN linking. Needs immediate escalation to catalog & distribution team.',
      model: SEEDED_AI_MODEL,
      classifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    },
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    ...deriveSortKeys('Critical', 'Open'),
  });

  await TicketMessage.create({
    ticket: t2._id,
    sender: rohit._id,
    senderName: rohit.name,
    senderRole: 'author',
    visibility: 'public',
    body: 'My readers informed me that the Amazon India page displays ISBN 978-93-5XXXX-02-8 instead of 978-93-5XXXX-03-5. This is causing confusion with another title!',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  });

  // Ticket 3: Printing Quality issue from Ananya Reddy (AUTH003)
  const ananya = authorDocs.get('AUTH003')!;
  const book5 = bookDocs.get('BK005');

  const t3 = await Ticket.create({
    number: 1003,
    author: ananya._id,
    book: book5?._id ?? null,
    subject: 'Defective print copies received: blurry color illustrations',
    description: 'I just unboxed my 20 author copies and the color plates inside are severely smudged and misaligned. Pages 45-52 also appear clipped.',
    attachments: [
      { fileName: 'blurry_page_45.jpg', sizeBytes: 1258291 },
      { fileName: 'cover_misprint.jpg', sizeBytes: 1048576 },
    ],
    status: 'Open',
    category: 'Printing & Quality',
    priority: 'High',
    ai: {
      status: 'completed',
      source: 'llm',
      category: 'Printing & Quality',
      priority: 'High',
      reasoning: 'Physical defective author copies reported with misprints and clipped pages. Eligible for free replacement batch after photo review.',
      model: SEEDED_AI_MODEL,
      classifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    ...deriveSortKeys('High', 'Open'),
  });

  await TicketMessage.create({
    ticket: t3._id,
    sender: ananya._id,
    senderName: ananya.name,
    senderRole: 'author',
    visibility: 'public',
    body: 'I just unboxed my 20 author copies and the color plates inside are severely smudged and misaligned. Pages 45-52 also appear clipped.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  });

  // Ticket 4: Distribution issue from Vikram Malhotra (AUTH004)
  const rawAuthor4 = rawData.authors.find((a) => a.author_id === 'AUTH004');
  if (rawAuthor4 && authorDocs.has('AUTH004')) {
    const author4 = authorDocs.get('AUTH004')!;
    const book4 = bookDocs.get(rawAuthor4.books[0]?.book_id);

    const t4 = await Ticket.create({
      number: 1004,
      author: author4._id,
      book: book4?._id ?? null,
      subject: 'Paperback showing "Currently Unavailable" on Flipkart',
      description: 'My readers in Bangalore reported that Flipkart marks my book as out of stock for the past 3 days. Could you check inventory sync?',
      attachments: [],
      status: 'Resolved',
      category: 'Distribution & Availability',
      priority: 'Medium',
      assignee: secondaryAdmin._id,
      ai: {
        status: 'completed',
        source: 'llm',
        category: 'Distribution & Availability',
        priority: 'Medium',
        reasoning: 'Stock synchronization delay on Flipkart retail channel.',
        model: SEEDED_AI_MODEL,
        classifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
      },
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      ...deriveSortKeys('Medium', 'Resolved'),
    });

    await TicketMessage.create([
      {
        ticket: t4._id,
        sender: author4._id,
        senderName: author4.name,
        senderRole: 'author',
        visibility: 'public',
        body: 'My readers in Bangalore reported that Flipkart marks my book as out of stock for the past 3 days. Could you check inventory sync?',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
      },
      {
        ticket: t4._id,
        sender: secondaryAdmin._id,
        senderName: secondaryAdmin.name,
        senderRole: 'admin',
        visibility: 'public',
        body: 'Hello Vikram,\n\nWe have triggered an inventory re-sync with Flipkart catalog operations. The inventory feed has refreshed and the listing is now active again.\n\nThank you for alerting us promptly!',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      },
    ]);
  }

  // Update sequence counter
  await Counter.updateOne({ _id: 'ticket' }, { $set: { value: 4 } }, { upsert: true });

  return finish(authorDocs.size, bookDocs.size);
}

async function finish(authors: number, books: number) {
  console.info('====================================================');
  console.info('[seed] Database seeded successfully!');
  console.info(`[seed] Admin Credentials: admin@bookleaf.pub / ${DEFAULT_PASSWORD}`);
  console.info(`[seed] Author Credentials: priya.sharma@email.com / ${DEFAULT_PASSWORD}`);
  console.info(`[seed] Total Authors: ${authors}, Total Books: ${books}`);
  console.info('====================================================');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error seeding database:', err);
  process.exit(1);
});
