'use client';

import type React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Pill } from '../lib/ui';
import { ModalLauncher } from './modal-launcher';
import type { Assessment } from '../lib/types';
import type { CurriculumCanvasData, CurriculumCanvasLesson, CurriculumCanvasModule, CurriculumCanvasStrand } from '../lib/curriculum-canvas';

const palettes = ['#8B5CF6', '#14B8A6', '#F97316', '#60A5FA', '#F43F5E'];

const actionLinkStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '10px 12px',
  fontWeight: 800,
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const filterButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: '9px 12px',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.72)',
  color: '#cbd5e1',
};

const quickActionButtonStyle: React.CSSProperties = {
  borderRadius: 14,
  padding: '11px 12px',
  fontWeight: 800,
  fontSize: 13,
  cursor: 'pointer',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(255,255,255,0.05)',
  color: '#f8fafc',
  textAlign: 'left',
};

function statusTone(status: string) {
  if (status === 'published' || status === 'approved' || status === 'active') return { tone: '#052e16', text: '#86efac', border: '1px solid rgba(134,239,172,0.18)' };
  if (status === 'review' || status === 'scheduled') return { tone: '#3b2f0d', text: '#fcd34d', border: '1px solid rgba(252,211,77,0.16)' };
  return { tone: '#1e1b4b', text: '#c4b5fd', border: '1px solid rgba(196,181,253,0.14)' };
}

function lessonSummary(lesson: CurriculumCanvasLesson) {
  const details = [`${lesson.mode} · ${lesson.durationMinutes} min`];
  if (lesson.activityCount) details.push(`${lesson.activityCount} activities`);
  if (lesson.objectiveCount) details.push(`${lesson.objectiveCount} objectives`);
  return details.join(' · ');
}

function assessmentLabel(assessment: Assessment | null) {
  if (!assessment) return 'No assessment gate linked yet';
  return `${assessment.triggerLabel} · ${Math.round(assessment.passingScore * 100)}% pass mark`;
}

function provenancePill(module: CurriculumCanvasModule) {
  if (module.provenance === 'live') return { label: 'live graph', tone: '#052e16', text: '#86efac' };
  if (module.provenance === 'rescue') return { label: 'tree rescue', tone: '#0c4a6e', text: '#a5f3fc' };
  return { label: 'live + rescue', tone: '#312e81', text: '#c7d2fe' };
}

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? '';
}

function formatGeneratedAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function moduleUrl(subjectId: string, moduleId: string, searchTerm: string, readinessFilter: string) {
  const params = new URLSearchParams();
  params.set('subject', subjectId);
  params.set('module', moduleId);
  if (searchTerm) params.set('q', searchTerm);
  if (readinessFilter !== 'all') params.set('readiness', readinessFilter);
  return `/canvas?${params.toString()}`;
}

type CanvasUrlState = {
  searchTerm: string;
  subjectFilter: string;
  readinessFilter: string;
  selectedModuleId: string;
  selectedLessonId: string | null;
  selectedAssessmentId: string | null;
};

function readCanvasUrlState(firstModuleId?: string | null): CanvasUrlState {
  if (typeof window === 'undefined') {
    return {
      searchTerm: '',
      subjectFilter: 'all',
      readinessFilter: 'all',
      selectedModuleId: firstModuleId ?? '',
      selectedLessonId: null,
      selectedAssessmentId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const panel = params.get('panel');
  return {
    searchTerm: params.get('q') ?? '',
    subjectFilter: params.get('subject') ?? 'all',
    readinessFilter: params.get('readiness') ?? 'all',
    selectedModuleId: params.get('module') ?? firstModuleId ?? '',
    selectedLessonId: panel === 'lesson' ? params.get('lesson') : null,
    selectedAssessmentId: panel === 'assessment' ? params.get('assessment') : null,
  };
}

function panelUrl(baseUrl: string, panel: 'lesson' | 'assessment', entityId: string) {
  const [path, existingQuery] = baseUrl.split('?');
  const params = new URLSearchParams(existingQuery ?? '');
  params.set('panel', panel);
  if (panel === 'lesson') {
    params.set('lesson', entityId);
    params.delete('assessment');
  } else {
    params.set('assessment', entityId);
    params.delete('lesson');
  }
  return `${path}?${params.toString()}`;
}

function copyText(value: string, onDone?: () => void) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(value).then(() => {
    onDone?.();
    return true;
  }).catch(() => false);
}

function buildLessonSlots(module: CurriculumCanvasModule) {
  const lessonsByOrder = new Map<number, CurriculumCanvasLesson>();
  const overflowLessons: CurriculumCanvasLesson[] = [];

  module.lessons.forEach((lesson) => {
    const order = typeof lesson.order === 'number' && lesson.order > 0 ? lesson.order : null;
    if (order && order <= module.lessonCount && !lessonsByOrder.has(order)) {
      lessonsByOrder.set(order, lesson);
      return;
    }
    overflowLessons.push(lesson);
  });

  return Array.from({ length: module.lessonCount }, (_, index) => {
    const order = index + 1;
    return {
      order,
      lesson: lessonsByOrder.get(order) ?? null,
      occupiedByDifferentOrder: lessonsByOrder.has(order) ? false : overflowLessons.some((lesson) => lesson.order === order),
    };
  });
}

function missingLessonOrders(module: CurriculumCanvasModule) {
  return buildLessonSlots(module).filter((slot) => !slot.lesson).map((slot) => slot.order);
}

function laneCards(module: CurriculumCanvasModule) {
  const lessonsWithoutGate = module.lessons.filter((lesson) => !lesson.assessmentId).length;
  const lessonsNeedingReadiness = Math.max(module.lessonCount - module.readyLessons, 0);
  const missingLessonSlots = missingLessonOrders(module).length;

  return [
    {
      id: 'delivery',
      label: 'Lesson delivery lane',
      value: `${module.readyLessons}/${module.lessonCount}`,
      note: lessonsNeedingReadiness ? `${lessonsNeedingReadiness} lesson${lessonsNeedingReadiness === 1 ? '' : 's'} still not release-ready` : 'Lessons are ready to ship',
      tone: lessonsNeedingReadiness ? '#3b2f0d' : '#052e16',
      text: lessonsNeedingReadiness ? '#fcd34d' : '#86efac',
    },
    {
      id: 'mapping',
      label: 'Mapped lesson lane',
      value: `${module.lessons.length}/${module.lessonCount}`,
      note: missingLessonSlots ? `${missingLessonSlots} lesson slot${missingLessonSlots === 1 ? '' : 's'} still empty` : 'Every expected lesson node is mapped',
      tone: missingLessonSlots ? '#7c2d12' : '#082f49',
      text: missingLessonSlots ? '#fdba74' : '#a5f3fc',
    },
    {
      id: 'gates',
      label: 'Assessment gate lane',
      value: module.assessments.length ? `${module.assessments.length} linked` : 'Missing',
      note: !module.assessments.length
        ? 'No progression gate is linked yet'
        : lessonsWithoutGate
          ? `${lessonsWithoutGate} lesson${lessonsWithoutGate === 1 ? '' : 's'} still not mapped to a gate`
          : 'Gate coverage is clean',
      tone: !module.assessments.length || lessonsWithoutGate ? '#3b0764' : '#052e16',
      text: !module.assessments.length || lessonsWithoutGate ? '#d8b4fe' : '#86efac',
    },
  ];
}

function lessonJourneyAccent(index: number) {
  const accents = [
    { solid: '#8B5CF6', glow: 'rgba(139,92,246,0.30)', soft: 'rgba(139,92,246,0.18)' },
    { solid: '#14B8A6', glow: 'rgba(20,184,166,0.30)', soft: 'rgba(20,184,166,0.18)' },
    { solid: '#F97316', glow: 'rgba(249,115,22,0.30)', soft: 'rgba(249,115,22,0.18)' },
    { solid: '#38BDF8', glow: 'rgba(56,189,248,0.28)', soft: 'rgba(56,189,248,0.18)' },
    { solid: '#F43F5E', glow: 'rgba(244,63,94,0.28)', soft: 'rgba(244,63,94,0.16)' },
  ];
  return accents[index % accents.length];
}

function lessonJourneyIcon(lesson: CurriculumCanvasLesson | null) {
  if (!lesson) return '＋';
  if (lesson.mode === 'guided') return '🧭';
  if (lesson.mode === 'group') return '👥';
  if (lesson.mode === 'independent') return '✍️';
  if (lesson.mode === 'practice') return '🎯';
  if (lesson.mode === 'ops') return '🛠️';
  return '📘';
}

type CanvasSubjectOption = { id: string; name: string };

const canvasFieldStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: '12px 14px',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.88)',
  color: '#f8fafc',
  width: '100%',
};

function CanvasFieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'grid', gap: 6, color: '#cbd5e1', fontSize: 14 }}>{label}{children}</label>;
}

