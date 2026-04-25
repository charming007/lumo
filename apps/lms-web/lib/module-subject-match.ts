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
