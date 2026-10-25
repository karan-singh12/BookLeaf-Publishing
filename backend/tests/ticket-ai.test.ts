import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AiError, MockProvider, createAiClient, type AiSdkConfig } from '../src/ai-sdk';
import { TicketAiService } from '../src/ai-sdk/ticket-ai/ticket-ai.service';
import { heuristicClassify } from '../src/ai-sdk/ticket-ai/heuristic-classifier';
import { buildClassificationPrompt } from '../src/ai-sdk/ticket-ai/prompts/classification.prompt';
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from '../src/ai-sdk/ticket-ai/prompts/draft.prompt';
import type { BookFacts, DraftInput } from '../src/ai-sdk/ticket-ai/ai.types';
import { getPayoutSchedule, monthsBetween } from '../src/utils/royalty-schedule';

const blank = { apiKey: '', baseUrl: 'http://unused', defaultModel: 'm' };
const config: AiSdkConfig = {
  providers: { gemini: blank, openai: blank, anthropic: blank, openrouter: blank },
  routes: {},
  defaultRoute: 'llm',
  timeoutMs: 1000,
  retries: 0,
  temperature: 0.3,
  maxConcurrent: 2,
  maxQueued: 5,
};

const serviceWith = (provider: MockProvider) =>
  new TicketAiService(createAiClient(config, { providers: [provider], silent: true, router: { retry: { sleep: async () => undefined } } }));

const ticket = { subject: 'No royalty yet', description: 'I published 4 months ago and have not received any royalty.' };

const publishedBook: BookFacts = {
  title: 'Whispers of the Ganges',
  status: 'Published & Live',
  isPublished: true,
  publicationDate: new Date('2023-06-20'),
  mrp: 399,
  royaltyPerCopy: 35,
  copiesSold: 342,
  royaltyEarned: 11970,
  royaltyPaid: 8400,
  royaltyPending: 3570,
  lastPayoutDate: new Date('2025-10-15'),
  platforms: ['Amazon India', 'Flipkart'],
  printPartner: 'In-House',
};

const draftInput = (overrides: Partial<DraftInput> = {}): DraftInput => ({
  authorName: 'Priya Sharma',
  ...ticket,
  category: 'Royalty & Payments',
  focusBook: publishedBook,
  otherBooks: [],
  today: new Date('2026-10-25'),
  ...overrides,
});

describe('classification', () => {
  it('uses the model answer and records provider, model and token usage', async () => {
    const llm = new MockProvider('llm', JSON.stringify({ category: 'Royalty & Payments', priority: 'High', reasoning: 'Unpaid royalty.' }), 'tiny');
    const result = await serviceWith(llm).classify(ticket);

    assert.equal(result.source, 'llm');
    assert.equal(result.category, 'Royalty & Payments');
    assert.equal(result.priority, 'High');
    assert.equal(result.model, 'llm:tiny');
    assert.deepEqual(result.usage, { promptTokens: 10, outputTokens: 5 });
  });

  it('accepts enum values regardless of case', async () => {
    const llm = new MockProvider('llm', JSON.stringify({ category: 'royalty & payments', priority: 'CRITICAL', reasoning: '' }));
    const result = await serviceWith(llm).classify(ticket);
    assert.deepEqual([result.category, result.priority], ['Royalty & Payments', 'Critical']);
  });

  it('falls back to keyword rules when the model invents a category', async () => {
    const llm = new MockProvider('llm', JSON.stringify({ category: 'Billing', priority: 'Urgent', reasoning: '' }));
    const result = await serviceWith(llm).classify(ticket);
    assert.equal(result.source, 'heuristic');
    assert.equal(result.failureReason, 'invalid_output');
    assert.equal(result.category, 'Royalty & Payments');
  });

  it('falls back to keyword rules when the provider is down, and says why', async () => {
    const llm = new MockProvider('llm', () => {
      throw new AiError('rate_limited', '429');
    });
    const result = await serviceWith(llm).classify(ticket);
    assert.equal(result.source, 'heuristic');
    assert.equal(result.failureReason, 'rate_limited');
  });

  it('falls back (not_configured) when no key exists at all', async () => {
    const service = new TicketAiService(createAiClient({ ...config, defaultRoute: undefined }, { silent: true }));
    assert.equal(service.isConfigured, false);
    assert.equal((await service.classify(ticket)).failureReason, 'not_configured');
  });

  it('sends the schema, the ticket and nothing else (no knowledge base, no history)', async () => {
    const llm = new MockProvider('llm', JSON.stringify({ category: 'General Inquiry', priority: 'Low', reasoning: '' }));
    await serviceWith(llm).classify({ ...ticket, book: { title: 'Code & Karma', status: 'Published & Live' } });

    const call = llm.calls[0]!;
    assert.equal(call.jsonSchema?.additionalProperties, false);
    assert.match(call.prompt, /Code & Karma/);
    assert.ok(call.prompt.length < 400, 'classification prompt should stay tiny');
    assert.ok(!/80\/20|Repro India/.test(call.prompt), 'no knowledge base in classification calls');
  });

  it('truncates very long descriptions', () => {
    const prompt = buildClassificationPrompt({ subject: 's', description: 'x'.repeat(10_000) });
    assert.ok(prompt.length < 1700);
  });
});

