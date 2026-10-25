export interface RouteTarget {
  provider: string;
  /** Falls back to the provider's default model when omitted. */
  model?: string;
}

/**
 * Parses a route such as `"gemini:gemini-2.0-flash, openai:gpt-4o-mini, anthropic"` into an ordered
 * fallback chain. The first entry is tried first. Fails loudly on a typo so a bad config is caught
 * at start-up instead of silently routing nowhere.
 */
export const parseRouteSpec = (spec: string, knownProviders: readonly string[]): RouteTarget[] => {
  const targets = spec
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): RouteTarget => {
      const separator = part.indexOf(':'); // split on the first colon only: model ids may contain more
      const provider = (separator === -1 ? part : part.slice(0, separator)).trim().toLowerCase();
      const model = separator === -1 ? undefined : part.slice(separator + 1).trim() || undefined;

      if (!knownProviders.includes(provider)) {
        throw new Error(`Unknown AI provider "${provider}" in route "${spec}". Known: ${knownProviders.join(', ')}`);
      }
      return { provider, model };
    });

  if (targets.length === 0) throw new Error(`AI route "${spec}" has no providers.`);
  return targets;
};
