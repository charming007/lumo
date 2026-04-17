import { assessmentMatchesModule } from './module-assessment-match';
import type { Assessment, CurriculumModule, Lesson, Strand, Subject } from './types';

export type CurriculumCanvasLesson = {
  id: string;
  title: string;
  order?: number | null;
  status: string;
  durationMinutes: number;
  mode: string;
  assessmentTitle?: string | null;
  assessmentId?: string | null;
  activityCount?: number;
  objectiveCount?: number;
};

export type CurriculumCanvasModule = {
  id: string;
  title: string;
  status: string;
  level: string;
  lessonCount: number;
  readyLessons: number;
  gapCount: number;
  lessons: CurriculumCanvasLesson[];
  assessments: Assessment[];
  coverageLabel: string;
  assessmentCoverageLabel: string;
  blockerSummary: string;
  provenance: 'live' | 'rescue' | 'blended';
};

export type CurriculumCanvasStrand = {
  id: string;
  name: string;
  modules: CurriculumCanvasModule[];
};

export type CurriculumCanvasSubject = {
  id: string;
  name: string;
  icon?: string;
  strands: CurriculumCanvasStrand[];
  totals: {
    modules: number;
    lessons: number;
    assessments: number;
    readyLessons: number;
    gaps: number;
  };
};

export type CurriculumCanvasData = {
  subjects: CurriculumCanvasSubject[];
  summary: {
    subjects: number;
    strands: number;
    modules: number;
    lessons: number;
    assessments: number;
    readyLessons: number;
    blockedModules: number;
  };
};

export type CurriculumCanvasApiNode = {
  id: string;
  nodeType: 'root' | 'subject' | 'strand' | 'module' | 'lesson' | 'assessment';
  title?: string | null;
  name?: string | null;
  icon?: string | null;
  level?: string | null;
  status?: string | null;
  order?: number | null;
  lessonCount?: number | null;
  durationMinutes?: number | null;
  mode?: string | null;
  subjectId?: string | null;
  subjectName?: string | null;
  strandId?: string | null;
  strandName?: string | null;
  moduleId?: string | null;
  moduleTitle?: string | null;
  kind?: string | null;
  trigger?: string | null;
  triggerLabel?: string | null;
  progressionGate?: string | null;
  passingScore?: number | null;
  learningObjectives?: string[] | null;
  activityCount?: number | null;
  children?: CurriculumCanvasApiNode[];
};

export type CurriculumCanvasApiTree = {
  root: CurriculumCanvasApiNode;
  meta?: {
    subjectCount?: number;
    strandCount?: number;
    moduleCount?: number;
    lessonCount?: number;
    assessmentCount?: number;
    generatedAt?: string;
  };
};

type IndexedTreeModule = {
  subjectId?: string | null;
  subjectName?: string | null;
  strandId?: string | null;
  strandName?: string | null;
  module: CurriculumCanvasApiNode;
};

function sortByOrder<T extends { order?: number | null; name?: string | null; title?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const orderDelta = (left.order ?? 999) - (right.order ?? 999);
    if (orderDelta !== 0) return orderDelta;
    return safeText(left.name ?? left.title).localeCompare(safeText(right.name ?? right.title));
  });
}

function safeText(value?: string | null, fallback = '') {
  return value?.trim() || fallback;
}

function normalize(value?: string | null) {
  return safeText(value).toLowerCase();
}

function matchesLooseIdOrName(leftId?: string | null, rightId?: string | null, leftName?: string | null, rightName?: string | null) {
  if (leftId && rightId) return leftId === rightId;
  const normalizedLeft = normalize(leftName);
  const normalizedRight = normalize(rightName);
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight;
}

function lessonSubjectMatches(lesson: Lesson, subject: Subject, module?: CurriculumModule) {
  return matchesLooseIdOrName(lesson.subjectId, subject.id, lesson.subjectName, subject.name)
    || matchesLooseIdOrName(module?.subjectId, subject.id, module?.subjectName, subject.name);
}

function lessonMatchesModule(lesson: Lesson, module: CurriculumModule) {
  return matchesLooseIdOrName(lesson.moduleId, module.id, lesson.moduleTitle, module.title);
}