describe('draft replies', () => {
  it('returns the model draft, cleaned, with the sign-off guaranteed', async () => {
    const llm = new MockProvider('llm', '```\nHi Priya,\n\n**Sorry** about the wait.\n```');
    const result = await serviceWith(llm).draft(draftInput());

    assert.equal(result.source, 'llm');
    assert.ok(!result.text.includes('```') && !result.text.includes('**'));
    assert.ok(result.text.endsWith('BookLeaf Author Support Team'));
  });

  it('degrades to a category template addressed to the author by first name', async () => {
    const llm = new MockProvider('llm', () => {
      throw new AiError('upstream_error', 'down');
    });
    const result = await serviceWith(llm).draft(draftInput());

    assert.equal(result.source, 'template');
    assert.equal(result.failureReason, 'upstream_error');
    assert.match(result.text, /^Hi Priya,/);
    assert.match(result.text, /45 days/);
    assert.match(result.text, /48 hours/);
  });

  it('has a template for every category', async () => {
    const llm = new MockProvider('llm', () => {
      throw new AiError('timeout', 't');
    });
    const service = serviceWith(llm);
    for (const category of ['Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry'] as const) {
      const { text } = await service.draft(draftInput({ category }));
      assert.ok(text.length > 150, category);
    }
  });
});

