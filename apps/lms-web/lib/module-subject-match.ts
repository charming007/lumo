import type { CurriculumModule, LessonAsset, Subject } from './types';

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

export function findSubjectByContext(
  subjects: Pick<Subject, 'id' | 'name'>[],
  options: {
    subjectId?: string | null;
    subjectName?: string | null;
  },
) {
  const normalizedSubjectId = normalize(options.subjectId);
  if (normalizedSubjectId) {
    const directMatch = subjects.find((subject) => normalize(subject.id) === normalizedSubjectId);
    if (directMatch) {
      return directMatch;
    }
  }

  const normalizedSubjectName = normalize(options.subjectName);
  if (!normalizedSubjectName) {
    return null;
  }

  return subjects.find((subject) => normalize(subject.name) === normalizedSubjectName) ?? null;
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

export function assetMatchesModuleContext(
  asset: Pick<LessonAsset, 'moduleId' | 'moduleTitle' | 'subjectId' | 'subjectName'>,
  module: {
    id?: string | null;
    title?: string | null;
    subjectId?: string | null;
    subjectName?: string | null;
  } | null | undefined,
) {
  if (!module) {
    return false;
  }

  const normalizedAssetModuleId = normalize(asset.moduleId);
  const normalizedModuleId = normalize(module.id);
  if (normalizedAssetModuleId && normalizedModuleId && normalizedAssetModuleId === normalizedModuleId) {
    return true;
  }

  const normalizedAssetModuleTitle = normalize(asset.moduleTitle);
  const normalizedModuleTitle = normalize(module.title);
  if (!normalizedAssetModuleTitle || !normalizedModuleTitle || normalizedAssetModuleTitle !== normalizedModuleTitle) {
    return false;
  }

  const normalizedAssetSubjectId = normalize(asset.subjectId);
  const normalizedModuleSubjectId = normalize(module.subjectId);
  if (normalizedAssetSubjectId && normalizedModuleSubjectId && normalizedAssetSubjectId === normalizedModuleSubjectId) {
    return true;
  }

  const normalizedAssetSubjectName = normalize(asset.subjectName);
  const normalizedModuleSubjectName = normalize(module.subjectName);
  if (normalizedAssetSubjectName && normalizedModuleSubjectName) {
    return normalizedAssetSubjectName === normalizedModuleSubjectName;
  }

  return !(normalizedAssetSubjectId && normalizedModuleSubjectId);
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

export function subjectMatchesContext(
  subject: Pick<Subject, 'id' | 'name'> | null | undefined,
  options: {
    subjectIds?: Array<string | null | undefined>;
    subjectNames?: Array<string | null | undefined>;
  },
) {
  if (!subject) {
    return false;
  }

  const normalizedSubjectId = normalize(subject.id);
  const normalizedSubjectName = normalize(subject.name);

  return Boolean(
    (normalizedSubjectId && options.subjectIds?.some((subjectId) => normalize(subjectId) === normalizedSubjectId))
    || (normalizedSubjectName && options.subjectNames?.some((subjectName) => normalize(subjectName) === normalizedSubjectName)),
  );
}
