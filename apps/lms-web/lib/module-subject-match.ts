import type { CurriculumModule, Subject } from './types';

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

export function matchesSubjectFilter(
  subjectFilter: string | null | undefined,
  subjects: Pick<Subject, 'id' | 'name'>[],
  options: {
    subjectIds?: Array<string | null | undefined>;
    subjectNames?: Array<string | null | undefined>;
  },
) {
  const normalizedSubjectFilter = normalize(subjectFilter);
  if (!normalizedSubjectFilter) {
    return true;
  }

  const selectedSubject = subjects.find((subject) => normalize(subject.id) === normalizedSubjectFilter)
    ?? subjects.find((subject) => normalize(subject.name) === normalizedSubjectFilter)
    ?? null;
  const normalizedSelectedSubjectName = normalize(selectedSubject?.name);

  return Boolean(
    options.subjectIds?.some((subjectId) => normalize(subjectId) === normalizedSubjectFilter)
    || (normalizedSelectedSubjectName
      && options.subjectNames?.some((subjectName) => normalize(subjectName) === normalizedSelectedSubjectName)),
  );
}

export function moduleBelongsToSubject(module: CurriculumModule, subject: Subject | null | undefined) {
  if (!subject) return false;

  const subjectId = normalize(subject.id);
  const subjectName = normalize(subject.name);
  const moduleSubjectId = normalize(module.subjectId);
  const moduleSubjectName = normalize(module.subjectName);

  return Boolean(
    (subjectId && moduleSubjectId === subjectId)
    || (subjectName && moduleSubjectName === subjectName),
  );
}

export function filterModulesForSubject(modules: CurriculumModule[], subject: Subject | null | undefined) {
  return modules.filter((module) => moduleBelongsToSubject(module, subject));
}

export function resolveModuleSubjectId(
  module: Pick<CurriculumModule, 'subjectId' | 'subjectName'>,
  subjects: Pick<Subject, 'id' | 'name'>[],
) {
  const directSubjectId = module.subjectId?.trim();

  if (directSubjectId) {
    const directMatch = subjects.find((subject) => normalize(subject.id) === normalize(directSubjectId));
    if (directMatch) {
      return directMatch.id;
    }
  }

  const normalizedSubjectName = normalize(module.subjectName);
  if (!normalizedSubjectName) {
    return directSubjectId ?? '';
  }

  const subjectNameMatch = subjects.find((subject) => normalize(subject.name) === normalizedSubjectName);
  return subjectNameMatch?.id ?? directSubjectId ?? '';
}

export function subjectsIncludeId(
  subjects: Pick<Subject, 'id'>[],
  subjectId: string | null | undefined,
) {
  const normalizedSubjectId = normalize(subjectId);
  if (!normalizedSubjectId) {
    return false;
  }

  return subjects.some((subject) => normalize(subject.id) === normalizedSubjectId);
}
