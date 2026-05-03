import type { CurriculumModule, Subject } from './types';
import { filterModulesForSubject, findSubjectByContext } from './module-subject-match.ts';

type LaunchContext = {
  requestedSubjectId?: string | null;
  requestedModuleId?: string | null;
};

export type ResolvedLessonStudioLaunchContext = {
  requestedModule: CurriculumModule | null;
  selectedSubject: Subject | null;
  selectedModule: CurriculumModule | null;
  resolvedSubjectId: string;
  resolvedModuleId: string;
  requestedModuleRecoveredSubject: Subject | null;
  requestedModuleHasRecoverableSubject: boolean;
  subjectScopedModules: CurriculumModule[];
  subjectRecoveredFromModule: boolean;
};

export function resolveLessonStudioLaunchContext(
  subjects: Subject[],
  modules: CurriculumModule[],
  options: LaunchContext,
): ResolvedLessonStudioLaunchContext {
  const requestedSubjectId = options.requestedSubjectId?.trim() ?? '';
  const requestedModuleId = options.requestedModuleId?.trim() ?? '';

  const requestedModule = requestedModuleId
    ? modules.find((module) => module.id === requestedModuleId) ?? null
    : null;

  const requestedSubject = requestedSubjectId
    ? findSubjectByContext(subjects, {
      subjectId: requestedSubjectId,
      subjectName: requestedModule?.subjectName ?? null,
    })
    : null;

  const requestedModuleRecoveredSubject = requestedModule
    ? findSubjectByContext(subjects, {
      subjectId: requestedModule.subjectId?.trim() ?? '',
      subjectName: requestedModule.subjectName ?? null,
    })
    : null;

  const requestedModuleHasRecoverableSubject = Boolean(requestedModuleRecoveredSubject);
  const subjectRecoveredFromModule = Boolean(requestedModule && requestedModuleRecoveredSubject && requestedSubject?.id !== requestedModuleRecoveredSubject.id);

  const selectedSubject = requestedModuleRecoveredSubject
    ?? requestedSubject
    ?? subjects[0]
    ?? null;

  const subjectScopedModules = filterModulesForSubject(modules, selectedSubject);
  const selectedModule = requestedModule && subjectScopedModules.some((module) => module.id === requestedModule.id)
    ? requestedModule
    : subjectScopedModules[0] ?? modules[0] ?? null;

  return {
    requestedModule,
    selectedSubject,
    selectedModule,
    resolvedSubjectId: selectedSubject?.id ?? '',
    resolvedModuleId: selectedModule?.id ?? '',
    requestedModuleRecoveredSubject,
    requestedModuleHasRecoverableSubject,
    subjectScopedModules,
    subjectRecoveredFromModule,
  };
}
