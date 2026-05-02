import type { ApiRequestError } from './api';

type FailedFeed = {
  label: string;
  error: unknown;
};

export type BackendTargetDiagnosis = {
  kind: 'likely-stale-or-wrong-backend';
  failingFeeds: string[];
  requestUrls: string[];
};

type RouteMismatchLikeError = Pick<ApiRequestError, 'status' | 'diagnostic'>;

function isRouteMismatchLikeError(error: unknown): error is RouteMismatchLikeError {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    status?: unknown;
    diagnostic?: {
      routeMismatchLikely?: unknown;
      requestUrl?: unknown;
    };
  };

  return candidate.status === 404 && candidate.diagnostic?.routeMismatchLikely === true;
}

function hasRouteMismatchLikeError(entry: FailedFeed): entry is FailedFeed & { error: RouteMismatchLikeError } {
  return isRouteMismatchLikeError(entry.error);
}

export function diagnoseBackendTargetMismatch(failedFeeds: FailedFeed[]): BackendTargetDiagnosis | null {
  const routeMismatchFailures = failedFeeds.filter(hasRouteMismatchLikeError);

  if (routeMismatchFailures.length < 2) {
    return null;
  }

  return {
    kind: 'likely-stale-or-wrong-backend',
    failingFeeds: routeMismatchFailures.map((entry) => entry.label),
    requestUrls: routeMismatchFailures
      .map((entry) => entry.error.diagnostic.requestUrl)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  };
}