function assessmentMatchesLesson(
  assessment: Assessment,
  lesson: Pick<CurriculumCanvasLesson, 'id' | 'title' | 'assessmentId' | 'assessmentTitle'>,
  module?: CurriculumModule,
) {
  if (lesson.assessmentId && assessment.id === lesson.assessmentId) {
    return true;
  }

  const normalizedLessonGateTitle = normalize(lesson.assessmentTitle);
  if (normalizedLessonGateTitle && normalize(assessment.title) === normalizedLessonGateTitle) {
    return true;
  }

  const normalizedLessonTitle = normalize(lesson.title);
  const normalizedAssessmentTitle = normalize(assessment.title);
  const normalizedModuleTitle = normalize(module?.title);

  if (normalizedLessonTitle && normalizedAssessmentTitle) {
    if (normalizedAssessmentTitle === normalizedLessonTitle) return true;
    if (normalizedAssessmentTitle.includes(normalizedLessonTitle)) return true;
    if (normalizedLessonTitle.includes(normalizedAssessmentTitle)) return true;
  }

  return Boolean(normalizedModuleTitle)
    && normalize(assessment.moduleTitle) === normalizedModuleTitle
    && normalizedAssessmentTitle === normalizedLessonGateTitle;
}

function normalizeAssessmentFromNode(node: CurriculumCanvasApiNode): Assessment {
  return {
    id: node.id,
    subjectId: node.subjectId ?? null,
    moduleId: node.moduleId ?? null,
    title: safeText(node.title ?? node.name, 'Untitled assessment'),
    kind: node.kind ?? 'automatic',
    trigger: node.trigger ?? 'module-complete',
    triggerLabel: node.triggerLabel ?? 'After module completion',
    progressionGate: node.progressionGate ?? 'unconfigured',
    passingScore: typeof node.passingScore === 'number' ? node.passingScore : 0,
    subjectName: node.subjectName ?? '',
    moduleTitle: node.moduleTitle ?? '',
    status: node.status ?? 'draft',
  };
}

function buildLessonNode(lesson: Lesson | CurriculumCanvasApiNode, moduleAssessments: Assessment[], module?: CurriculumModule): CurriculumCanvasLesson {
  const rawTitle = 'name' in lesson ? (lesson.title ?? lesson.name) : lesson.title;
  const title = safeText(rawTitle, 'Untitled lesson');
  const explicitAssessmentTitleValue = 'lessonAssessment' in lesson
    ? lesson.lessonAssessment?.title
    : ('assessmentTitle' in lesson ? lesson.assessmentTitle : null);
  const explicitAssessmentTitle = safeText(
    typeof explicitAssessmentTitleValue === 'string' ? explicitAssessmentTitleValue : null,
    '',
  ) || null;
  const explicitAssessmentIdValue = 'assessmentId' in lesson
    ? lesson.assessmentId
    : ('lessonAssessment' in lesson && lesson.lessonAssessment && typeof lesson.lessonAssessment === 'object' && typeof lesson.lessonAssessment.assessmentId === 'string'
      ? lesson.lessonAssessment.assessmentId
      : null);
  const explicitAssessmentId = typeof explicitAssessmentIdValue === 'string' ? explicitAssessmentIdValue : null;
  const rawObjectives = 'learningObjectives' in lesson ? lesson.learningObjectives : undefined;
  const rawActivityCount = 'activityCount' in lesson ? lesson.activityCount : undefined;
  const rawActivitySteps = 'activitySteps' in lesson ? lesson.activitySteps : undefined;
  const rawActivities = 'activities' in lesson ? lesson.activities : undefined;
  const objectiveCount = Array.isArray(rawObjectives)
    ? rawObjectives.length
    : undefined;
  const activityCount = typeof rawActivityCount === 'number'
    ? rawActivityCount
    : Array.isArray(rawActivitySteps)
      ? rawActivitySteps.length
      : Array.isArray(rawActivities)
        ? rawActivities.length
        : undefined;

  const linkedAssessment = moduleAssessments.find((assessment) => assessmentMatchesLesson(
    assessment,
    {
      id: lesson.id,
      title,
      assessmentId: explicitAssessmentId,
      assessmentTitle: explicitAssessmentTitle,
    },
    module,
  )) ?? null;

  return {
    id: lesson.id,
    title,
    order: ('order' in lesson ? lesson.order : undefined) ?? undefined,
    status: lesson.status ?? 'draft',
    durationMinutes: ('durationMinutes' in lesson ? lesson.durationMinutes : 0) ?? 0,
    mode: ('mode' in lesson ? lesson.mode : 'guided') ?? 'guided',
    assessmentTitle: explicitAssessmentTitle ?? linkedAssessment?.title ?? null,
    assessmentId: explicitAssessmentId ?? linkedAssessment?.id ?? null,
    activityCount,
    objectiveCount,
  };
}