describe('draft prompt: grounding and token economy', () => {
  it('includes real book figures and the exact payout dates, computed in code', () => {
    const prompt = buildDraftPrompt(draftInput());
    assert.match(prompt, /copies sold 342/);
    assert.match(prompt, /₹3,570 pending/);
    assert.match(prompt, /₹8,400 paid so far \(cumulative\)/, 'paid is a running total, never "the last payment"');
    assert.match(prompt, /individual amount is not recorded/);
    assert.match(prompt, /eligible for the next payout/);
    // Today is 25 Oct 2026: last quarter ended 30 Sep 2026, payout due 14 Nov 2026.
    assert.match(prompt, /last quarter ended 30 Sep 2026 \(payout due by 14 Nov 2026\)/);
  });

  it('only includes the policy slice for the ticket category', () => {
    const royalty = buildDraftPrompt(draftInput({ category: 'Royalty & Payments' }));
    const printing = buildDraftPrompt(draftInput({ category: 'Printing & Quality', focusBook: null }));

    assert.match(royalty, /80\/20/);
    assert.ok(!/Repro India or Epitome Books; overflow/.test(royalty));
    assert.ok(!/80\/20/.test(printing), 'royalty policy must not be sent for a printing ticket');
    assert.match(printing, /free reprint/);
    assert.ok(printing.length < royalty.length * 1.6);
  });

  it('describes an in-production book without inventing sales or royalties', () => {
    const prompt = buildDraftPrompt(
      draftInput({
        category: 'Book Status & Production Updates',
        focusBook: { ...publishedBook, status: 'In Production - Cover Design', isPublished: false, publicationDate: null, mrp: null, royaltyPerCopy: null, copiesSold: 0, royaltyEarned: 0, royaltyPaid: 0, royaltyPending: 0, lastPayoutDate: null, platforms: [], printPartner: null },
      }),
    );
    assert.match(prompt, /Production status: In Production - Cover Design/);
    assert.match(prompt, /no sales or royalties exist/);
    assert.ok(!/NaN|undefined|null/.test(prompt));
  });

  it('states plainly when a published book has never been paid', () => {
    const prompt = buildDraftPrompt(draftInput({ focusBook: { ...publishedBook, royaltyPaid: 0, lastPayoutDate: null } }));
    assert.match(prompt, /no payout has ever been made/);
  });

  it('explains rollover when the pending amount is under the minimum payout', () => {
    const prompt = buildDraftPrompt(draftInput({ focusBook: { ...publishedBook, royaltyPending: 850 } }));
    assert.match(prompt, /below the ₹1,000 minimum payout threshold, so it rolls over/);
  });

  it('summarises the author\'s books for account-level tickets and caps the follow-up', () => {
    const prompt = buildDraftPrompt(draftInput({ focusBook: null, otherBooks: [publishedBook], followUp: 'y'.repeat(5000) }));
    assert.match(prompt, /account-level ticket/);
    assert.match(prompt, /"Whispers of the Ganges" \[Published & Live\] pending royalty ₹3,570/);
    assert.ok(prompt.length < 6000);
  });
});

describe('keyword fallback matches the brief\'s own examples', () => {
  const cases: Array<[string, string, string, string]> = [
    ['Royalty not received', "I haven't received any royalty for 6 months. What is going on?", 'Royalty & Payments', 'Critical'],
    ['Royalty looks low', 'My royalty amount seems too low. I sold 200 copies but only received 3,000.', 'Royalty & Payments', 'Medium'],
    ['ISBN mismatch', 'My book is showing a different ISBN on Amazon than what is on the physical copy.', 'ISBN & Metadata Issues', 'High'],
    ['Print quality', 'I received my author copies and the print quality is terrible. Images are blurry and pages are misaligned.', 'Printing & Quality', 'High'],
    ['Unavailable on Amazon', 'My book is published but it is showing as Currently Unavailable on Amazon.', 'Distribution & Availability', 'High'],
    ['Where is my book', 'It has been 3 weeks and my book is still in typesetting. When will it be done?', 'Book Status & Production Updates', 'Medium'],
    ['Update my author bio', 'Can I update my author bio?', 'General Inquiry', 'Low'],
    ['Legal threat', 'This is fraud. I will speak to a lawyer about my royalty.', 'Royalty & Payments', 'Critical'],
  ];

  for (const [subject, description, category, priority] of cases) {
    it(`${subject} -> ${category} / ${priority}`, () => {
      const result = heuristicClassify({ subject, description });
      assert.equal(result.category, category);
      assert.equal(result.priority, priority);
    });
  }

  it('reads durations written as words and years', () => {
    assert.equal(heuristicClassify({ subject: 'Royalty', description: 'I have not received my royalty for eight months.' }).priority, 'Critical');
    assert.equal(heuristicClassify({ subject: 'Royalty', description: 'No royalty received for 1 year now.' }).priority, 'Critical');
    assert.equal(heuristicClassify({ subject: 'Royalty', description: 'I have not received my royalty for 2 months.' }).priority, 'High');
  });
});

