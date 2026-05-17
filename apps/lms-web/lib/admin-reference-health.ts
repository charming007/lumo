import type { Center, LocalGovernment, Mallam, Pod, State } from './types';

type PodAdminReferenceHealthInput = {
  pods: Pod[];
  centers: Center[];
  mallams: Mallam[];
  states: State[];
  localGovernments: LocalGovernment[];
};

type PodAdminReferenceHealth = {
  blocked: boolean;
  missingReferences: string[];
};

export function getPodAdminReferenceHealth({
  pods,
  centers,
  mallams,
  states,
  localGovernments,
}: PodAdminReferenceHealthInput): PodAdminReferenceHealth {
  const hasOperationalRecords = pods.length > 0 || centers.length > 0 || mallams.length > 0;
  const missingReferences: string[] = [];

  if (hasOperationalRecords && states.length === 0) {
    missingReferences.push('states');
  }

  if (hasOperationalRecords && localGovernments.length === 0) {
    missingReferences.push('local governments');
  }

  return {
    blocked: missingReferences.length > 0,
    missingReferences,
  };
}
