import { assessmentMatchesModule, isLiveAssessmentGate } from './module-assessment-match';
import { filterLessonsForModule, findModuleForLesson, lessonMatchesModule } from './module-lesson-match';
import type { Assessment, Assignment, CurriculumModule, Lesson } from './types';

type ActivityTemplate = {
  title: string;
  duration: string;
  type: string;
  detail: string;
  evidence: string;
};

export type EnglishLessonBlueprint = {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  moduleId?: string | null;
  level: string;
  status: string;
  mode: string;
  durationMinutes: number;
  objective: string;
  vocabularyFocus: string[];
  activities: ActivityTemplate[];
  assessmentTitle: string | null;
  assessmentTrigger: string | null;
  releaseRisk: string;
  releaseLabel: string;
  readinessChecks: { label: string; passed: boolean }[];
  readinessScore: number;
};

function titleWords(title: string) {
  return title
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

export function toTopic(title: string) {
  const cleaned = title.replace(/^(lesson\s*\d+[:\-]?\s*)/i, '').trim();
  return cleaned || title;
}

export function inferVocabulary(title: string) {
  const words = titleWords(title)
    .filter((word) => word.length > 3)
    .slice(0, 3);

  if (words.length >= 3) return words;
  return [...words, 'sentence frame', 'speaking turn'].slice(0, 3);
}

function releaseMeta(status: string) {
  if (status === 'published') return { releaseRisk: 'Ready for pod release right now.', releaseLabel: 'pod-ready' };
  if (status === 'approved') return { releaseRisk: 'Content is signed off but not pushed live yet.', releaseLabel: 'queued' };
  if (status === 'review') return { releaseRisk: 'Needs editorial sign-off before it touches learner pods.', releaseLabel: 'review' };
  return { releaseRisk: 'Still rough. Authoring is ahead of release.', releaseLabel: 'draft' };
}

export function buildEnglishObjective(title: string) {
  const topic = toTopic(title);
  return `Learners can talk about ${topic.toLowerCase()} using short spoken English with supported sentence frames.`;
}

export function buildEnglishActivities({
  title,
  durationMinutes,
  mode,
  assessmentTitle,
}: {
  title: string;
  durationMinutes: number;
  mode: string;
  assessmentTitle?: string | null;
}) {
  const topic = toTopic(title);
  const vocabularyFocus = inferVocabulary(title);

  return [
    {
      title: 'Warm welcome + retrieval',
      duration: '3 min',
      type: 'Hook',
      detail: `Open with a fast oral recall tied to ${topic.toLowerCase()} so learners hear the target language immediately.`,
      evidence: 'Whole-group response confidence',
    },
    {
      title: 'Model and echo',
      duration: `${Math.max(4, Math.round(durationMinutes * 0.22))} min`,
      type: 'Explicit teaching',
      detail: `Mallam models the key phrase, gesture, and pronunciation pattern for ${vocabularyFocus.join(', ')}. Learners echo in rhythm.`,
      evidence: 'Clear pronunciation on repeated lines',
    },
    {
      title: 'Guided pair talk',
      duration: `${Math.max(4, Math.round(durationMinutes * 0.28))} min`,
      type: 'Structured practice',
      detail: 'Pairs use a sentence frame and swap turns twice. Pod aide listens for full answers rather than single words.',
      evidence: 'Turn-taking with complete sentence frames',
    },
    {
      title: 'Interactive task',
      duration: `${Math.max(4, Math.round(durationMinutes * 0.3))} min`,
      type: mode === 'group' ? 'Collaborative activity' : mode === 'independent' ? 'Independent task' : 'Small-group task',
      detail: `Learners complete a visible task linked to ${topic.toLowerCase()} — picture sort, speaking prompt, or matching card — while the mallam records who needed support.`,
      evidence: 'Task completion with light prompting',
    },
    {
      title: 'Exit check',
      duration: '2 min',
      type: 'Assessment for learning',
      detail: assessmentTitle
        ? `Close with one check aligned to ${assessmentTitle}. Capture whether learners are ready for the module gate.`
        : 'Close with a quick oral check so the next lesson is not flying blind.',
      evidence: 'Named learners demonstrate the target phrase',
    },
  ];
}

export function buildReadinessChecks({
  status,
  moduleStatus,
  hasAssessment,
  lessonTitle,
  durationMinutes,
}: {
  status: string;
  moduleStatus?: string | null;
  hasAssessment: boolean;
  lessonTitle: string;
  durationMinutes: number;
}) {
  const checks = [
    { label: 'Lesson title is specific enough to map to a real speaking task', passed: toTopic(lessonTitle).trim().length >= 8 },
    { label: 'Duration is long enough for modelling, practice, and exit evidence', passed: durationMinutes >= 8 },
    { label: 'Module lane is not stuck in draft', passed: moduleStatus === 'review' || moduleStatus === 'approved' || moduleStatus === 'published' },
    { label: 'Assessment gate exists for the module', passed: hasAssessment },
    { label: 'Lesson status matches publish intent', passed: status === 'approved' || status === 'published' },
  ];

  const readinessScore = checks.filter((check) => check.passed).length;
  return { checks, readinessScore };
}

export function buildEnglishLessonBlueprints({
  modules,
  lessons,
  assessments,
}: {
  modules: CurriculumModule[];
  lessons: Lesson[];
  assessments: Assessment[];
}): EnglishLessonBlueprint[] {
  const englishModules = modules.filter((module) => module.subjectName?.toLowerCase().includes('english'));
  const englishLessons = lessons.filter(
    (lesson) => lesson.subjectName?.toLowerCase().includes('english') || englishModules.some((module) => lessonMatchesModule(lesson, module)),
  );

  return englishLessons.map((lesson) => {
    const module = findModuleForLesson(englishModules, lesson);
    const linkedAssessment = module
      ? assessments.find((assessment) => assessmentMatchesModule(module, assessment) && isLiveAssessmentGate(assessment)) ?? null
      : assessments.find((assessment) => assessment.moduleTitle === lesson.moduleTitle && isLiveAssessmentGate(assessment)) ?? null;
    const vocabularyFocus = inferVocabulary(lesson.title);
    const release = releaseMeta(lesson.status);
    const readiness = buildReadinessChecks({
      status: lesson.status,
      moduleStatus: module?.status,
      hasAssessment: Boolean(linkedAssessment),
      lessonTitle: lesson.title,
      durationMinutes: lesson.durationMinutes,
    });

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleTitle: lesson.moduleTitle ?? module?.title ?? 'Unmapped module',
      moduleId: module?.id,
      level: module?.level ?? 'beginner',
      status: lesson.status,
      mode: lesson.mode,
      durationMinutes: lesson.durationMinutes,
      objective: buildEnglishObjective(lesson.title),
      vocabularyFocus,
      activities: buildEnglishActivities({
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        mode: lesson.mode,
        assessmentTitle: linkedAssessment?.title ?? null,
      }),
      assessmentTitle: linkedAssessment?.title ?? null,
      assessmentTrigger: linkedAssessment?.triggerLabel ?? null,
      releaseRisk: release.releaseRisk,
      releaseLabel: release.releaseLabel,
      readinessChecks: readiness.checks,
      readinessScore: readiness.readinessScore,
    };
  });
}