function summarizeModule(expectedLessonCount: number, lessonNodes: CurriculumCanvasLesson[], moduleAssessments: Assessment[]) {
  const readyLessons = lessonNodes.filter((lesson) => ['approved', 'published', 'active'].includes(normalize(lesson.status))).length;
  const missingLessons = Math.max(expectedLessonCount - lessonNodes.length, 0);
  const lessonsMissingGate = lessonNodes.filter((lesson) => !lesson.assessmentId).length;
  const missingAssessments = moduleAssessments.length ? 0 : 1;
  const gapCount = missingLessons + Math.max(expectedLessonCount - readyLessons, 0) + missingAssessments;

  const blockerParts = [
    missingLessons ? `${missingLessons} lesson slot${missingLessons === 1 ? '' : 's'} still empty` : null,
    readyLessons < expectedLessonCount ? `${expectedLessonCount - readyLessons} lesson${expectedLessonCount - readyLessons === 1 ? '' : 's'} not release-ready` : null,
    missingAssessments ? 'assessment gate missing' : null,
    !missingAssessments && lessonsMissingGate ? `${lessonsMissingGate} lesson${lessonsMissingGate === 1 ? '' : 's'} not linked to a gate` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    readyLessons,
    gapCount,
    coverageLabel: `${lessonNodes.length}/${expectedLessonCount} lesson nodes mapped`,
    assessmentCoverageLabel: moduleAssessments.length ? `${moduleAssessments.length} gate${moduleAssessments.length === 1 ? '' : 's'} attached` : 'No assessment gate attached',
    blockerSummary: blockerParts.length ? blockerParts.join(' · ') : 'Release-ready with visible lessons and an assessment gate',
  };
}

function withSubjectTotals(subject: Omit<CurriculumCanvasSubject, 'totals'>): CurriculumCanvasSubject {
  const totals = subject.strands.reduce((accumulator, strand) => {
    strand.modules.forEach((module) => {
      accumulator.modules += 1;
      accumulator.lessons += module.lessons.length;
      accumulator.assessments += module.assessments.length;
      accumulator.readyLessons += module.readyLessons;
      accumulator.gaps += module.gapCount;
    });
    return accumulator;
  }, {
    modules: 0,
    lessons: 0,
    assessments: 0,
    readyLessons: 0,
    gaps: 0,
  });

  return { ...subject, totals };
}

function finalizeCanvasSubjects(subjects: CurriculumCanvasSubject[]): CurriculumCanvasData {
  return {
    subjects,
    summary: {
      subjects: subjects.length,
      strands: subjects.reduce((sum, subject) => sum + subject.strands.length, 0),
      modules: subjects.reduce((sum, subject) => sum + subject.totals.modules, 0),
      lessons: subjects.reduce((sum, subject) => sum + subject.totals.lessons, 0),
      assessments: subjects.reduce((sum, subject) => sum + subject.totals.assessments, 0),
      readyLessons: subjects.reduce((sum, subject) => sum + subject.totals.readyLessons, 0),
      blockedModules: subjects.reduce((sum, subject) => sum + subject.strands.reduce((strandSum, strand) => strandSum + strand.modules.filter((module) => module.gapCount > 0).length, 0), 0),
    },
  };
}

function indexTreeModules(tree: CurriculumCanvasApiTree | null | undefined) {
  const modulesById = new Map<string, IndexedTreeModule>();
  const modules = tree?.root?.children?.flatMap((subjectNode) => {
    if (subjectNode.nodeType !== 'subject') return [] as IndexedTreeModule[];
    return (subjectNode.children ?? []).flatMap((strandNode) => {
      if (strandNode.nodeType !== 'strand') return [] as IndexedTreeModule[];
      return (strandNode.children ?? [])
        .filter((moduleNode) => moduleNode.nodeType === 'module')
        .map((moduleNode) => ({
          subjectId: subjectNode.id,
          subjectName: subjectNode.name ?? subjectNode.title,
          strandId: strandNode.id,
          strandName: strandNode.name ?? strandNode.title,
          module: moduleNode,
        }));
    });
  }) ?? [];

  modules.forEach((entry) => {
    modulesById.set(entry.module.id, entry);
  });

  return {
    modules,
    modulesById,
    find(module: CurriculumModule, strand?: Strand) {
      const direct = modulesById.get(module.id);
      if (direct) return direct;
      return modules.find((entry) => {
        if (normalize(entry.module.title ?? entry.module.name) !== normalize(module.title)) return false;
        const subjectMatch = matchesLooseIdOrName(entry.subjectId, module.subjectId, entry.subjectName, module.subjectName);
        const strandMatch = strand ? matchesLooseIdOrName(entry.strandId, module.strandId ?? strand.id, entry.strandName, module.strandName || strand.name) : true;
        return subjectMatch && strandMatch;
      }) ?? null;
    },
  };
}