describe('payout calendar', () => {
  it('computes the last and current quarter and the 45-day payout deadline', () => {
    const schedule = getPayoutSchedule(new Date('2026-10-25'));
    assert.equal(schedule.lastQuarterEnd.toISOString().slice(0, 10), '2026-09-30');
    assert.equal(schedule.lastQuarterPayoutDue.toISOString().slice(0, 10), '2026-11-14');
    assert.equal(schedule.currentQuarterEnd.toISOString().slice(0, 10), '2026-12-31');
    assert.equal(schedule.currentQuarterPayoutDue.toISOString().slice(0, 10), '2027-02-14');
  });

  it('handles the January boundary (last quarter ends in the previous year)', () => {
    const schedule = getPayoutSchedule(new Date('2026-01-10'));
    assert.equal(schedule.lastQuarterEnd.toISOString().slice(0, 10), '2025-12-31');
    assert.equal(schedule.lastQuarterPayoutDue.toISOString().slice(0, 10), '2026-02-14');
  });

  it('counts whole months', () => {
    assert.equal(monthsBetween(new Date('2025-06-20'), new Date('2026-10-25')), 16);
    assert.equal(monthsBetween(new Date('2026-10-26'), new Date('2026-10-25')), 0);
  });
});

describe('draft awareness: attachments and channel', () => {
  const printing = (extra: Partial<DraftInput> = {}) =>
    draftInput({ category: 'Printing & Quality', subject: 'Defective copies', description: 'The print quality is terrible, images are blurry.', focusBook: null, ...extra });

  it('tells the model which files the author already attached, and not to ask again', () => {
    const prompt = buildDraftPrompt(printing({ attachmentNames: ['blurry_page_45.jpg', 'cover_misprint.jpg'] }));
    assert.match(prompt, /ATTACHMENTS: blurry_page_45.jpg, cover_misprint.jpg \(file names only\)/);
    assert.match(DRAFT_SYSTEM_PROMPT, /never ask for the same files again/);
    assert.match(prompt, /thank them for those instead/, 'the printing playbook must not tell the model to request photos unconditionally');
  });

  it('says ATTACHMENTS: none when there are no files', () => {
    assert.match(buildDraftPrompt(printing()), /ATTACHMENTS: none/);
    assert.match(buildDraftPrompt(printing({ attachmentNames: [] })), /ATTACHMENTS: none/);
  });

  it('states that conversations happen in the portal, not by email', () => {
    const { prompt, system } = (() => ({ prompt: buildDraftPrompt(printing()), system: DRAFT_SYSTEM_PROMPT }))();
    assert.match(system, /inside the BookLeaf author portal/);
    assert.match(system, /never "reply to this email"/);
    assert.ok(prompt.length > 0);
  });

  it('rewrites "reply to this email" if the model says it anyway', async () => {
    const llm = new MockProvider('llm', 'Hi Priya,\n\nPlease reply to this email with your photos. Or Reply To This Message.\n\nWarm regards,\nBookLeaf Author Support Team');
    const { text } = await serviceWith(llm).draft(draftInput());
    assert.ok(!/reply to this (email|message)/i.test(text));
    assert.match(text, /reply on this ticket with your photos\. Or reply on this ticket\./);
  });

  it('sends the attachment names through to the model call', async () => {
    const llm = new MockProvider('llm', 'Hi Priya,\n\nThanks for the photos.\n\nWarm regards,\nBookLeaf Author Support Team');
    await serviceWith(llm).draft(printing({ attachmentNames: ['page.jpg'] }));
    assert.match(llm.calls[0]!.prompt, /ATTACHMENTS: page.jpg/);
  });

  it('template fallback asks for photos only when none were attached', async () => {
    const down = new MockProvider('llm', () => {
      throw new AiError('timeout', 't');
    });
    const service = serviceWith(down);

    const without = await service.draft(printing());
    assert.match(without.text, /Could you share a few photos/);

    const withFiles = await service.draft(printing({ attachmentNames: ['page.jpg'] }));
    assert.ok(!/Could you share a few photos/.test(withFiles.text));
    assert.match(withFiles.text, /Thank you for the photos you attached/);

    const isbn = await service.draft(draftInput({ category: 'ISBN & Metadata Issues', attachmentNames: ['listing.png'] }));
    assert.ok(!/screenshot of the listing/.test(isbn.text));
    assert.match(isbn.text, /Thank you for the files you attached/);
  });
});
