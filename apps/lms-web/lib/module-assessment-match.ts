import type { Assessment, CurriculumModule } from './types';

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function namesLookRelated(left?: string | null, right?: string | null) {
  const leftValue = normalize(left);
  const rightValue = normalize(right);
  if (!leftValue || !rightValue) return false;
  return leftValue === rightValue;
}

export function assessmentMatchesModule(module: CurriculumModule, assessment: Assessment) {
  if (assessment.moduleId && assessment.moduleId === module.id) return true;
  if (!namesLookRelated(assessment.moduleTitle, module.title)) return false;

  const moduleSubjectId = normalize(module.subjectId);
  const assessmentSubjectId = normalize(assessment.subjectId);
  if (moduleSubjectId && assessmentSubjectId) {
    return moduleSubjectId === assessmentSubjectId;
  }

  const moduleSubjectName = normalize(module.subjectName);
  const assessmentSubjectName = normalize(assessment.subjectName);
  if (moduleSubjectName && assessmentSubjectName) {
    return moduleSubjectName === assessmentSubjectName;
  }

  return true;
}