function CanvasCreateStrandForm({
  subjects,
  subjectId,
  suggestedOrder,
  returnPath,
  createStrandAction,
}: {
  subjects: CanvasSubjectOption[];
  subjectId: string;
  suggestedOrder: number;
  returnPath: string;
  createStrandAction: (formData: FormData) => void;
}) {
  return (
    <form action={createStrandAction} style={{ display: 'grid', gap: 12 }}>
      <input type="hidden" name="returnPath" value={returnPath} />
      <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 14 }}>Create a strand directly from the canvas and set its lifecycle status before modules start piling into the wrong lane.</div>
      <CanvasFieldLabel label="Subject">
        <select name="subjectId" defaultValue={subjectId} style={canvasFieldStyle}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </CanvasFieldLabel>
      <CanvasFieldLabel label="Strand name"><input name="name" defaultValue="Speaking & Listening" style={canvasFieldStyle} /></CanvasFieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <CanvasFieldLabel label="Order"><input name="order" type="number" min="1" defaultValue={String(suggestedOrder)} style={canvasFieldStyle} /></CanvasFieldLabel>
        <CanvasFieldLabel label="Status">
          <select name="status" defaultValue="draft" style={canvasFieldStyle}>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
          </select>
        </CanvasFieldLabel>
      </div>
      <button type="submit" style={{ ...filterButtonStyle, background: '#4F46E5', color: '#f8fafc', width: 'fit-content', padding: '12px 16px' }}>Create strand</button>
    </form>
  );
}

function CanvasEditStrandForm({
  strand,
  subjects,
  returnPath,
  updateStrandAction,
}: {
  strand: CurriculumCanvasStrand;
  subjects: CanvasSubjectOption[];
  returnPath: string;
  updateStrandAction: (formData: FormData) => void;
}) {
  return (
    <form action={updateStrandAction} style={{ display: 'grid', gap: 12 }}>
      <input type="hidden" name="strandId" value={strand.id} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 14 }}>This is the missing strand lifecycle control inside the canvas lane itself, so publish state stops disappearing behind another page.</div>
      <CanvasFieldLabel label="Subject">
        <select name="subjectId" defaultValue={strand.subjectId} style={canvasFieldStyle}>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </CanvasFieldLabel>
      <CanvasFieldLabel label="Strand name"><input name="name" defaultValue={strand.name} style={canvasFieldStyle} /></CanvasFieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <CanvasFieldLabel label="Order"><input name="order" type="number" min="1" defaultValue={String(strand.order ?? 1)} style={canvasFieldStyle} /></CanvasFieldLabel>
        <CanvasFieldLabel label="Status">
          <select name="status" defaultValue={strand.status ?? 'draft'} style={canvasFieldStyle}>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
          </select>
        </CanvasFieldLabel>
      </div>
      <button type="submit" style={{ ...filterButtonStyle, background: '#0f766e', color: '#f8fafc', width: 'fit-content', padding: '12px 16px' }}>Save strand changes</button>
    </form>
  );
}