function buildModuleNode({
  module,
  subject,
  lessons,
  assessments,
  rescueModule,
}: {
  module: CurriculumModule;
  subject: Subject;
  lessons: Lesson[];
  assessments: Assessment[];
  rescueModule?: IndexedTreeModule | null;
}): CurriculumCanvasModule {
  const rescueChildren = rescueModule?.module.children ?? [];
  const rescueLessons = rescueChildren.filter((node) => node.nodeType === 'lesson');
  const rescueAssessments = rescueChildren.filter((node) => node.nodeType === 'assessment').map(normalizeAssessmentFromNode);

  const liveAssessments = assessments
    .filter((assessment) => assessmentMatchesModule(module, assessment))
    .sort((left, right) => safeText(left.title, 'Untitled assessment').localeCompare(safeText(right.title, 'Untitled assessment')));

  const moduleAssessments = liveAssessments.length ? liveAssessments : rescueAssessments;

  const liveLessons = lessons
    .filter((lesson) => lessonMatchesModule(lesson, module) && lessonSubjectMatches(lesson, subject, module))
    .sort((left, right) => safeText(left.title, 'Untitled lesson').localeCompare(safeText(right.title, 'Untitled lesson')));

  const lessonNodes = sortByOrder(
    liveLessons.length
      ? liveLessons.map((lesson) => buildLessonNode(lesson, moduleAssessments, module))
      : rescueLessons.map((lessonNode) => buildLessonNode(lessonNode, moduleAssessments, module)),
  );

  const expectedLessonCount = Math.max(module.lessonCount, rescueModule?.module.lessonCount ?? 0, lessonNodes.length);
  const moduleSummary = summarizeModule(expectedLessonCount, lessonNodes, moduleAssessments);
  const provenance: CurriculumCanvasModule['provenance'] = liveLessons.length && liveAssessments.length
    ? 'live'
    : lessonNodes.length || moduleAssessments.length
      ? 'blended'
      : 'rescue';

  return {
    id: module.id,
    title: safeText(module.title, 'Untitled module'),
    status: safeText(module.status, 'draft'),
    level: safeText(module.level, 'unassigned'),
    lessonCount: expectedLessonCount,
    readyLessons: moduleSummary.readyLessons,
    gapCount: moduleSummary.gapCount,
    lessons: lessonNodes,
    assessments: moduleAssessments,
    coverageLabel: moduleSummary.coverageLabel,
    assessmentCoverageLabel: moduleSummary.assessmentCoverageLabel,
    blockerSummary: moduleSummary.blockerSummary,
    provenance,
  };
}

