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

  const centerIds = new Set(centers.map((center) => center.id).filter(Boolean));
  const mallamIds = new Set(mallams.map((mallam) => mallam.id).filter(Boolean));
  const stateIds = new Set(states.map((state) => state.id).filter(Boolean));
  const localGovernmentIds = new Set(localGovernments.map((localGovernment) => localGovernment.id).filter(Boolean));

  const hasUnresolvedCenterReference = pods.some((pod) => pod.centerId && !centerIds.has(pod.centerId));
  const hasUnresolvedMallamReference = pods.some((pod) => (pod.mallamIds || []).some((mallamId) => mallamId && !mallamIds.has(mallamId)));
  const hasUnresolvedStateReference = pods.some((pod) => pod.stateId && !stateIds.has(pod.stateId));
  const hasUnresolvedLocalGovernmentReference = pods.some((pod) => pod.localGovernmentId && !localGovernmentIds.has(pod.localGovernmentId));

  if (hasOperationalRecords && (centers.length === 0 || hasUnresolvedCenterReference)) {
    missingReferences.push('centers');
  }

  if (hasOperationalRecords && (mallams.length === 0 || hasUnresolvedMallamReference)) {
    missingReferences.push('mallams');
  }

  if (hasOperationalRecords && (states.length === 0 || hasUnresolvedStateReference)) {
    missingReferences.push('states');
  }

  if (hasOperationalRecords && (localGovernments.length === 0 || hasUnresolvedLocalGovernmentReference)) {
    missingReferences.push('local governments');
  }

  return {
    blocked: missingReferences.length > 0,
    missingReferences,
  };
}