export function CurriculumCanvas({
  data,
  failedSources = [],
  generatedAt,
  mode = 'live',
  quickUpdateLessonStatusAction,
  quickUpdateCanvasLessonAction,
  quickLinkCanvasLessonAssessmentAction,
  quickUpdateCanvasModuleAction,
  bulkUpdateCanvasModuleLessonsAction,
  createCanvasModuleLessonShellsAction,
  quickUpdateAssessmentStatusAction,
  quickUpdateCanvasAssessmentAction,
  createCanvasAssessmentQuickAction,
  subjectOptions,
  createStrandAction,
  updateStrandAction,
  returnPath = '/canvas',
}: {
  data: CurriculumCanvasData;
  failedSources?: string[];
  generatedAt?: string | null;
  mode?: 'live' | 'blended' | 'rescue-tree' | 'hard-rescue';
  quickUpdateLessonStatusAction: (formData: FormData) => void;
  quickUpdateCanvasLessonAction: (formData: FormData) => void;
  quickLinkCanvasLessonAssessmentAction: (formData: FormData) => void;
  quickUpdateCanvasModuleAction: (formData: FormData) => void;
  bulkUpdateCanvasModuleLessonsAction: (formData: FormData) => void;
  createCanvasModuleLessonShellsAction: (formData: FormData) => void;
  quickUpdateAssessmentStatusAction: (formData: FormData) => void;
  quickUpdateCanvasAssessmentAction: (formData: FormData) => void;
  createCanvasAssessmentQuickAction: (formData: FormData) => void;
  subjectOptions: CanvasSubjectOption[];
  createStrandAction: (formData: FormData) => void;
  updateStrandAction: (formData: FormData) => void;
  returnPath?: string;
}) {
  const firstModule = data.subjects[0]?.strands[0]?.modules[0] ?? null;
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [selectedModuleId, setSelectedModuleId] = useState(firstModule?.id ?? '');
  const [copiedState, setCopiedState] = useState<'idle' | 'copied'>('idle');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextState = readCanvasUrlState(firstModule?.id);
      setSearchTerm(nextState.searchTerm);
      setSubjectFilter(nextState.subjectFilter);
      setReadinessFilter(nextState.readinessFilter);
      setSelectedModuleId(nextState.selectedModuleId);
      setSelectedLessonId(nextState.selectedLessonId);
      setSelectedAssessmentId(nextState.selectedAssessmentId);
    };

    syncFromUrl();
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [firstModule?.id]);

  useEffect(() => {
    if (!selectedModuleId && firstModule?.id) {
      setSelectedModuleId(firstModule.id);
    }
  }, [firstModule?.id, selectedModuleId]);

  useEffect(() => {
    if (copiedState !== 'copied') return undefined;
    const timeout = window.setTimeout(() => setCopiedState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [copiedState]);

  const filteredSubjects = useMemo(() => {
    const query = normalize(searchTerm);
    return data.subjects
      .filter((subject) => subjectFilter === 'all' || subject.id === subjectFilter)
      .map((subject) => {
        const strands = subject.strands
          .map((strand) => {
            const modules = strand.modules.filter((module) => {
              if (readinessFilter === 'blocked' && module.gapCount === 0) return false;
              if (readinessFilter === 'ready' && module.gapCount > 0) return false;
              if (!query) return true;

              const moduleMatches = [
                module.title,
                module.level,
                module.status,
                module.blockerSummary,
                module.coverageLabel,
                module.assessmentCoverageLabel,
              ].some((value) => normalize(value).includes(query));

              const lessonMatches = module.lessons.some((lesson) => [lesson.title, lesson.mode, lesson.assessmentTitle ?? ''].some((value) => normalize(value).includes(query)));
              const assessmentMatches = module.assessments.some((assessment) => [assessment.title, assessment.triggerLabel, assessment.progressionGate, assessment.status].some((value) => normalize(value).includes(query)));

              return moduleMatches || lessonMatches || assessmentMatches || normalize(strand.name).includes(query) || normalize(subject.name).includes(query);
            });

            return { ...strand, modules };
          })
          .filter((strand) => strand.modules.length > 0);

        const totals = strands.reduce((accumulator, strand) => {
          strand.modules.forEach((module) => {
            accumulator.modules += 1;
            accumulator.lessons += module.lessons.length;
            accumulator.assessments += module.assessments.length;
            accumulator.readyLessons += module.readyLessons;
            accumulator.gaps += module.gapCount;
          });
          return accumulator;
        }, { modules: 0, lessons: 0, assessments: 0, readyLessons: 0, gaps: 0 });

        return { ...subject, strands, totals };
      })
      .filter((subject) => subject.strands.length > 0);
  }, [data.subjects, readinessFilter, searchTerm, subjectFilter]);

  const filteredSummary = useMemo(() => ({
    subjects: filteredSubjects.length,
    strands: filteredSubjects.reduce((sum, subject) => sum + subject.strands.length, 0),
    modules: filteredSubjects.reduce((sum, subject) => sum + subject.totals.modules, 0),
    lessons: filteredSubjects.reduce((sum, subject) => sum + subject.totals.lessons, 0),
    assessments: filteredSubjects.reduce((sum, subject) => sum + subject.totals.assessments, 0),
    readyLessons: filteredSubjects.reduce((sum, subject) => sum + subject.totals.readyLessons, 0),
    blockedModules: filteredSubjects.reduce((sum, subject) => sum + subject.strands.reduce((strandSum, strand) => strandSum + strand.modules.filter((module) => module.gapCount > 0).length, 0), 0),
  }), [filteredSubjects]);

  const priorityModules = useMemo(() => filteredSubjects
    .flatMap((subject) => subject.strands.flatMap((strand) => strand.modules.map((module) => ({ subject, strand, module }))))
    .filter((entry) => entry.module.gapCount > 0)
    .sort((left, right) => right.module.gapCount - left.module.gapCount || left.module.title.localeCompare(right.module.title))
    .slice(0, 5), [filteredSubjects]);

  const selected = useMemo(() => {
    for (const subject of filteredSubjects) {
      for (const strand of subject.strands) {
        for (const module of strand.modules) {
          if (module.id === selectedModuleId) {
            return { subject, strand, module };
          }
        }
      }
    }

    const filteredFirstSubject = filteredSubjects[0];
    const filteredFirstStrand = filteredFirstSubject?.strands[0];
    const filteredFirstModule = filteredFirstStrand?.modules[0] ?? null;
    if (filteredFirstSubject && filteredFirstStrand && filteredFirstModule) {
      return {
        subject: filteredFirstSubject,
        strand: filteredFirstStrand,
        module: filteredFirstModule,
      };
    }

    if (!filteredSubjects.length) {
      for (const subject of data.subjects) {
        for (const strand of subject.strands) {
          for (const module of strand.modules) {
            if (module.id === selectedModuleId) {
              return { subject, strand, module };
            }
          }
        }
      }
    }

    if (!filteredSubjects.length && firstModule) {
      const subject = data.subjects[0];
      const strand = subject?.strands[0];
      return subject && strand ? { subject, strand, module: firstModule } : null;
    }

    return null;
  }, [data.subjects, filteredSubjects, firstModule, selectedModuleId]);

  useEffect(() => {
    const firstVisibleModuleId = filteredSubjects[0]?.strands[0]?.modules[0]?.id ?? null;
    if (!firstVisibleModuleId) {
      return;
    }

    const selectedStillVisible = filteredSubjects.some((subject) =>
      subject.strands.some((strand) => strand.modules.some((module) => module.id === selectedModuleId)),
    );

    if (!selectedStillVisible) {
      setSelectedModuleId(firstVisibleModuleId);
      setSelectedLessonId(null);
      setSelectedAssessmentId(null);
    }
  }, [filteredSubjects, selectedModuleId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (searchTerm) params.set('q', searchTerm); else params.delete('q');
    if (subjectFilter !== 'all') params.set('subject', subjectFilter); else params.delete('subject');
    if (readinessFilter !== 'all') params.set('readiness', readinessFilter); else params.delete('readiness');
    if (selectedModuleId) params.set('module', selectedModuleId); else params.delete('module');
    if (selectedLessonId) {
      params.set('panel', 'lesson');
      params.set('lesson', selectedLessonId);
      params.delete('assessment');
    } else if (selectedAssessmentId) {
      params.set('panel', 'assessment');
      params.set('assessment', selectedAssessmentId);
      params.delete('lesson');
    } else {
      params.delete('panel');
      params.delete('lesson');
      params.delete('assessment');
    }
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [readinessFilter, searchTerm, selectedAssessmentId, selectedLessonId, selectedModuleId, subjectFilter]);

  const activeFilterPills = [
    searchTerm ? { id: 'q', label: `Search: ${searchTerm}`, clear: () => setSearchTerm('') } : null,
    subjectFilter !== 'all'
      ? {
          id: 'subject',
          label: `Subject: ${data.subjects.find((subject) => subject.id === subjectFilter)?.name ?? subjectFilter}`,
          clear: () => setSubjectFilter('all'),
        }
      : null,
    readinessFilter !== 'all'
      ? {
          id: 'readiness',
          label: readinessFilter === 'blocked' ? 'Blocked modules only' : 'Release-ready only',
          clear: () => setReadinessFilter('all'),
        }
      : null,
  ].filter((value): value is { id: string; label: string; clear: () => void } => Boolean(value));

  const selectedLesson = selected?.module.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null;
  const selectedAssessment = selected?.module.assessments.find((assessment) => assessment.id === selectedAssessmentId) ?? null;
  const selectedModuleUrl = selected ? moduleUrl(selected.subject.id, selected.module.id, searchTerm, readinessFilter) : '/canvas';
  const selectedModuleSlots = selected ? buildLessonSlots(selected.module) : [];
  const selectedModuleMissingOrders = selected ? missingLessonOrders(selected.module) : [];
  const selectedModuleMissingSlots = selectedModuleMissingOrders.length;
  const selectedModuleLessonShellTitles = selected
    ? selectedModuleMissingOrders.map((order) => `${selected.module.title} Lesson ${order}`)
    : [];
  const selectedModuleUnlinkedLessons = selected ? selected.module.lessons.filter((lesson) => !lesson.assessmentId) : [];
  const selectedModuleNotReadyLessons = selected ? selected.module.lessons.filter((lesson) => !['approved', 'published', 'active'].includes(normalize(lesson.status))) : [];
  const selectedModuleGateCount = selected?.module.assessments.length ?? 0;
  const firstLessonMissingGate = selectedModuleUnlinkedLessons[0] ?? null;
  const firstLessonNeedingReadiness = selectedModuleNotReadyLessons[0] ?? null;
  const firstAssessmentGate = selected?.module.assessments[0] ?? null;

  useEffect(() => {
    if (selectedLessonId && !selectedLesson) {
      setSelectedLessonId(null);
    }
    if (selectedAssessmentId && !selectedAssessment) {
      setSelectedAssessmentId(null);
    }
  }, [selectedAssessment, selectedAssessmentId, selectedLesson, selectedLessonId]);

  if (!data.subjects.length) {
    return <CanvasEmptyState failedSources={failedSources} />;
  }

  const generatedLabel = formatGeneratedAt(generatedAt);
  const visibleModuleCount = filteredSummary.modules;
  const modeLabel = mode === 'live'
    ? 'Live graph'
    : mode === 'blended'
      ? 'Live + rescue blend'
      : mode === 'rescue-tree'
        ? 'Tree rescue'
        : 'Hard rescue';

  return (
    <section style={{ display: 'grid', gap: 18, minHeight: 420 }}>
      <div style={{ padding: 18, borderRadius: 24, background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,1) 100%)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 24px 44px rgba(2, 6, 23, 0.22)', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Canvas controls</div>
            <div style={{ color: '#e2e8f0', lineHeight: 1.6, maxWidth: 760 }}>
              Filter the graph, deep-link the selected module, and surface the ugliest release blockers first so ops do not need a rescue tour guide to use this page.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Pill label={modeLabel} tone="#1e1b4b" text="#c4b5fd" />
            <Pill label={failedSources.length ? `${failedSources.length} failed feeds` : 'All required feeds responding'} tone={failedSources.length ? '#431407' : '#052e16'} text={failedSources.length ? '#fdba74' : '#86efac'} />
            <Pill label={generatedLabel ? `Tree snapshot ${generatedLabel}` : 'No tree timestamp exposed'} tone="#082f49" text="#a5f3fc" />
          </div>
        </div>

        <div className="curriculum-canvas__filters" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.4fr) repeat(2, minmax(180px, 0.7fr)) auto', gap: 10, alignItems: 'center' }}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search subject, strand, module, lesson, gate, or blocker…"
            style={{ borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}
          />
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} style={{ borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}>
            <option value="all">All subjects</option>
            {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
          <select value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value)} style={{ borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}>
            <option value="all">All readiness states</option>
            <option value="blocked">Blocked modules only</option>
            <option value="ready">Release-ready only</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSubjectFilter('all');
              setReadinessFilter('all');
            }}
            style={{ ...filterButtonStyle, height: '100%' }}
          >
            Reset filters
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Filter audit</div>
            <div style={{ color: '#cbd5e1', fontSize: 13 }}>
              Showing {visibleModuleCount} module{visibleModuleCount === 1 ? '' : 's'} across {filteredSummary.subjects} subject{filteredSummary.subjects === 1 ? '' : 's'}.
            </div>
          </div>
          {activeFilterPills.length ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeFilterPills.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={pill.clear}
                  style={{ ...filterButtonStyle, background: 'rgba(79,70,229,0.16)', color: '#e0e7ff', border: '1px solid rgba(129,140,248,0.34)' }}
                >
                  {pill.label} ×
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: 13 }}>No extra filters active. You’re looking at the full canvas.</div>
          )}
        </div>

        {priorityModules.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Priority release queue</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {priorityModules.map((entry) => (
                <button
                  key={entry.module.id}
                  type="button"
                  onClick={() => setSelectedModuleId(entry.module.id)}
                  style={{ ...filterButtonStyle, background: selectedModuleId === entry.module.id ? '#4F46E5' : 'rgba(255,255,255,0.04)', color: '#f8fafc', border: selectedModuleId === entry.module.id ? '1px solid #8b5cf6' : '1px solid rgba(148,163,184,0.18)' }}
                >
                  {entry.module.gapCount} gaps · {entry.module.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          ['Subjects on canvas', String(filteredSummary.subjects)],
          ['Strands mapped', String(filteredSummary.strands)],
          ['Modules visible', String(filteredSummary.modules)],
          ['Lessons visible', String(filteredSummary.lessons)],
          ['Assessment gates', String(filteredSummary.assessments)],
          ['Blocked modules', String(filteredSummary.blockedModules)],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 18px 32px rgba(2, 6, 23, 0.24)' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: '#f8fafc' }}>{value}</div>
          </div>
        ))}
      </div>

      {!visibleModuleCount ? (
        <CanvasEmptyState failedSources={failedSources} searchAware />
      ) : (
        <div className="curriculum-canvas__grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 0.9fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ padding: 18, borderRadius: 28, background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,1) 100%)', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 24px 44px rgba(2, 6, 23, 0.34)', minHeight: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Curriculum graph</div>
                <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>The canvas is live, filtered, and shareable. Every selected module writes its state into the URL so someone else can land on the same node instead of playing “which card do you mean?”</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/content" style={{ ...actionLinkStyle, background: '#ffffff', color: '#0f172a' }}>Open content board</Link>
                <Link href="/content?view=blocked" style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>Clear blockers</Link>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {filteredSubjects.map((subject, index) => {
                const accent = palettes[index % palettes.length];
                return (
                  <div key={subject.id} style={{ padding: 18, borderRadius: 24, background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148, 163, 184, 0.18)', display: 'grid', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 14, alignSelf: 'stretch', minHeight: 58, borderRadius: 999, background: accent }} />
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#f8fafc' }}>{subject.name}</div>
                          <div style={{ color: '#94a3b8' }}>{subject.totals.modules} modules · {subject.totals.lessons} lessons · {subject.totals.assessments} assessments</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Pill label={`${subject.totals.readyLessons} ready lessons`} tone="#052e16" text="#86efac" />
                        <Pill label={`${subject.totals.gaps} release gaps`} tone={subject.totals.gaps ? '#3b2f0d' : '#1e1b4b'} text={subject.totals.gaps ? '#fcd34d' : '#c4b5fd'} />
                        <ModalLauncher buttonLabel="＋ Strand" title={`Create strand in ${subject.name}`} description="Add a strand directly from the canvas and set its lifecycle status before the lane goes live." eyebrow="Create strand" triggerStyle={{ ...filterButtonStyle, background: 'rgba(79,70,229,0.16)', color: '#c7d2fe' }}>
                          <CanvasCreateStrandForm subjects={subjectOptions} subjectId={subject.id} suggestedOrder={subject.strands.length + 1} returnPath={returnPath} createStrandAction={createStrandAction} />
                        </ModalLauncher>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 18 }}>
                      {subject.strands.map((strand) => (
                        <div key={strand.id} style={{ display: 'grid', gap: 12 }}>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontWeight: 800, flexWrap: 'wrap' }}>
                              <span style={{ width: 10, height: 10, borderRadius: 999, background: accent }} />
                              <span>{strand.name}</span>
                              <Pill label={strand.status ?? 'draft'} tone={statusTone(strand.status ?? 'draft').tone} text={statusTone(strand.status ?? 'draft').text} />
                              <span style={{ color: '#64748b', fontWeight: 700 }}>→</span>
                              <span style={{ color: '#94a3b8', fontWeight: 600 }}>{strand.modules.length} module nodes</span>
                              {strand.subjectId && !strand.id.startsWith('fallback-') && !strand.id.startsWith('rescue-') ? (
                                <ModalLauncher buttonLabel="Edit strand" title={`Edit strand · ${strand.name}`} description="Update the strand name, ordering, and lifecycle status without leaving the canvas." eyebrow="Edit strand" triggerStyle={{ ...filterButtonStyle, background: 'rgba(20,184,166,0.16)', color: '#99f6e4' }}>
                                  <CanvasEditStrandForm strand={strand} subjects={subjectOptions} returnPath={returnPath} updateStrandAction={updateStrandAction} />
                                </ModalLauncher>
                              ) : null}
                            </div>
                            <div style={{ color: '#64748b', fontSize: 13 }}>Lane view: each card shows delivery readiness, mapped lesson coverage, and gate coverage before you even open the details rail.</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
                            {strand.modules.map((module) => {
                              const active = selected?.module.id === module.id;
                              const pill = statusTone(module.status);
                              const provenance = provenancePill(module);
                              const lanes = laneCards(module);
                              return (
                                <button
                                  key={module.id}
                                  type="button"
                                  onClick={() => setSelectedModuleId(module.id)}
                                  style={{
                                    textAlign: 'left',
                                    borderRadius: 22,
                                    padding: 16,
                                    border: active ? `2px solid ${accent}` : '1px solid rgba(148,163,184,0.18)',
                                    background: active ? 'linear-gradient(180deg, rgba(30,41,59,0.96) 0%, rgba(30,27,75,0.92) 100%)' : 'rgba(15,23,42,0.92)',
                                    boxShadow: active ? '0 18px 34px rgba(79, 70, 229, 0.22)' : '0 12px 22px rgba(2, 6, 23, 0.18)',
                                    cursor: 'pointer',
                                    display: 'grid',
                                    gap: 12,
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                    <div>
                                      <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{module.title}</div>
                                      <div style={{ color: '#94a3b8' }}>{module.level} · {module.coverageLabel}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                      <Pill label={module.status} tone={pill.tone} text={pill.text} />
                                      <Pill label={provenance.label} tone={provenance.tone} text={provenance.text} />
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <Pill label={`${module.readyLessons}/${module.lessonCount} ready lessons`} tone="#172554" text="#93c5fd" />
                                    <Pill label={module.assessmentCoverageLabel} tone="#3b0764" text="#d8b4fe" />
                                    <Pill label={module.gapCount ? `${module.gapCount} gaps` : 'release-ready'} tone={module.gapCount ? '#3b2f0d' : '#052e16'} text={module.gapCount ? '#fcd34d' : '#86efac'} />
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                                    {lanes.map((lane) => (
                                      <div key={lane.id} style={{ padding: '12px 12px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)', display: 'grid', gap: 6 }}>
                                        <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.9 }}>{lane.label}</div>
                                        <div style={{ fontSize: 18, fontWeight: 900, color: '#f8fafc' }}>{lane.value}</div>
                                        <div style={{ color: lane.text, lineHeight: 1.45, fontSize: 12 }}>{lane.note}</div>
                                      </div>
                                    ))}
                                  </div>

                                  <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)', color: module.gapCount ? '#fde68a' : '#bbf7d0', lineHeight: 1.6, fontSize: 14 }}>
                                    {module.blockerSummary}
                                  </div>

                                  <div style={{ display: 'grid', gap: 8 }}>
                                    {module.lessons.slice(0, 3).map((lesson) => {
                                      const lessonTone = statusTone(lesson.status);
                                      return (
                                        <div key={lesson.id} style={{ display: 'grid', gap: 4, padding: '10px 12px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.12)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                                            <strong style={{ color: '#f8fafc' }}>{lesson.title}</strong>
                                            <Pill label={lesson.status} tone={lessonTone.tone} text={lessonTone.text} />
                                          </div>
                                          <div style={{ color: '#94a3b8', fontSize: 13 }}>{lessonSummary(lesson)}</div>
                                        </div>
                                      );
                                    })}
                                    {module.lessons.length > 3 ? <div style={{ color: '#c4b5fd', fontWeight: 800, fontSize: 13 }}>+{module.lessons.length - 3} more lesson nodes</div> : null}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside style={{ padding: 18, borderRadius: 28, background: '#020617', color: 'white', border: '1px solid rgba(99,102,241,0.22)', boxShadow: '0 20px 44px rgba(2, 6, 23, 0.38)', position: 'sticky', top: 20, minHeight: 320 }}>
            {selected ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Selected node</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{selected.module.title}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 8, lineHeight: 1.6 }}>{selected.subject.name} → {selected.strand.name} → {selected.module.level}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Pill label={`${selected.module.readyLessons}/${selected.module.lessonCount} ready`} tone="#052e16" text="#86efac" />
                    <Pill label={selected.module.assessmentCoverageLabel} tone="#3b0764" text="#d8b4fe" />
                    <Pill label={selected.module.gapCount ? `${selected.module.gapCount} gaps to clear` : 'ready to release'} tone={selected.module.gapCount ? '#3b2f0d' : '#1e1b4b'} text={selected.module.gapCount ? '#fcd34d' : '#c4b5fd'} />
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Quick actions</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window === 'undefined') return;
                        const url = `${window.location.origin}${selectedModuleUrl}`;
                        void copyText(url, () => setCopiedState('copied'));
                      }}
                      style={quickActionButtonStyle}
                    >
                      {copiedState === 'copied' ? 'Copied node link' : 'Copy share link'}
                    </button>
                    <Link href={`/content?subject=${selected.subject.id}&q=${encodeURIComponent(selected.module.title)}`} style={{ ...quickActionButtonStyle, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      Open module board
                    </Link>
                    <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(selected.subject.id)}&moduleId=${encodeURIComponent(selected.module.id)}&from=${encodeURIComponent(selectedModuleUrl)}`} style={{ ...quickActionButtonStyle, textDecoration: 'none', display: 'flex', alignItems: 'center', background: 'rgba(79,70,229,0.28)', border: '1px solid rgba(129,140,248,0.34)' }}>
                      Add lesson in module
                    </Link>
                    <Link href={`/content?view=blocked&subject=${selected.subject.id}&q=${encodeURIComponent(selected.module.title)}`} style={{ ...quickActionButtonStyle, textDecoration: 'none', display: 'flex', alignItems: 'center', background: 'rgba(254,243,199,0.14)', color: '#fde68a', border: '1px solid rgba(252,211,77,0.24)' }}>
                      Clear this blocker stack
                    </Link>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (firstLessonMissingGate) {
                          setSelectedLessonId(firstLessonMissingGate.id);
                          setSelectedAssessmentId(null);
                        }
                      }}
                      disabled={!firstLessonMissingGate}
                      style={{
                        ...quickActionButtonStyle,
                        background: firstLessonMissingGate ? 'rgba(91,33,182,0.24)' : 'rgba(255,255,255,0.05)',
                        border: firstLessonMissingGate ? '1px solid rgba(196,181,253,0.28)' : quickActionButtonStyle.border,
                        color: firstLessonMissingGate ? '#e9d5ff' : '#64748b',
                        cursor: firstLessonMissingGate ? 'pointer' : 'not-allowed',
                        opacity: firstLessonMissingGate ? 1 : 0.6,
                      }}
                    >
                      {firstLessonMissingGate ? `Fix first open gate · ${firstLessonMissingGate.title}` : 'All visible lessons have gates'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (firstLessonNeedingReadiness) {
                          setSelectedLessonId(firstLessonNeedingReadiness.id);
                          setSelectedAssessmentId(null);
                        }
                      }}
                      disabled={!firstLessonNeedingReadiness}
                      style={{
                        ...quickActionButtonStyle,
                        background: firstLessonNeedingReadiness ? 'rgba(14,165,233,0.22)' : 'rgba(255,255,255,0.05)',
                        border: firstLessonNeedingReadiness ? '1px solid rgba(125,211,252,0.24)' : quickActionButtonStyle.border,
                        color: firstLessonNeedingReadiness ? '#bae6fd' : '#64748b',
                        cursor: firstLessonNeedingReadiness ? 'pointer' : 'not-allowed',
                        opacity: firstLessonNeedingReadiness ? 1 : 0.6,
                      }}
                    >
                      {firstLessonNeedingReadiness ? `Open first lesson not ready · ${firstLessonNeedingReadiness.title}` : 'All visible lessons look release-ready'}
                    </button>
                    {selectedModuleGateCount ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (firstAssessmentGate) {
                            setSelectedAssessmentId(firstAssessmentGate.id);
                            setSelectedLessonId(null);
                          }
                        }}
                        style={{
                          ...quickActionButtonStyle,
                          background: 'rgba(237,233,254,0.18)',
                          color: '#ddd6fe',
                          border: '1px solid rgba(196,181,253,0.26)',
                        }}
                      >
                        Inspect first gate · {firstAssessmentGate?.title}
                      </button>
                    ) : (
                      <form action={createCanvasAssessmentQuickAction} style={{ display: 'contents' }}>
                        <input type="hidden" name="subjectId" value={selected.subject.id} />
                        <input type="hidden" name="moduleId" value={selected.module.id} />
                        <input type="hidden" name="moduleTitle" value={selected.module.title} />
                        <input type="hidden" name="returnPath" value={selectedModuleUrl} />
                        <button
                          type="submit"
                          style={{
                            ...quickActionButtonStyle,
                            background: 'rgba(237,233,254,0.18)',
                            color: '#ddd6fe',
                            border: '1px solid rgba(196,181,253,0.26)',
                          }}
                        >
                          Create missing gate draft
                        </button>
                      </form>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const focusLesson = firstLessonMissingGate ?? firstLessonNeedingReadiness;
                        if (focusLesson) {
                          setSelectedLessonId(focusLesson.id);
                          setSelectedAssessmentId(null);
                          return;
                        }
                        if (firstAssessmentGate) {
                          setSelectedAssessmentId(firstAssessmentGate.id);
                          setSelectedLessonId(null);
                        }
                      }}
                      disabled={!firstLessonMissingGate && !firstLessonNeedingReadiness && !firstAssessmentGate}
                      style={{
                        ...quickActionButtonStyle,
                        background: firstLessonMissingGate || firstLessonNeedingReadiness || firstAssessmentGate ? 'rgba(245,158,11,0.16)' : 'rgba(255,255,255,0.05)',
                        border: firstLessonMissingGate || firstLessonNeedingReadiness || firstAssessmentGate ? '1px solid rgba(252,211,77,0.24)' : quickActionButtonStyle.border,
                        color: firstLessonMissingGate || firstLessonNeedingReadiness || firstAssessmentGate ? '#fde68a' : '#64748b',
                        cursor: firstLessonMissingGate || firstLessonNeedingReadiness || firstAssessmentGate ? 'pointer' : 'not-allowed',
                        opacity: firstLessonMissingGate || firstLessonNeedingReadiness || firstAssessmentGate ? 1 : 0.6,
                      }}
                    >
                      Jump to next triage target
                    </button>
                  </div>
                </div>

                <div style={{ padding: 16, borderRadius: 24, background: 'linear-gradient(180deg, rgba(30,41,59,0.94) 0%, rgba(15,23,42,0.96) 100%)', border: '1px solid rgba(129,140,248,0.24)', display: 'grid', gap: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: '#c7d2fe', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Lesson journey</div>
                      <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 900, marginTop: 6 }}>Follow the learning path</div>
                      <div style={{ color: '#cbd5e1', lineHeight: 1.6, marginTop: 6 }}>Tap a lesson node to inspect or edit. Missing slots stay visible as open circles so the lane never lies.</div>
                    </div>
                    <Pill label={`${selectedModuleSlots.length} stops`} tone="#172554" text="#93c5fd" />
                  </div>

                  <div style={{ position: 'relative', display: 'grid', gap: 14, padding: '8px 2px 4px' }}>
                    {selectedModuleSlots.length > 1 ? (
                      <div aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% - 3px)', top: 18, bottom: 18, width: 6, borderRadius: 999, background: 'linear-gradient(180deg, rgba(129,140,248,0.12) 0%, rgba(45,212,191,0.18) 40%, rgba(244,114,182,0.16) 100%)' }} />
                    ) : null}

                    {selectedModuleSlots.map((slot, index) => {
                      const lesson = slot.lesson;
                      const accent = lessonJourneyAccent(index);
                      const offset = index % 2 === 0 ? 34 : -34;
                      const lessonStatus = lesson ? statusTone(lesson.status) : null;
                      const isSelected = lesson ? selectedLessonId === lesson.id : false;
                      const gateLinked = lesson ? Boolean(lesson.assessmentId || lesson.assessmentTitle) : false;
                      return (
                        <div
                          key={`${selected.module.id}-journey-${slot.order}`}
                          style={{
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr)',
                            justifyItems: 'center',
                            paddingLeft: offset > 0 ? `${offset}px` : 0,
                            paddingRight: offset < 0 ? `${Math.abs(offset)}px` : 0,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (lesson) {
                                setSelectedLessonId(lesson.id);
                              }
                            }}
                            style={{
                              width: '100%',
                              maxWidth: 270,
                              background: lesson ? 'rgba(15,23,42,0.82)' : 'rgba(15,23,42,0.52)',
                              border: isSelected ? `1px solid ${accent.solid}` : lesson ? '1px solid rgba(148,163,184,0.16)' : '1px dashed rgba(148,163,184,0.24)',
                              borderRadius: 28,
                              padding: '14px 16px',
                              cursor: lesson ? 'pointer' : 'default',
                              boxShadow: isSelected ? `0 16px 34px ${accent.glow}` : 'none',
                              display: 'grid',
                              gap: 10,
                              justifyItems: 'center',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: 92,
                                height: 92,
                                borderRadius: '50%',
                                background: lesson
                                  ? `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.28) 0%, ${accent.solid} 42%, #0f172a 100%)`
                                  : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12) 0%, rgba(100,116,139,0.34) 55%, rgba(15,23,42,0.92) 100%)',
                                border: lesson ? '4px solid rgba(255,255,255,0.16)' : '2px dashed rgba(148,163,184,0.35)',
                                boxShadow: lesson ? `0 18px 34px ${accent.glow}` : 'none',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#fff',
                                fontSize: lesson ? 32 : 24,
                                fontWeight: 900,
                              }}
                            >
                              {lessonJourneyIcon(lesson)}
                            </div>

                            <div style={{ display: 'grid', gap: 4, width: '100%' }}>
                              <div style={{ color: lesson ? accent.solid : '#94a3b8', fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                                Lesson {slot.order}
                              </div>
                              <div style={{ color: '#f8fafc', fontWeight: 800, lineHeight: 1.4 }}>
                                {lesson?.title ?? `Open lesson slot ${slot.order}`}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                                {lesson ? lessonSummary(lesson) : 'No lesson mapped yet — create a shell or author the real lesson.'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                              {lesson && lessonStatus ? <Pill label={lesson.status} tone={lessonStatus.tone} text={lessonStatus.text} /> : <Pill label="missing" tone="#431407" text="#fdba74" />}
                              <Pill label={gateLinked ? 'Gate linked' : 'Gate open'} tone={gateLinked ? '#052e16' : '#3b0764'} text={gateLinked ? '#86efac' : '#d8b4fe'} />
                            </div>

                            {!lesson ? (
                              <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(selected.subject.id)}&moduleId=${encodeURIComponent(selected.module.id)}&from=${encodeURIComponent(selectedModuleUrl)}`} style={{ ...actionLinkStyle, background: accent.soft, color: '#f8fafc', border: `1px solid ${accent.glow}` }}>
                                Fill this stop
                              </Link>
                            ) : (
                              <div style={{ color: isSelected ? '#e9d5ff' : '#cbd5e1', fontSize: 12, fontWeight: 700 }}>
                                {isSelected ? 'Journey stop open now' : 'Open this stop'}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Lane structure</div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {laneCards(selected.module).map((lane) => (
                      <div key={lane.id} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                          <div style={{ color: '#e2e8f0', fontWeight: 800 }}>{lane.label}</div>
                          <Pill label={lane.value} tone={lane.tone} text={lane.text} />
                        </div>
                        <div style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 14 }}>{lane.note}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <details style={{ borderRadius: 20, border: '1px solid rgba(148,163,184,0.14)', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                  <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '14px 16px', color: '#cbd5e1', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Operator controls</span>
                    <span style={{ color: '#94a3b8', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' }}>Hidden by default</span>
                  </summary>
                  <div style={{ display: 'grid', gap: 14, padding: '0 16px 16px' }}>
                    <div style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Release readout</div>
                      <div style={{ color: selected.module.gapCount ? '#fde68a' : '#bbf7d0', lineHeight: 1.7 }}>{selected.module.blockerSummary}</div>
                    </div>

                    <form action={quickUpdateCanvasModuleAction} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Module quick edit</div>
                      <input type="hidden" name="moduleId" value={selected.module.id} />
                      <input type="hidden" name="returnPath" value={selectedModuleUrl} />
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Title</span>
                        <input name="title" defaultValue={selected.module.title} maxLength={120} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Status</span>
                          <select name="status" defaultValue={selected.module.status} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }}>
                            <option value="draft">Draft</option>
                            <option value="review">Review</option>
                            <option value="published">Published</option>
                            <option value="active">Active</option>
                          </select>
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Level</span>
                          <input name="level" defaultValue={selected.module.level} maxLength={80} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
                        </label>
                        <label style={{ display: 'grid', gap: 6 }}>
                          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Expected lessons</span>
                          <input name="lessonCount" type="number" min="0" max="60" defaultValue={selected.module.lessonCount} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
                        </label>
                      </div>
                      <button type="submit" style={{ ...actionLinkStyle, background: '#0EA5E9', color: '#082f49', border: 0 }}>Save module settings</button>
                    </form>

                    <div style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 18, background: 'rgba(8,47,73,0.18)', border: '1px solid rgba(103,232,249,0.18)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Module sequencing + bulk ops</div>
                          <div style={{ color: '#e2e8f0', lineHeight: 1.6, marginTop: 6 }}>Hidden by default so learners see the journey first, not the plumbing.</div>
                        </div>
                        <Pill label={`${selected.module.lessons.length}/${selected.module.lessonCount} slots mapped`} tone="#082f49" text="#a5f3fc" />
                      </div>

                      <div style={{ display: 'grid', gap: 8 }}>
                        {selectedModuleSlots.map((slot) => {
                          const lesson = slot.lesson;
                          return (
                            <div key={`${selected.module.id}-slot-${slot.order}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 16, background: 'rgba(2,6,23,0.42)', border: '1px solid rgba(148,163,184,0.12)' }}>
                              <div style={{ width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', fontWeight: 900, background: lesson ? 'rgba(79,70,229,0.24)' : 'rgba(148,163,184,0.12)', color: lesson ? '#ddd6fe' : '#cbd5e1' }}>{slot.order}</div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ color: '#f8fafc', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson?.title ?? `Open lesson slot ${slot.order}`}</div>
                                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{lesson ? `Sequence ${lesson.order ?? 'unassigned'} · ${lessonSummary(lesson)}` : 'No lesson mapped yet — create a shell or open the full authoring flow.'}</div>
                              </div>
                              <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                                {lesson ? <Pill label={lesson.status} tone={statusTone(lesson.status).tone} text={statusTone(lesson.status).text} /> : <Pill label="missing" tone="#431407" text="#fdba74" />}
                                {lesson ? (
                                  <button type="button" onClick={() => setSelectedLessonId(lesson.id)} style={{ ...filterButtonStyle, padding: '7px 10px', fontSize: 12, background: 'rgba(79,70,229,0.18)', color: '#e0e7ff' }}>
                                    Inspect slot
                                  </button>
                                ) : (
                                  <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(selected.subject.id)}&moduleId=${encodeURIComponent(selected.module.id)}&from=${encodeURIComponent(selectedModuleUrl)}`} style={{ ...actionLinkStyle, padding: '7px 10px', fontSize: 12, background: '#EDE9FE', color: '#5B21B6' }}>
                                    Fill slot
                                  </Link>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        <form action={bulkUpdateCanvasModuleLessonsAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
                          <div style={{ color: '#cbd5e1', fontWeight: 800 }}>Batch move mapped lessons</div>
                          <input type="hidden" name="moduleId" value={selected.module.id} />
                          <input type="hidden" name="subjectId" value={selected.subject.id} />
                          <input type="hidden" name="moduleTitle" value={selected.module.title} />
                          <input type="hidden" name="returnPath" value={selectedModuleUrl} />
                          {selected.module.lessons.map((lesson) => <input key={lesson.id} type="hidden" name="lessonIds" value={lesson.id} />)}
                          <select name="status" defaultValue={selected.module.lessons.some((lesson) => lesson.status !== 'approved') ? 'approved' : 'review'} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }}>
                            <option value="draft">Move all to draft</option>
                            <option value="review">Move all to review</option>
                            <option value="approved">Move all to approved</option>
                          </select>
                          <button type="submit" style={{ ...actionLinkStyle, background: 'rgba(79,70,229,0.28)', color: '#e0e7ff', border: '1px solid rgba(129,140,248,0.34)' }}>
                            Apply to {selected.module.lessons.length} mapped lesson{selected.module.lessons.length === 1 ? '' : 's'}
                          </button>
                        </form>

                        <form action={createCanvasModuleLessonShellsAction} style={{ display: 'grid', gap: 10, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
                          <div style={{ color: '#cbd5e1', fontWeight: 800 }}>Create missing lesson shells</div>
                          <input type="hidden" name="moduleId" value={selected.module.id} />
                          <input type="hidden" name="subjectId" value={selected.subject.id} />
                          <input type="hidden" name="moduleTitle" value={selected.module.title} />
                          <input type="hidden" name="returnPath" value={selectedModuleUrl} />
                          <input type="hidden" name="missingCount" value={selectedModuleMissingSlots} />
                          <input type="hidden" name="startIndex" value={selected.module.lessons.length} />
                          {selectedModuleLessonShellTitles.map((title) => <input key={title} type="hidden" name="titles" value={title} />)}
                          {selectedModuleMissingOrders.map((order) => <input key={`${selected.module.id}-missing-order-${order}`} type="hidden" name="orders" value={order} />)}
                          <div style={{ color: selectedModuleMissingSlots ? '#e2e8f0' : '#94a3b8', lineHeight: 1.6, fontSize: 14 }}>
                            {selectedModuleMissingSlots
                              ? `${selectedModuleMissingSlots} expected slot${selectedModuleMissingSlots === 1 ? '' : 's'} are still empty. This creates draft shells in one hit so authors stop hand-building obvious placeholders.`
                              : 'No empty slots left. Good. Go fix real content instead of creating junk.'}
                          </div>
                          <button type="submit" disabled={!selectedModuleMissingSlots} style={{ ...actionLinkStyle, background: selectedModuleMissingSlots ? '#EDE9FE' : 'rgba(148,163,184,0.18)', color: selectedModuleMissingSlots ? '#5B21B6' : '#94a3b8', border: 0, opacity: selectedModuleMissingSlots ? 1 : 0.7, cursor: selectedModuleMissingSlots ? 'pointer' : 'not-allowed' }}>
                            {selectedModuleMissingSlots ? `Create ${selectedModuleMissingSlots} draft shell${selectedModuleMissingSlots === 1 ? '' : 's'}` : 'Module already fully mapped'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </details>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Assessment gates</div>
                      <div style={{ color: '#64748b', fontSize: 12 }}>Quick gate triage</div>
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {selected.module.assessments.length ? selected.module.assessments.map((assessment) => (
                        <AssessmentNode
                          key={assessment.id}
                          assessment={assessment}
                          selected={selectedAssessmentId === assessment.id}
                          onInspect={() => setSelectedAssessmentId(assessment.id)}
                          returnPath={panelUrl(selectedModuleUrl, 'assessment', assessment.id)}
                        />
                      )) : <div style={{ color: '#fbbf24', lineHeight: 1.6 }}>No gate linked. That module is not truly release-ready yet.</div>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <CanvasEmptyState failedSources={failedSources} compact />
            )}
          </aside>
        </div>
      )}

      {selected && selectedLesson ? (
        <LessonInspectorModal
          lesson={selectedLesson}
          subjectId={selected.subject.id}
          moduleId={selected.module.id}
          moduleAssessments={selected.module.assessments}
          returnPath={panelUrl(selectedModuleUrl, 'lesson', selectedLesson.id)}
          quickUpdateLessonStatusAction={quickUpdateLessonStatusAction}
          quickUpdateCanvasLessonAction={quickUpdateCanvasLessonAction}
          quickLinkCanvasLessonAssessmentAction={quickLinkCanvasLessonAssessmentAction}
          onClose={() => setSelectedLessonId(null)}
        />
      ) : null}

      {selected && selectedAssessment ? (
        <AssessmentInspectorModal
          assessment={selectedAssessment}
          subjectId={selected.subject.id}
          moduleTitle={selected.module.title}
          returnPath={panelUrl(selectedModuleUrl, 'assessment', selectedAssessment.id)}
          quickUpdateAssessmentStatusAction={quickUpdateAssessmentStatusAction}
          quickUpdateCanvasAssessmentAction={quickUpdateCanvasAssessmentAction}
          onClose={() => setSelectedAssessmentId(null)}
        />
      ) : null}

      <style>{`
        @media (max-width: 1180px) {
          .curriculum-canvas__filters {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 1080px) {
          .curriculum-canvas__grid {
            grid-template-columns: minmax(0, 1fr);
          }

          aside {
            position: static !important;
          }
        }

        @media (max-width: 760px) {
          .curriculum-canvas__filters,
          .curriculum-canvas__grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </section>
  );
}

function CanvasEmptyState({ failedSources, compact = false, searchAware = false }: { failedSources: string[]; compact?: boolean; searchAware?: boolean }) {
  return (
    <section style={{ padding: compact ? 0 : 24, borderRadius: compact ? 0 : 28, background: compact ? 'transparent' : 'linear-gradient(180deg, rgba(2,6,23,0.98) 0%, rgba(15,23,42,0.96) 100%)', border: compact ? '0' : '1px solid rgba(99,102,241,0.16)', color: '#e2e8f0' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{searchAware ? 'Canvas filter result' : 'Canvas V1 fallback'}</div>
          <div style={{ fontSize: compact ? 22 : 28, fontWeight: 900, color: '#f8fafc' }}>{searchAware ? 'Nothing matches the current filter stack.' : 'The route works. The data spine doesn’t.'}</div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.7, marginTop: 8 }}>
            {searchAware
              ? 'Try widening the search, removing subject/readiness filters, or jump straight into the operational boards below.'
              : failedSources.length
                ? `Live curriculum feeds are degraded right now: ${failedSources.join(', ')}.`
                : 'Subjects, strands, or modules are not returning a complete chain yet, so the canvas cannot draw the live graph.'}
            {!searchAware ? ' Use the real authoring surfaces below instead of staring at an empty page like it insulted your family.' : ''}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { label: 'Open content board', href: '/content', note: 'See the full curriculum library and filter by module, subject, or blockers.', background: '#ffffff', color: '#0f172a' },
            { label: 'Create a lesson', href: '/content/lessons/new?from=%2Fcanvas', note: 'Jump straight into authoring instead of waiting for the graph to fill in.', background: '#4F46E5', color: '#ffffff' },
            { label: 'Review blockers', href: '/content?view=blocked', note: 'Find modules missing ready lessons or assessment gates.', background: '#FEF3C7', color: '#92400E' },
            { label: 'Open assessments', href: '/assessments', note: 'Manage progression gates and release readiness from the real board.', background: '#EDE9FE', color: '#5B21B6' },
          ].map((item) => (
            <div key={item.label} style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,0.72)', border: '1px solid rgba(148,163,184,0.16)', display: 'grid', gap: 12 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 800 }}>{item.label}</div>
              <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 14 }}>{item.note}</div>
              <Link href={item.href} style={{ ...actionLinkStyle, background: item.background, color: item.color }}>Go now</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LessonNode({ lesson, selected, onInspect, returnPath }: { lesson: CurriculumCanvasLesson; selected?: boolean; onInspect: () => void; returnPath: string }) {
  const pill = statusTone(lesson.status);
  return (
    <div style={{ padding: 14, borderRadius: 18, background: selected ? 'rgba(79,70,229,0.14)' : 'rgba(255,255,255,0.05)', border: selected ? '1px solid rgba(129,140,248,0.34)' : '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <strong>{lesson.title}</strong>
        <Pill label={lesson.status} tone={pill.tone} text={pill.text} />
      </div>
      <div style={{ color: '#cbd5e1' }}>{lessonSummary(lesson)}</div>
      <div style={{ color: lesson.assessmentTitle ? '#ddd6fe' : '#fbbf24', fontSize: 13, lineHeight: 1.5 }}>
        {lesson.assessmentTitle ? `Linked gate: ${lesson.assessmentTitle}` : 'No linked assessment gate yet'}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onInspect} style={{ ...filterButtonStyle, background: selected ? '#4F46E5' : 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>{selected ? 'Inspecting now' : 'Inspect & edit'}</button>
        <Link href={`/content/lessons/${lesson.id}?from=${encodeURIComponent(returnPath)}`} style={{ color: 'white', fontWeight: 800, textDecoration: 'none' }}>Open lesson →</Link>
        <Link href={`/content/lessons/new?duplicate=${lesson.id}&from=${encodeURIComponent(returnPath)}`} style={{ color: '#c4b5fd', fontWeight: 800, textDecoration: 'none' }}>Duplicate →</Link>
      </div>
    </div>
  );
}

function AssessmentNode({ assessment, selected, onInspect, returnPath }: { assessment: Assessment; selected?: boolean; onInspect: () => void; returnPath: string }) {
  const pill = statusTone(assessment.status);
  return (
    <div style={{ padding: 14, borderRadius: 18, background: selected ? 'rgba(79,70,229,0.14)' : 'rgba(255,255,255,0.05)', border: selected ? '1px solid rgba(129,140,248,0.34)' : '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <strong>{assessment.title}</strong>
        <Pill label={assessment.status} tone={pill.tone} text={pill.text} />
      </div>
      <div style={{ color: '#cbd5e1', lineHeight: 1.5 }}>{assessmentLabel(assessment)}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onInspect} style={{ ...filterButtonStyle, background: selected ? '#4F46E5' : 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>{selected ? 'Inspecting now' : 'Inspect gate'}</button>
        <Link href={`/assessments?from=${encodeURIComponent(returnPath)}`} style={{ color: '#ddd6fe', fontWeight: 800, textDecoration: 'none' }}>Open assessments →</Link>
      </div>
    </div>
  );
}

function ModalShell({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(2,6,23,0.74)', backdropFilter: 'blur(6px)', padding: 'clamp(16px, 4vw, 28px)', display: 'grid', placeItems: 'center' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', borderRadius: 28, background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,1) 100%)', border: '1px solid rgba(99,102,241,0.24)', boxShadow: '0 28px 60px rgba(2,6,23,0.4)', padding: 22, display: 'grid', gap: 16 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>{eyebrow}</div>
            <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900 }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} style={{ ...filterButtonStyle, background: 'rgba(255,255,255,0.05)', color: '#f8fafc' }}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LessonInspectorModal({ lesson, subjectId, moduleId, moduleAssessments, returnPath, quickUpdateLessonStatusAction, quickUpdateCanvasLessonAction, quickLinkCanvasLessonAssessmentAction, onClose }: { lesson: CurriculumCanvasLesson; subjectId: string; moduleId: string; moduleAssessments: Assessment[]; returnPath: string; quickUpdateLessonStatusAction: (formData: FormData) => void; quickUpdateCanvasLessonAction: (formData: FormData) => void; quickLinkCanvasLessonAssessmentAction: (formData: FormData) => void; onClose: () => void }) {
  const pill = statusTone(lesson.status);
  return (
    <ModalShell title={lesson.title} eyebrow="Lesson quick edit lane" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill label={lesson.status} tone={pill.tone} text={pill.text} />
        <Pill label={`${lesson.durationMinutes} min`} tone="#082f49" text="#a5f3fc" />
        <Pill label={lesson.mode} tone="#172554" text="#93c5fd" />
        <Pill label={lesson.assessmentTitle ? 'Gate linked' : 'Gate missing'} tone={lesson.assessmentTitle ? '#052e16' : '#3b2f0d'} text={lesson.assessmentTitle ? '#86efac' : '#fcd34d'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {[
          ['Sequence slot', lesson.order ? String(lesson.order) : 'Unassigned'],
          ['Objectives', String(lesson.objectiveCount ?? 0)],
          ['Activities', String(lesson.activityCount ?? 0)],
          ['Module link', lesson.assessmentId || lesson.assessmentTitle ? 'Connected' : 'Needs triage'],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>{label}</div>
            <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 900, marginTop: 8 }}>{value}</div>
          </div>
        ))}
      </div>

      <details style={{ borderRadius: 18, border: '1px solid rgba(129,140,248,0.24)', background: 'rgba(79,70,229,0.12)', overflow: 'hidden' }}>
        <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '14px 16px', color: '#c7d2fe', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Operator readout</span>
          <span style={{ color: '#cbd5e1', fontSize: 11 }}>Hidden by default</span>
        </summary>
        <div style={{ padding: '0 16px 16px', color: '#e2e8f0', lineHeight: 1.7 }}>
          {lesson.assessmentTitle
            ? `This lesson already maps to ${lesson.assessmentTitle}. If the content is wrong, edit the lesson body rather than creating another orphaned gate.`
            : 'This lesson is still floating without a linked assessment gate. That is the kind of tiny operational mess that turns into release chaos later.'}
        </div>
      </details>

      <div style={{ display: 'grid', gap: 10, padding: 16, borderRadius: 18, background: 'rgba(8,47,73,0.18)', border: '1px solid rgba(103,232,249,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#a5f3fc', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Gate options in this module</div>
            <div style={{ color: '#e2e8f0', lineHeight: 1.6, marginTop: 6 }}>The canvas now shows the actual gates already attached to this module, and this panel can link or clear the lesson gate without forcing a detour into the full lesson editor.</div>
          </div>
          <Pill label={moduleAssessments.length ? `${moduleAssessments.length} visible gate${moduleAssessments.length === 1 ? '' : 's'}` : 'No gate exists yet'} tone="#082f49" text="#a5f3fc" />
        </div>
        {moduleAssessments.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {moduleAssessments.map((assessment) => {
              const linked = lesson.assessmentId === assessment.id || lesson.assessmentTitle === assessment.title;
              return (
                <div key={assessment.id} style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(2,6,23,0.36)', border: linked ? '1px solid rgba(134,239,172,0.32)' : '1px solid rgba(148,163,184,0.12)', display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ color: '#f8fafc', fontWeight: 800 }}>{assessment.title}</div>
                    <Pill label={assessment.status} tone={statusTone(assessment.status).tone} text={statusTone(assessment.status).text} />
                  </div>
                  <div style={{ color: '#cbd5e1', lineHeight: 1.6, fontSize: 14 }}>{assessmentLabel(assessment)}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Link href={`/assessments?subject=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(assessment.title)}`} style={{ color: '#a5f3fc', fontWeight: 800, textDecoration: 'none' }}>
                      Open gate search →
                    </Link>
                    <form action={quickLinkCanvasLessonAssessmentAction}>
                      <input type="hidden" name="lessonId" value={lesson.id} />
                      <input type="hidden" name="assessmentId" value={assessment.id} />
                      <input type="hidden" name="assessmentTitle" value={assessment.title} />
                      <input type="hidden" name="returnPath" value={returnPath} />
                      <button type="submit" style={{ ...filterButtonStyle, background: linked ? 'rgba(22,101,52,0.28)' : 'rgba(79,70,229,0.18)', color: '#f8fafc', border: linked ? '1px solid rgba(134,239,172,0.34)' : '1px solid rgba(129,140,248,0.34)' }}>
                        {linked ? 'Linked here' : 'Link this gate'}
                      </button>
                    </form>
                    {linked ? (
                      <span style={{ color: '#86efac', fontWeight: 800, fontSize: 13 }}>Currently the visible linked gate</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: '#cbd5e1', lineHeight: 1.7 }}>There is nothing to link this lesson to yet. Create the draft gate from the module rail first, then come back and finish the lesson properly.</div>
        )}

        {lesson.assessmentTitle ? (
          <form action={quickLinkCanvasLessonAssessmentAction} style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <input type="hidden" name="assessmentId" value="" />
            <input type="hidden" name="assessmentTitle" value="" />
            <input type="hidden" name="returnPath" value={returnPath} />
            <button type="submit" style={{ ...filterButtonStyle, background: 'rgba(127,29,29,0.18)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.28)' }}>
              Clear visible gate link
            </button>
          </form>
        ) : null}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Inline status ops</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['draft', 'review', 'approved'].map((nextStatus) => (
            <form key={nextStatus} action={quickUpdateLessonStatusAction}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <button type="submit" style={{ ...filterButtonStyle, background: lesson.status === nextStatus ? '#4F46E5' : 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                Mark {nextStatus}
              </button>
            </form>
          ))}
        </div>
      </div>

      <form action={quickUpdateCanvasLessonAction} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
        <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Safe inline edit</div>
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Lesson title</span>
          <input name="title" defaultValue={lesson.title} maxLength={120} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Status</span>
            <select name="status" defaultValue={lesson.status} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }}>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Mode</span>
            <select name="mode" defaultValue={lesson.mode} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }}>
              <option value="guided">Guided</option>
              <option value="group">Group</option>
              <option value="independent">Independent</option>
              <option value="practice">Practice</option>
              <option value="ops">Ops</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Sequence slot</span>
            <input name="order" type="number" min="1" max="60" defaultValue={lesson.order ?? ''} placeholder="Set slot" style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Duration (min)</span>
            <input name="durationMinutes" type="number" min="1" max="240" defaultValue={lesson.durationMinutes} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
          </label>
        </div>
        <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 13 }}>This only edits the safe metadata operators usually need mid-triage. If the actual lesson body is wrong, open the full editor and fix it properly.</div>
        <button type="submit" style={{ ...actionLinkStyle, background: '#4F46E5', color: '#ffffff', border: 0 }}>Save inline lesson edits</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <Link href={`/content/lessons/${lesson.id}?from=${encodeURIComponent(returnPath)}`} style={{ ...actionLinkStyle, background: '#ffffff', color: '#0f172a' }}>Open lesson editor</Link>
        <Link href={`/content/lessons/new?duplicate=${lesson.id}&subjectId=${encodeURIComponent(subjectId)}&moduleId=${encodeURIComponent(moduleId)}&from=${encodeURIComponent(returnPath)}`} style={{ ...actionLinkStyle, background: '#EDE9FE', color: '#5B21B6' }}>Duplicate into module</Link>
        <Link href={`/content/lessons/new?subjectId=${encodeURIComponent(subjectId)}&moduleId=${encodeURIComponent(moduleId)}&from=${encodeURIComponent(returnPath)}`} style={{ ...actionLinkStyle, background: '#4F46E5', color: '#ffffff' }}>Create sibling lesson</Link>
        <Link href={`/assessments?subject=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(lesson.assessmentTitle ?? lesson.title)}`} style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>{lesson.assessmentTitle ? 'Review linked gate' : 'Link a gate now'}</Link>
      </div>
    </ModalShell>
  );
}

function AssessmentInspectorModal({ assessment, subjectId, moduleTitle, returnPath, quickUpdateAssessmentStatusAction, quickUpdateCanvasAssessmentAction, onClose }: { assessment: Assessment; subjectId: string; moduleTitle: string; returnPath: string; quickUpdateAssessmentStatusAction: (formData: FormData) => void; quickUpdateCanvasAssessmentAction: (formData: FormData) => void; onClose: () => void }) {
  const pill = statusTone(assessment.status);
  return (
    <ModalShell title={assessment.title} eyebrow="Assessment quick triage" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Pill label={assessment.status} tone={pill.tone} text={pill.text} />
        <Pill label={assessment.triggerLabel} tone="#082f49" text="#a5f3fc" />
        <Pill label={`${Math.round(assessment.passingScore * 100)}% pass`} tone="#3b0764" text="#d8b4fe" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {[
          ['Progression gate', assessment.progressionGate],
          ['Subject scope', subjectId],
          ['Module search', moduleTitle],
        ].map(([label, value]) => (
          <div key={label} style={{ padding: 14, borderRadius: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1 }}>{label}</div>
            <div style={{ color: '#f8fafc', fontSize: 18, fontWeight: 900, marginTop: 8, lineHeight: 1.4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: 14, borderRadius: 18, background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(129,140,248,0.24)', display: 'grid', gap: 8 }}>
        <div style={{ color: '#c7d2fe', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Gate sanity check</div>
        <div style={{ color: '#e2e8f0', lineHeight: 1.7 }}>
          This gate is attached to the selected module context. Use the assessments board for real edits, but this modal makes it obvious whether the gate is actually fit for progression or just technically present.
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Inline gate ops</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['draft', 'review', 'active'].map((nextStatus) => (
            <form key={nextStatus} action={quickUpdateAssessmentStatusAction}>
              <input type="hidden" name="assessmentId" value={assessment.id} />
              <input type="hidden" name="status" value={nextStatus} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <button type="submit" style={{ ...filterButtonStyle, background: assessment.status === nextStatus ? '#4F46E5' : 'rgba(255,255,255,0.04)', color: '#f8fafc' }}>
                Mark {nextStatus}
              </button>
            </form>
          ))}
        </div>
      </div>

      <form action={quickUpdateCanvasAssessmentAction} style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.14)' }}>
        <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Safe inline gate edit</div>
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="returnPath" value={returnPath} />
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Gate title</span>
          <input name="title" defaultValue={assessment.title} maxLength={120} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Status</span>
            <select name="status" defaultValue={assessment.status} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }}>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="active">Active</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Passing score</span>
            <input name="passingScore" type="number" min="0" max="1" step="0.01" defaultValue={assessment.passingScore} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Trigger label</span>
            <input name="triggerLabel" defaultValue={assessment.triggerLabel} maxLength={120} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#cbd5e1', fontSize: 13, fontWeight: 700 }}>Progression gate</span>
            <input name="progressionGate" defaultValue={assessment.progressionGate} maxLength={80} style={{ borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.88)', color: '#f8fafc' }} />
          </label>
        </div>
        <div style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 13 }}>This keeps common gate corrections inside the canvas. If trigger type or broader assessment logic needs surgery, use the full assessments board.</div>
        <button type="submit" style={{ ...actionLinkStyle, background: '#EDE9FE', color: '#5B21B6', border: 0 }}>Save inline gate edits</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        <Link href={`/assessments?subject=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(moduleTitle)}`} style={{ ...actionLinkStyle, background: '#ffffff', color: '#0f172a' }}>Open assessment board</Link>
        <Link href={`/content?subject=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(moduleTitle)}`} style={{ ...actionLinkStyle, background: '#EDE9FE', color: '#5B21B6' }}>Open related module work</Link>
        <Link href={`/content?view=blocked&subject=${encodeURIComponent(subjectId)}&q=${encodeURIComponent(moduleTitle)}`} style={{ ...actionLinkStyle, background: '#FEF3C7', color: '#92400E' }}>See blockers around this gate</Link>
      </div>
    </ModalShell>
  );
}
