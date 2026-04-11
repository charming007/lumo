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
};

function titleWords(title: string) {
  return title
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function toTopic(title: string) {
  const cleaned = title.replace(/^(lesson\s*\d+[:\-]?\s*)/i, '').trim();
  return cleaned || title;
}

function inferVocabulary(title: string) {
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
  const englishModuleIds = new Set(englishModules.map((module) => module.id));
  const englishLessons = lessons.filter(
    (lesson) => lesson.subjectName?.toLowerCase().includes('english') || englishModules.some((module) => module.title === lesson.moduleTitle),
  );

  return englishLessons.map((lesson) => {
    const module = englishModules.find((item) => item.title === lesson.moduleTitle);
    const linkedAssessment = assessments.find((assessment) => assessment.moduleId === module?.id || assessment.moduleTitle === lesson.moduleTitle) ?? null;
    const topic = toTopic(lesson.title);
    const vocabularyFocus = inferVocabulary(lesson.title);
    const release = releaseMeta(lesson.status);

    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleTitle: lesson.moduleTitle ?? module?.title ?? 'Unmapped module',
      moduleId: module?.id,
      level: module?.level ?? 'beginner',
      status: lesson.status,
      mode: lesson.mode,
      durationMinutes: lesson.durationMinutes,
      objective: `Learners can talk about ${topic.toLowerCase()} using short spoken English with supported sentence frames.`,
      vocabularyFocus,
      activities: [
        {
          title: 'Warm welcome + retrieval',
          duration: '3 min',
          type: 'Hook',
          detail: `Open with a fast oral recall tied to ${topic.toLowerCase()} so learners hear the target language immediately.`,
          evidence: 'Whole-group response confidence',
        },
        {
          title: 'Model and echo',
          duration: `${Math.max(4, Math.round(lesson.durationMinutes * 0.22))} min`,
          type: 'Explicit teaching',
          detail: `Mallam models the key phrase, gesture, and pronunciation pattern for ${vocabularyFocus.join(', ')}. Learners echo in rhythm.`,
          evidence: 'Clear pronunciation on repeated lines',
        },
        {
          title: 'Guided pair talk',
          duration: `${Math.max(4, Math.round(lesson.durationMinutes * 0.28))} min`,
          type: 'Structured practice',
          detail: `Pairs use a sentence frame and swap turns twice. Pod aide listens for full answers rather than single words.`,
          evidence: 'Turn-taking with complete sentence frames',
        },
        {
          title: 'Interactive task',
          duration: `${Math.max(4, Math.round(lesson.durationMinutes * 0.3))} min`,
          type: lesson.mode === 'group' ? 'Collaborative activity' : lesson.mode === 'independent' ? 'Independent task' : 'Small-group task',
          detail: `Learners complete a visible task linked to ${topic.toLowerCase()} — picture sort, speaking prompt, or matching card — while the mallam records who needed support.`,
          evidence: 'Task completion with light prompting',
        },
        {
          title: 'Exit check',
          duration: '2 min',
          type: 'Assessment for learning',
          detail: linkedAssessment
            ? `Close with one check aligned to ${linkedAssessment.title}. Capture whether learners are ready for the module gate.`
            : 'Close with a quick oral check so the next lesson is not flying blind.',
          evidence: 'Named learners demonstrate the target phrase',
        },
      ],
      assessmentTitle: linkedAssessment?.title ?? null,
      assessmentTrigger: linkedAssessment?.triggerLabel ?? null,
      releaseRisk: release.releaseRisk,
      releaseLabel: release.releaseLabel,
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
  const englishLessons = lessons.filter((lesson) => lesson.subjectName?.toLowerCase().includes('english'));
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
      const count = englishLessons.filter((lesson) => lesson.moduleTitle === module.title).length;
      return count < module.lessonCount;
    }).length,
    lessonsInReview: englishLessons.filter((lesson) => lesson.status === 'review').length,
    moduleTitles,
  };
}
