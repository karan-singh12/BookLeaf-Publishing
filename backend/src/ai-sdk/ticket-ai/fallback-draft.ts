import { TicketCategory } from '../../constants/domain';

const SIGN_OFF = 'Warm regards,\nBookLeaf Author Support Team';

/**
 * Policy-accurate starting points used when the AI is unavailable, so an admin never faces a
 * blank box. They are deliberately generic; the admin is expected to personalise before sending.
 */
const BODIES: Record<TicketCategory, string> = {
  'Royalty & Payments':
    "I understand how important it is to have clarity on your royalties, and I'm sorry this has been a worry.\n\nRoyalties are calculated quarterly and paid within 45 days of the quarter ending, by bank transfer to the account linked in your dashboard (amounts below ₹1,000 roll over to the next quarter). I'm checking your royalty statement and payout status now, and our team will come back to you within 48 hours with the exact figures and your next payout date.\n\nIn the meantime, could you confirm that your bank details in the dashboard are up to date?",
  'ISBN & Metadata Issues':
    "Thank you for flagging this. An ISBN problem is a serious data issue and we treat it as high priority.\n\nI'm escalating it to our production team right now so they can verify the ISBN registered against your book and correct any mismatch. You will hear back from us within 48 hours with a resolution.\n\nIf you can send a screenshot of the listing and a photo of the ISBN on your physical copy, it will help us resolve this faster.",
  'Printing & Quality':
    "I'm sorry your copies didn't meet the standard we hold ourselves to.\n\nCould you share a few photos of the affected pages and the cover? Once our team has verified the issue, we will arrange a free reprint, which usually takes 5-7 business days from confirmation.\n\nAs soon as we receive the photos, we will confirm the reprint with you.",
  'Distribution & Availability':
    "Thanks for letting us know, and I'm sorry for the trouble.\n\nWhen a published book shows as unavailable, it is usually a stock sync issue between us and the platform. I'm asking our distribution team to trigger a re-sync today, and the listing should be back within 24-48 hours.\n\nWe'll check the listing after that window and update you here either way.",
  'Book Status & Production Updates':
    "Thanks for checking in. I know waiting on a book is hard, and I want you to have a clear picture.\n\nI'm reviewing exactly where your book sits in the production pipeline and what is needed to move it to the next stage. We'll send you a specific update, including an expected date, within 48 hours.\n\nIf anything is waiting on your input, we'll point it out so we can move it forward together.",
  'General Inquiry':
    "Thanks for getting in touch, happy to help.\n\nMetadata changes such as a book description can be submitted through your dashboard or by emailing our team, and updates usually reflect on the platforms within 3-5 business days.\n\nLet us know the exact change you'd like and we'll take care of it.",
};

/**
 * Sentences in the templates that ask the author for files. When the author has already attached
 * some, each is swapped for a thank-you, so the template never asks for what it already has.
 */
const ASK_FOR_FILES: Partial<Record<TicketCategory, Array<[ask: string, thanks: string]>>> = {
  'ISBN & Metadata Issues': [
    [
      'If you can send a screenshot of the listing and a photo of the ISBN on your physical copy, it will help us resolve this faster.',
      'Thank you for the files you attached; they will help our team resolve this faster.',
    ],
  ],
  'Printing & Quality': [
    ['Could you share a few photos of the affected pages and the cover?', 'Thank you for the photos you attached; our team will review them.'],
    ['As soon as we receive the photos, we will confirm the reprint with you.', 'Once the photos are verified, we will confirm the reprint with you.'],
  ],
};

export const buildTemplateDraft = (category: TicketCategory, authorFirstName: string, attachmentNames: string[] = []): string => {
  let body = BODIES[category];
  if (attachmentNames.length > 0) {
    for (const [ask, thanks] of ASK_FOR_FILES[category] ?? []) body = body.replace(ask, thanks);
  }
  return `Hi ${authorFirstName},\n\n${body}\n\n${SIGN_OFF}`;
};
