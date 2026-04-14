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

function sortByOrder<T extends { order?: number; name?: string; title?: string }>(items: T[]) {
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
          .filter((module) => (module.subjectId === subject.id || module.subjectName === subject.name) && module.strandName === strand.name)
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

          const readyLessons = lessonNodes.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length;
          const gapCount = Math.max(module.lessonCount - readyLessons, 0) + (moduleAssessments.length ? 0 : 1);

          return {
            id: module.id,
            title: module.title,
            status: module.status,
            level: module.level,
            lessonCount: module.lessonCount,
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

      const totals = strandNodes.reduce((accumulator, strand) => {
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

      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        strands: strandNodes,
        totals,
      } satisfies CurriculumCanvasSubject;
    })
    .filter((subject): subject is CurriculumCanvasSubject => Boolean(subject));

  return {
    subjects: canvasSubjects,
    summary: {
      subjects: canvasSubjects.length,
      strands: canvasSubjects.reduce((sum, subject) => sum + subject.strands.length, 0),
      modules: canvasSubjects.reduce((sum, subject) => sum + subject.totals.modules, 0),
      lessons: canvasSubjects.reduce((sum, subject) => sum + subject.totals.lessons, 0),
      assessments: canvasSubjects.reduce((sum, subject) => sum + subject.totals.assessments, 0),
      readyLessons: canvasSubjects.reduce((sum, subject) => sum + subject.totals.readyLessons, 0),
      blockedModules: canvasSubjects.reduce((sum, subject) => sum + subject.strands.reduce((strandSum, strand) => strandSum + strand.modules.filter((module) => module.gapCount > 0).length, 0), 0),
    },
  };
}
