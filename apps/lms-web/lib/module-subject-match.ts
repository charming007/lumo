import type { CurriculumModule, Subject } from './types';

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
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
