import { TicketCategory } from '../../constants/domain';

/**
 * The BookLeaf knowledge base, split into topics.
 *
 * Cost awareness: the full knowledge base is never sent to the model. Each request gets the
 * company overview, the tone guide, and only the topics relevant to the ticket's category
 * (see `buildKnowledgeContext`). That roughly halves the prompt compared with a full dump.
 */
type Topic = 'company' | 'royalty' | 'isbn' | 'printing' | 'distribution' | 'production';

const TOPICS: Record<Topic, readonly string[]> = {
  company: [
    'BookLeaf Publishing is a self-publishing company operating in India and the US.',
    'Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid; adds marketing and distribution).',
    'BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution and royalty management.',
    'In-house printing facility and warehouse are in Delhi. Print partners: Repro India and Epitome Books.',
  ],
  royalty: [
    'Royalty split is 80/20: 80% of net profit per book goes to the author, 20% to BookLeaf.',
    'Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart) and shipping charges.',
    'Royalties are calculated quarterly and paid within 45 days of the quarter ending.',
    'Minimum payout threshold is ₹1,000. Below it, royalties roll over to the next quarter.',
    "Payouts are made by bank transfer to the account linked in the author's dashboard.",
    'Authors can see a detailed royalty breakdown with sales figures per platform in their dashboard.',
  ],
  isbn: [
    "Every book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint.",
    'An author who wants an ISBN under their own imprint must obtain it independently.',
    'ISBN errors (duplicate, wrong book linked) are high-priority and escalated to the production team.',
    'Metadata (e.g. book description) updates can be submitted via the dashboard or by emailing the BookLeaf team; changes reflect on platforms in 3-5 business days.',
  ],
  printing: [
    'In-house printing handles most orders; overflow or special formats go to Repro India or Epitome Books.',
    'Standard print turnaround is 5-7 business days from order confirmation.',
    'For quality issues (misprints, binding defects, colour inconsistency) BookLeaf arranges a free reprint after verification. The author may need to share photos of the defective copy.',
  ],
  distribution: [
    'Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK and the BookLeaf Store.',
    'New listings usually go live 7-10 business days after publication is complete.',
    'A book showing as unavailable on a platform usually means a stock sync issue; BookLeaf can trigger a re-sync within 24-48 hours.',
  ],
  production: [
    'Production stages: Manuscript Received > Editing (if opted) > Cover Design > Typesetting > Proofreading > ISBN Assignment > Printing > Distribution Setup > Published & Live.',
    'Authors are emailed at each stage. Delays typically happen at Cover Design (waiting for author approval) and Proofreading (revision rounds).',
  ],
};

/** Which topics are worth including for each ticket category. */
const CATEGORY_TOPICS: Record<TicketCategory, readonly Topic[]> = {
  'Royalty & Payments': ['royalty'],
  'ISBN & Metadata Issues': ['isbn'],
  'Printing & Quality': ['printing'],
  'Distribution & Availability': ['distribution'],
  'Book Status & Production Updates': ['production'],
  'General Inquiry': ['isbn', 'distribution'],
};

/** How BookLeaf communicates with authors. Sent with every draft request. */
export const TONE_GUIDELINES: readonly string[] = [
  'Always empathetic and professional. Authors are partners, not customers to be managed.',
  "Acknowledge the author's concern before jumping to solutions.",
  'Be specific: use actual numbers, dates and statuses instead of vague reassurance.',
  "If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly. No corporate deflection.",
  'If the issue needs escalation or investigation, give a clear timeline (e.g. "within 48 hours"), never an open-ended promise.',
  'Always end with a clear next step for the author and/or the BookLeaf team.',
];

/** Per-category worked examples distilled from the sample query/response table in the brief. */
const RESPONSE_PLAYBOOK: Record<TicketCategory, readonly string[]> = {
  'Royalty & Payments': [
    'No royalty received: acknowledge the frustration, explain the quarterly cycle and 45-day payout window, ask them to confirm bank details are linked, state the specific next payout date. If genuinely overdue, escalate with a 48-hour resolution timeline.',
    'Royalty seems too low: explain net profit (MRP minus printing, platform commission and shipping), offer a line-by-line royalty breakdown, do not be defensive, offer transparency.',
  ],
  'ISBN & Metadata Issues': [
    'ISBN mismatch or error: treat as high priority, acknowledge it is a serious data issue, confirm escalation to the production team immediately, give a 48-hour resolution timeline.',
  ],
  'Printing & Quality': [
    'Print defects: apologise sincerely, ask for photos of the defective copies (unless the ticket already lists attachments, then thank them for those instead), confirm a free reprint once verified, give a 5-7 business day timeline for the reprint.',
  ],
  'Distribution & Availability': [
    'Showing unavailable on a platform: explain it is typically a stock sync issue, confirm a re-sync with the distribution team is being triggered, set the expectation of 24-48 hours.',
  ],
  'Book Status & Production Updates': [
    'Production delay: check the actual production status, be honest about the reason (e.g. waiting on author approval of proofs), give a specific updated timeline, never blame the author even if the delay is theirs; frame it collaboratively.',
  ],
  'General Inquiry': [
    'Metadata/description change on a live book: yes, submit it via the dashboard or by emailing the BookLeaf team; changes reflect on platforms within 3-5 business days.',
  ],
};

const bullets = (lines: readonly string[]): string => lines.map((line) => `- ${line}`).join('\n');

/** Policy text for one ticket category: company overview plus only the relevant topics. */
export const buildKnowledgeContext = (category: TicketCategory): string => {
  const sections = ['company', ...CATEGORY_TOPICS[category]] as Topic[];
  return sections.map((topic) => bullets(TOPICS[topic])).join('\n');
};

export const buildToneContext = (): string => bullets(TONE_GUIDELINES);

export const buildPlaybookContext = (category: TicketCategory): string => bullets(RESPONSE_PLAYBOOK[category]);

/** One-line category definitions, shared by the classifier prompt. */
export const CATEGORY_DEFINITIONS: Record<TicketCategory, string> = {
  'Royalty & Payments': 'royalty amounts, missing or late payouts, bank details, royalty calculations',
  'ISBN & Metadata Issues': 'wrong, duplicate or mismatched ISBNs; incorrect title/author/cover data on a listing',
  'Printing & Quality': 'misprints, binding or colour defects, blurry images, damaged copies, reprints',
  'Distribution & Availability': 'book unavailable, not listed or out of stock on Amazon, Flipkart or the BookLeaf Store',
  'Book Status & Production Updates': 'where a book is in production, delays, timelines, approvals',
  'General Inquiry': 'anything else: account questions, bio/description updates, how-to questions',
};
