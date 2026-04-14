import type { Assessment, CurriculumModule, Lesson, Strand, Subject } from './types';

export type CurriculumCanvasLesson = {
  id: string;
  title: string;
  status: string;
  durationMinutes: number;
  mode: string;
  assessmentTitle?: string | null;
  assessmentId?: string | null;
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

function sortByOrder<T extends { order?: number | null; name?: string | null; title?: string | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const orderDelta = (left.order ?? 999) - (right.order ?? 999);
    if (orderDelta !== 0) return orderDelta;
    return (left.name ?? left.title ?? '').localeCompare(right.name ?? right.title ?? '');
  });
}

function lessonSubjectMatches(lesson: Lesson, subject: Subject, module?: CurriculumModule) {
  return lesson.subjectId === subject.id || lesson.subjectName === subject.name || module?.subjectId === subject.id || module?.subjectName === subject.name;
}

function assessmentMatchesLesson(assessment: Assessment, lesson: Lesson, module?: CurriculumModule) {
  return assessment.moduleId === lesson.moduleId
    || assessment.moduleTitle === lesson.moduleTitle
    || assessment.moduleId === module?.id
    || assessment.moduleTitle === module?.title;
}

function normalizeAssessmentFromNode(node: CurriculumCanvasApiNode): Assessment {
  return {
    id: node.id,
    subjectId: node.subjectId ?? null,
    moduleId: node.moduleId ?? null,
    title: node.title ?? node.name ?? 'Untitled assessment',
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

export function buildCurriculumCanvasData({
  subjects,
  strands,
  modules,
  lessons,
  assessments,
}: {
  subjects: Subject[];
  strands: Strand[];
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
}): CurriculumCanvasData {
  const orderedSubjects = sortByOrder(subjects);
  const orderedStrands = sortByOrder(strands);

  const canvasSubjects: CurriculumCanvasSubject[] = orderedSubjects
    .map((subject): CurriculumCanvasSubject | null => {
      const subjectStrands = orderedStrands.filter((strand) => strand.subjectId === subject.id || strand.subjectName === subject.name);

      const strandNodes = subjectStrands.map((strand) => {
        const strandModules = modules
          .filter((module) => {
            const subjectMatches = module.subjectId === subject.id || module.subjectName === subject.name;
            const strandMatches = module.strandId === strand.id || module.strandName === strand.name;
            return subjectMatches && strandMatches;
          })
          .sort((left, right) => left.title.localeCompare(right.title));

        const moduleNodes = strandModules.map((module) => {
          const moduleLessons = lessons
            .filter((lesson) => (lesson.moduleId === module.id || lesson.moduleTitle === module.title) && lessonSubjectMatches(lesson, subject, module))
            .sort((left, right) => left.title.localeCompare(right.title));

          const moduleAssessments = assessments
            .filter((assessment) => assessment.moduleId === module.id || assessment.moduleTitle === module.title)
            .sort((left, right) => left.title.localeCompare(right.title));

          const lessonNodes = moduleLessons.map((lesson) => {
            const lessonAssessment = moduleAssessments.find((assessment) => assessmentMatchesLesson(assessment, lesson, module)) ?? null;
            return {
              id: lesson.id,
              title: lesson.title,
              status: lesson.status,
              durationMinutes: lesson.durationMinutes,
              mode: lesson.mode,
              assessmentTitle: lessonAssessment?.title ?? null,
              assessmentId: lessonAssessment?.id ?? null,
            } satisfies CurriculumCanvasLesson;
          });

          const expectedLessonCount = Math.max(module.lessonCount, lessonNodes.length);
          const readyLessons = lessonNodes.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
          const gapCount = Math.max(expectedLessonCount - readyLessons, 0) + (moduleAssessments.length ? 0 : 1);

          return {
            id: module.id,
            title: module.title,
            status: module.status,
            level: module.level,
            lessonCount: expectedLessonCount,
            readyLessons,
            gapCount,
            lessons: lessonNodes,
            assessments: moduleAssessments,
          } satisfies CurriculumCanvasModule;
        });

        return {
          id: strand.id,
          name: strand.name,
          modules: moduleNodes,
        } satisfies CurriculumCanvasStrand;
      }).filter((strand) => strand.modules.length > 0);

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

            const lessons = lessonNodes.map((lessonNode) => {
              const linkedAssessment = assessments.find((assessment) => assessment.moduleId === lessonNode.moduleId || assessment.moduleTitle === lessonNode.moduleTitle) ?? null;
              return {
                id: lessonNode.id,
                title: lessonNode.title ?? lessonNode.name ?? 'Untitled lesson',
                status: lessonNode.status ?? 'draft',
                durationMinutes: lessonNode.durationMinutes ?? 0,
                mode: lessonNode.mode ?? 'guided',
                assessmentTitle: linkedAssessment?.title ?? null,
                assessmentId: linkedAssessment?.id ?? null,
              } satisfies CurriculumCanvasLesson;
            });

            const expectedLessonCount = Math.max(moduleNode.lessonCount ?? 0, lessons.length);
            const readyLessons = lessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
            const gapCount = Math.max(expectedLessonCount - readyLessons, 0) + (assessments.length ? 0 : 1);

            return {
              id: moduleNode.id,
              title: moduleNode.title ?? moduleNode.name ?? 'Untitled module',
              status: moduleNode.status ?? 'draft',
              level: moduleNode.level ?? 'unassigned',
              lessonCount: expectedLessonCount,
              readyLessons,
              gapCount,
              lessons,
              assessments,
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
