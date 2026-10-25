import { aiClient, ticketAi } from '../ai-sdk/ticket-ai';

/**
 * Live smoke test of the AI setup: `npm run ai:check`.
 * Makes one real classification and one real draft call, then prints which provider and model
 * answered, latency and token usage. Never prints API keys.
 */
async function run() {
  const before = aiClient.status();
  console.info('Providers:');
  for (const provider of before.providers) {
    console.info(`  ${provider.name.padEnd(11)} ${provider.configured ? 'configured    ' : 'NOT configured'} default model: ${provider.defaultModel}`);
  }
  console.info('Routes:', JSON.stringify({ default: before.defaultRoute, ...before.routes }));

  if (!ticketAi.isConfigured) {
    console.error('\nNo provider has an API key. Add one to backend/.env and run this again.');
    process.exit(1);
  }

  console.info('\n1) Classification');
  const classification = await ticketAi.classify({
    subject: 'No royalty received',
    description: "I published my book 6 months ago and I haven't received any royalty. What is going on?",
  });
  console.info(`   source=${classification.source} model=${classification.model ?? '-'} category="${classification.category}" priority=${classification.priority}`);
  if (classification.failureReason) console.info(`   (fell back to keyword rules: ${classification.failureReason})`);

  console.info('\n2) Draft reply');
  const draft = await ticketAi.draft({
    authorName: 'Priya Sharma',
    subject: 'No royalty received',
    description: "I published my book 6 months ago and I haven't received any royalty. What is going on?",
    category: 'Royalty & Payments',
    focusBook: null,
    otherBooks: [],
    today: new Date(),
  });
  console.info(`   source=${draft.source} model=${draft.model ?? '-'} tokens=${draft.usage ? `${draft.usage.promptTokens} in / ${draft.usage.outputTokens} out` : '-'}`);
  if (draft.failureReason) console.info(`   (fell back to template: ${draft.failureReason})`);
  console.info(`\n${draft.text}\n`);

  console.info('Per-model usage:', JSON.stringify(aiClient.status().metrics, null, 2));
  const allViaLlm = classification.source === 'llm' && draft.source === 'llm';
  process.exit(allViaLlm ? 0 : 2);
}

run().catch((error) => {
  console.error('ai-check failed:', error);
  process.exit(1);
});
