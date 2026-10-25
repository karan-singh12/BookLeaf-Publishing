/**
 * Every user-facing API message lives here: one place to review wording, keep the tone
 * consistent, and (later) translate. Messages that depend on context are functions,
 * e.g. `MESSAGES.common.notFound('Ticket')` -> "Ticket not found."
 */
export const MESSAGES = {
  common: {
    // Generic builders reused by every resource.
    fetched: (resource: string) => `${resource} retrieved successfully.`,
    created: (resource: string) => `${resource} created successfully.`,
    updated: (resource: string) => `${resource} updated successfully.`,
    notFound: (resource = 'Resource') => `${resource} not found.`,
    duplicate: (field: string) => `A record with this ${field} already exists.`,
    routeNotFound: (method: string, url: string) => `Route not found: ${method} ${url}`,

    validationFailed: 'Request validation failed.',
    invalidValue: (field: string) => `Invalid value for ${field}.`,
    badJson: 'Request body is not valid JSON.',
    payloadTooLarge: 'Request body is too large.',
    rateLimited: 'Too many requests. Please slow down and try again shortly.',
    versionConflict: 'This record was changed by someone else. Refresh and try again.',
    forbidden: 'You do not have permission to perform this action.',
    internal: 'Something went wrong on our side. Please try again.',
    databaseUnavailable: 'The database is not reachable right now.',
  },

  auth: {
    loginSuccess: 'Signed in successfully.',
    invalidCredentials: 'Invalid email or password.',
    tokenMissing: 'Authentication is required. Please sign in.',
    tokenInvalid: 'Invalid token. Please sign in again.',
    tokenExpired: 'Your session has expired. Please sign in again.',
    accountDisabled: 'This account has been disabled. Please contact BookLeaf support.',
    accountUnavailable: 'Your account is no longer available.',
    tooManyAttempts: 'Too many sign-in attempts. Please try again in a few minutes.',
  },

  ticket: {
    closed: 'This ticket is closed. Reopen it (admins) or submit a new ticket (authors).',
    messageSent: 'Message sent.',
    noteAdded: 'Internal note added.',
    draftReady: 'AI draft ready.',
    draftCached: 'Showing the saved AI draft.',
    draftFallback: 'AI is unavailable, so a standard template was loaded.',
    aiRateLimited: 'AI draft requests are limited to 20 per minute. Please wait a moment.',
  },
} as const;
