import type { CurriculumModule, Lesson } from './types';

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function namesMatch(left?: string | null, right?: string | null) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

function idsMatch(left?: string | null, right?: string | null) {
  return Boolean(left && right && left === right);
}

function subjectsMatch(lesson: Lesson, module: CurriculumModule) {
  if (idsMatch(lesson.subjectId, module.subjectId)) return true;
  if (namesMatch(lesson.subjectName, module.subjectName)) return true;
  return false;
}

export function lessonMatchesModule(lesson: Lesson, module: CurriculumModule) {
  if (idsMatch(lesson.moduleId, module.id)) {
    return true;
  }

  if (!namesMatch(lesson.moduleTitle, module.title)) {
    return false;
  }

  const lessonHasSubjectContext = Boolean(normalize(lesson.subjectId) || normalize(lesson.subjectName));
  const moduleHasSubjectContext = Boolean(normalize(module.subjectId) || normalize(module.subjectName));

  if (lessonHasSubjectContext && moduleHasSubjectContext) {
    return subjectsMatch(lesson, module);
  }

  return true;
}

export function filterLessonsForModule(lessons: Lesson[], module: CurriculumModule) {
  return lessons.filter((lesson) => lessonMatchesModule(lesson, module));
}

export function findModuleForLesson(modules: CurriculumModule[], lesson: Lesson) {
  return modules.find((module) => lessonMatchesModule(lesson, module)) ?? null;
}
