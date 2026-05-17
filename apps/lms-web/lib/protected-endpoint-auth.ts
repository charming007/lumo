type ApiLikeAuthError = {
  status?: unknown;
  diagnostic?: {
    backendMessage?: unknown;
    bodySnippet?: unknown;
  };
};

export function isProtectedEndpointAuthFailureValue(error: unknown) {
  const candidate = error as ApiLikeAuthError | null;

  if (candidate && typeof candidate === 'object') {
    const status = candidate.status;
    if (status === 401 || status === 403) {
      const backendMessage = typeof candidate.diagnostic?.backendMessage === 'string'
        ? candidate.diagnostic.backendMessage
        : '';
      const bodySnippet = typeof candidate.diagnostic?.bodySnippet === 'string'
        ? candidate.diagnostic.bodySnippet
        : '';
      const evidence = `${backendMessage} ${bodySnippet}`.toLowerCase();
      return evidence.includes('missing or invalid api key') || evidence.includes('protected endpoint');
    }
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('lumo_admin_api_key')
    || message.includes('protected api endpoints')
    || message.includes('missing or invalid api key')
    || message.includes('protected endpoint');
}
