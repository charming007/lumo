import type { Center, Cohort, LocalGovernment, Mallam, Pod, State, Student } from './types';

export type GeographyOption = {
  value: string;
  label: string;
};

export function findCenterForPod(pod: Pod, centers: Center[]) {
  return centers.find((center) => center.id === pod.centerId) ?? null;
}

export function findStateForCenter(center: Center | null | undefined, states: State[]) {
  if (!center?.stateId) return null;
  return states.find((state) => state.id === center.stateId) ?? null;
}

export function findLocalGovernmentForCenter(center: Center | null | undefined, localGovernments: LocalGovernment[]) {
  if (!center?.localGovernmentId) return null;
  return localGovernments.find((item) => item.id === center.localGovernmentId) ?? null;
}

export function podGeographyLabel(pod: Pod, centers: Center[], states: State[], localGovernments: LocalGovernment[]) {
  const center = findCenterForPod(pod, centers);
  const state = findStateForCenter(center, states);
  const localGovernment = findLocalGovernmentForCenter(center, localGovernments);
  return [state?.name, localGovernment?.name].filter(Boolean).join(' / ') || center?.region || 'Geography pending';
}

export function cohortGeographyLabel(cohort: Cohort, pods: Pod[], centers: Center[], states: State[], localGovernments: LocalGovernment[]) {
  const pod = pods.find((item) => item.id === cohort.podId);
  if (!pod) return 'Geography pending';
  return podGeographyLabel(pod, centers, states, localGovernments);
}

export function mallamGeographyLabel(mallam: Mallam, centers: Center[], states: State[], localGovernments: LocalGovernment[]) {
  const center = centers.find((item) => item.id === mallam.centerId) ?? null;
  const state = findStateForCenter(center, states);
  const localGovernment = findLocalGovernmentForCenter(center, localGovernments);
  return [state?.name, localGovernment?.name].filter(Boolean).join(' / ') || mallam.region || 'Geography pending';
}

export function studentGeographyLabel(student: Student, pods: Pod[], centers: Center[], states: State[], localGovernments: LocalGovernment[]) {
  const pod = pods.find((item) => item.id === student.podId);
  if (!pod) return 'Geography pending';
  return podGeographyLabel(pod, centers, states, localGovernments);
}

export function buildStateOptions(states: State[]) {
  return states.map((state) => ({ value: state.id, label: state.name }));
}

export function buildLocalGovernmentOptions(localGovernments: LocalGovernment[], stateId?: string | null) {
  return localGovernments
    .filter((item) => !stateId || item.stateId === stateId)
    .map((item) => ({ value: item.id, label: item.name }));
}

export function filterStudentsByGeography(
  students: Student[],
  pods: Pod[],
  centers: Center[],
  filters: { stateId?: string; localGovernmentId?: string; podId?: string; cohortId?: string; mallamId?: string },
) {
  return students.filter((student) => {
    const pod = pods.find((item) => item.id === student.podId);
    const center = pod ? centers.find((item) => item.id === pod.centerId) : null;
    if (filters.stateId && center?.stateId !== filters.stateId) return false;
    if (filters.localGovernmentId && center?.localGovernmentId !== filters.localGovernmentId) return false;
    if (filters.podId && student.podId !== filters.podId) return false;
    if (filters.cohortId && student.cohortId !== filters.cohortId) return false;
    if (filters.mallamId && student.mallamId !== filters.mallamId) return false;
    return true;
  });
}

export function filterMallamsByGeography(
  mallams: Mallam[],
  centers: Center[],
  filters: { stateId?: string; localGovernmentId?: string; podId?: string },
) {
  return mallams.filter((mallam) => {
    const center = centers.find((item) => item.id === mallam.centerId);
    const mallamStateId = center?.stateId || '';
    const mallamLocalGovernmentId = center?.localGovernmentId || '';
    if (filters.stateId && mallamStateId !== filters.stateId) return false;
    if (filters.localGovernmentId && mallamLocalGovernmentId !== filters.localGovernmentId) return false;
    if (filters.podId && !(mallam.podIds || []).includes(filters.podId)) return false;
    return true;
  });
}