export function buildCurriculumCanvasData({
  subjects,
  strands,
  modules,
  lessons,
  assessments,
  tree,
}: {
  subjects: Subject[];
  strands: Strand[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
  tree?: CurriculumCanvasApiTree | null;
}): CurriculumCanvasData {
  const orderedSubjects = sortByOrder(subjects);
  const orderedStrands = sortByOrder(strands);
  const treeIndex = indexTreeModules(tree);

  const canvasSubjects: CurriculumCanvasSubject[] = orderedSubjects
    .map((subject): CurriculumCanvasSubject | null => {
      const subjectStrands = orderedStrands.filter((strand) => matchesLooseIdOrName(strand.subjectId, subject.id, strand.subjectName, subject.name));

      const strandNodes: CurriculumCanvasStrand[] = subjectStrands.map((strand) => {
        const strandModules = modules
          .filter((module) => {
            const subjectMatches = matchesLooseIdOrName(module.subjectId, subject.id, module.subjectName, subject.name);
            const strandMatches = matchesLooseIdOrName(module.strandId, strand.id, module.strandName, strand.name);
            return subjectMatches && strandMatches;
          })
          .sort((left, right) => safeText(left.title, 'Untitled module').localeCompare(safeText(right.title, 'Untitled module')));

        const moduleNodes = strandModules.map((module) => buildModuleNode({
          module,
          subject,
          lessons,
          assessments,
          rescueModule: treeIndex.find(module, strand),
        }));

        return {
          id: strand.id,
          name: strand.name,
          modules: moduleNodes,
        } satisfies CurriculumCanvasStrand;
      }).filter((strand) => strand.modules.length > 0);

      const fallbackModules = modules
        .filter((module) => {
          const subjectMatches = matchesLooseIdOrName(module.subjectId, subject.id, module.subjectName, subject.name);
          if (!subjectMatches) return false;
          return !strandNodes.some((strand) => strand.modules.some((strandModule) => strandModule.id === module.id));
        })
        .sort((left, right) => safeText(left.title, 'Untitled module').localeCompare(safeText(right.title, 'Untitled module')));

      if (fallbackModules.length) {
        const fallbackStrands = new Map<string, CurriculumCanvasModule[]>();

        fallbackModules.forEach((module) => {
          const strandName = module.strandName?.trim() || 'General lane';
          const existing = fallbackStrands.get(strandName) ?? [];
          existing.push(buildModuleNode({
            module,
            subject,
            lessons,
            assessments,
            rescueModule: treeIndex.find(module),
          }));
          fallbackStrands.set(strandName, existing);
        });

        Array.from(fallbackStrands.entries())
          .sort(([left], [right]) => left.localeCompare(right))
          .forEach(([name, groupedModules], index) => {
            strandNodes.push({
              id: `fallback-${subject.id}-${index}`,
              name,
              modules: groupedModules,
            } satisfies CurriculumCanvasStrand);
          });
      }

      if (!strandNodes.length) return null;

      return withSubjectTotals({
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        strands: strandNodes,
      });
    })
    .filter((subject): subject is CurriculumCanvasSubject => Boolean(subject));

  return finalizeCanvasSubjects(canvasSubjects);
}

export function buildCurriculumCanvasDataFromTree(tree: CurriculumCanvasApiTree | null | undefined): CurriculumCanvasData {
  const subjectNodes = tree?.root?.children?.filter((node) => node.nodeType === 'subject') ?? [];

  const subjects = subjectNodes.map((subjectNode) => {
    const strands = sortByOrder(subjectNode.children ?? [])
      .filter((node) => node.nodeType === 'strand')
      .map((strandNode) => {
        const modules = sortByOrder(strandNode.children ?? [])
          .filter((node) => node.nodeType === 'module')
          .map((moduleNode) => {
            const lessonNodes = sortByOrder(moduleNode.children ?? []).filter((node) => node.nodeType === 'lesson');
            const assessmentNodes = sortByOrder(moduleNode.children ?? []).filter((node) => node.nodeType === 'assessment');
            const assessments = assessmentNodes.map(normalizeAssessmentFromNode);
            const lessons = lessonNodes.map((lessonNode) => buildLessonNode(lessonNode, assessments));
            const expectedLessonCount = Math.max(moduleNode.lessonCount ?? 0, lessons.length);
            const moduleSummary = summarizeModule(expectedLessonCount, lessons, assessments);

            return {
              id: moduleNode.id,
              title: moduleNode.title ?? moduleNode.name ?? 'Untitled module',
              status: moduleNode.status ?? 'draft',
              level: moduleNode.level ?? 'unassigned',
              lessonCount: expectedLessonCount,
              readyLessons: moduleSummary.readyLessons,
              gapCount: moduleSummary.gapCount,
              lessons,
              assessments,
              coverageLabel: moduleSummary.coverageLabel,
              assessmentCoverageLabel: moduleSummary.assessmentCoverageLabel,
              blockerSummary: moduleSummary.blockerSummary,
              provenance: 'rescue',
            } satisfies CurriculumCanvasModule;
          });

        return {
          id: strandNode.id,
          name: strandNode.name ?? strandNode.title ?? 'Untitled strand',
          modules,
        } satisfies CurriculumCanvasStrand;
      })
      .filter((strand) => strand.modules.length > 0);

    return withSubjectTotals({
      id: subjectNode.id,
      name: subjectNode.name ?? subjectNode.title ?? 'Untitled subject',
      icon: subjectNode.icon ?? undefined,
      strands,
    });
  }).filter((subject) => subject.strands.length > 0);

  return finalizeCanvasSubjects(subjects);
}