export function buildEnglishOpsSummary({
  modules,
  lessons,
  assignments,
}: {
  modules: CurriculumModule[];
  lessons: Lesson[];
  assignments: Assignment[];
}) {
  const englishModules = modules.filter((module) => module.subjectName?.toLowerCase().includes('english'));
  const englishLessons = lessons.filter(
    (lesson) => lesson.subjectName?.toLowerCase().includes('english') || englishModules.some((module) => lessonMatchesModule(lesson, module)),
  );
  const englishAssignments = assignments.filter((assignment) =>
    englishLessons.some((lesson) => lesson.title === assignment.lessonTitle) || assignment.lessonTitle.toLowerCase().includes('english'),
  );

  const moduleTitles = new Set(englishModules.map((module) => module.title));

  return {
    moduleCount: englishModules.length,
    lessonCount: englishLessons.length,
    publishedLessons: englishLessons.filter((lesson) => ['approved', 'published'].includes(lesson.status)).length,
    liveAssignments: englishAssignments.length,
    modulesMissingLessons: englishModules.filter((module) => {
      const count = filterLessonsForModule(englishLessons, module).length;
      return count < module.lessonCount;
    }).length,
    lessonsInReview: englishLessons.filter((lesson) => lesson.status === 'review').length,
    moduleTitles,
  };
}
