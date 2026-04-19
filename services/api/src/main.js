const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const store = require('./store');
const presenters = require('./presenters');
const validators = require('./validators');
const reporting = require('./reporting');
const rewards = require('./rewards');
const seed = require('./seed');
const { buildAllowedOrigins, isLoopbackOrigin, isProductionLike, buildConfigAudit } = require('./config-audit');
const { getDbMode, getDbModeMeta } = require('./db-mode');
const { getActor, requireRole, getAuthAudit } = require('./auth');

const app = express();
const assetUploadRoot = path.resolve(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(assetUploadRoot, { recursive: true });

function sanitizeAssetFileName(value) {
  return String(value || 'asset').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'asset';
}

function buildAssetFileUrl(req, storagePath) {
  const normalized = String(storagePath || '').replace(/\\/g, '/');
  const marker = '/data/uploads/';
  const relative = normalized.includes(marker) ? normalized.split(marker)[1] : path.basename(normalized);
  return `${req.protocol}://${req.get('host')}/media/${relative}`;
}


function readPositiveIntEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getClientAddress(req) {
  const forwardedFor = String(req.header('x-forwarded-for') || '').split(',')[0].trim();
  return forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
}

function buildThrottleMiddleware({
  bucket,
  windowMs,
  maxRequests,
  keyFn = (req) => getClientAddress(req),
  skip = () => false,
}) {
  const entries = new Map();

  return (req, res, next) => {
    const resolvedWindowMs = typeof windowMs === 'function' ? Number(windowMs(req)) : Number(windowMs);
    const resolvedMaxRequests = typeof maxRequests === 'function' ? Number(maxRequests(req)) : Number(maxRequests);

    if (skip(req) || resolvedMaxRequests <= 0 || resolvedWindowMs <= 0) {
      return next();
    }

    const now = Date.now();
    const subject = String(keyFn(req) || 'anonymous');
    const key = `${bucket}:${subject}`;
    const current = entries.get(key);

    if (!current || current.resetAt <= now) {
      entries.set(key, { count: 1, resetAt: now + resolvedWindowMs });
      res.setHeader('RateLimit-Limit', String(resolvedMaxRequests));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, resolvedMaxRequests - 1)));
      res.setHeader('RateLimit-Reset', String(Math.ceil((now + resolvedWindowMs) / 1000)));
      return next();
    }

    if (current.count >= resolvedMaxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.setHeader('RateLimit-Limit', String(resolvedMaxRequests));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
      return res.status(429).json({
        message: 'Too many requests. Slow down and retry shortly.',
        throttle: {
          bucket,
          scope: subject,
          retryAfterSeconds,
        },
      });
    }

    current.count += 1;
    entries.set(key, current);
    res.setHeader('RateLimit-Limit', String(resolvedMaxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, resolvedMaxRequests - current.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));
    return next();
  };
}

const learnerSyncThrottle = buildThrottleMiddleware({
  bucket: 'learner-sync',
  windowMs: () => readPositiveIntEnv('LUMO_SYNC_THROTTLE_WINDOW_MS', 60_000),
  maxRequests: () => readPositiveIntEnv('LUMO_SYNC_THROTTLE_MAX_REQUESTS', 120),
  keyFn: (req) => req.header('x-lumo-client-id') || req.header('x-lumo-sync-batch') || getClientAddress(req),
});

const learnerRewardRequestThrottle = buildThrottleMiddleware({
  bucket: 'learner-reward-request',
  windowMs: () => readPositiveIntEnv('LUMO_REWARD_REQUEST_THROTTLE_WINDOW_MS', 60_000),
  maxRequests: () => readPositiveIntEnv('LUMO_REWARD_REQUEST_THROTTLE_MAX_REQUESTS', 12),
  keyFn: (req) => req.body?.learnerId || req.body?.learnerCode || req.query?.learnerId || req.query?.learnerCode || req.header('x-lumo-client-id') || getClientAddress(req),
});

const adminMutationThrottle = buildThrottleMiddleware({
  bucket: 'admin-mutation',
  windowMs: () => readPositiveIntEnv('LUMO_ADMIN_MUTATION_THROTTLE_WINDOW_MS', 60_000),
  maxRequests: () => readPositiveIntEnv('LUMO_ADMIN_MUTATION_THROTTLE_MAX_REQUESTS', 90),
  keyFn: (req) => `${req.actor?.role || req.header('x-lumo-role') || 'anonymous'}:${req.actor?.name || req.header('x-lumo-actor') || req.header('x-lumo-user') || getClientAddress(req)}`,
});

function protectedMutation(allowedRoles, ...middleware) {
  return [requireRole(allowedRoles), adminMutationThrottle, ...middleware];
}

const dangerousAdminMutationIdempotencyCache = new Map();

function getDangerousAdminMutationIdempotencyRecord(cacheKey) {
  const record = dangerousAdminMutationIdempotencyCache.get(cacheKey);
  if (!record) return null;

  if (record.expiresAt <= Date.now()) {
    dangerousAdminMutationIdempotencyCache.delete(cacheKey);
    return null;
  }

  return record;
}

function shouldEnforceDangerousAdminMutationGuard() {
  const authAudit = getAuthAudit();
  return authAudit.productionLike || authAudit.hasAnyConfiguredKey;
}

function requireConfirmedDangerousAdminMutation(action) {
  return (req, res, next) => {
    if (!shouldEnforceDangerousAdminMutationGuard()) {
      return next();
    }

    const confirmation = String(req.header('x-lumo-confirm-action') || '').trim();
    const idempotencyKey = String(req.header('idempotency-key') || req.header('x-idempotency-key') || '').trim();

    if (confirmation !== action) {
      return res.status(428).json({
        message: `Missing confirmation header for dangerous admin action: ${action}`,
        required: {
          confirmationHeader: 'x-lumo-confirm-action',
          confirmationValue: action,
          idempotencyHeader: 'idempotency-key',
        },
      });
    }

    if (!idempotencyKey) {
      return res.status(428).json({
        message: 'Missing idempotency key for dangerous admin action.',
        required: {
          confirmationHeader: 'x-lumo-confirm-action',
          confirmationValue: action,
          idempotencyHeader: 'idempotency-key',
        },
      });
    }

    const ttlMs = readPositiveIntEnv('LUMO_DANGEROUS_ADMIN_IDEMPOTENCY_TTL_MS', 10 * 60_000);
    const now = Date.now();

    const scope = `${req.actor?.role || 'anonymous'}:${req.actor?.name || getClientAddress(req)}`;
    const cacheKey = `${action}:${scope}:${idempotencyKey}`;
    const existingRecord = getDangerousAdminMutationIdempotencyRecord(cacheKey);
    if (existingRecord) {
      return res.status(409).json({
        message: 'Duplicate dangerous admin mutation blocked by idempotency guard.',
        action,
        idempotencyKey,
        state: existingRecord.state,
      });
    }

    dangerousAdminMutationIdempotencyCache.set(cacheKey, {
      action,
      idempotencyKey,
      state: 'pending',
      createdAt: now,
      expiresAt: now + ttlMs,
    });

    let finalized = false;
    const finalizeIdempotency = () => {
      if (finalized) return;
      finalized = true;

      const currentRecord = dangerousAdminMutationIdempotencyCache.get(cacheKey);
      if (!currentRecord) return;

      if (res.statusCode >= 200 && res.statusCode < 400) {
        dangerousAdminMutationIdempotencyCache.set(cacheKey, {
          ...currentRecord,
          state: 'completed',
          completedAt: Date.now(),
          expiresAt: Date.now() + ttlMs,
        });
        return;
      }

      dangerousAdminMutationIdempotencyCache.delete(cacheKey);
    };

    res.once('finish', finalizeIdempotency);
    res.once('close', finalizeIdempotency);
    res.setHeader('x-lumo-confirmed-action', action);
    res.setHeader('x-lumo-idempotency-key', idempotencyKey);
    return next();
  };
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  const allowAnyOrigin = (process.env.LUMO_CORS_ALLOW_ANY_ORIGIN || '').toLowerCase() === 'true';
  const allowedOrigins = buildAllowedOrigins();

  if (!requestOrigin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (allowAnyOrigin || isLoopbackOrigin(requestOrigin) || allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Headers', [
    'Content-Type',
    'Accept',
    'Origin',
    'Authorization',
    'x-lumo-api-key',
    'x-lumo-role',
    'x-lumo-user',
    'x-lumo-actor',
    'x-lumo-sync-batch',
    'x-lumo-client-id',
    'x-lumo-confirm-action',
    'idempotency-key',
    'x-idempotency-key',
    'x-request-id',
  ].join(', '));
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Expose-Headers', 'x-lumo-sync-accepted, x-lumo-sync-ignored, x-lumo-confirmed-action, x-lumo-idempotency-key, x-request-id');
  res.header('Access-Control-Max-Age', '86400');
}

app.use((req, res, next) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.use((req, res, next) => {
  const requestId = String(req.header('x-request-id') || '').trim() || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: process.env.LUMO_JSON_BODY_LIMIT || '25mb' }));
app.use('/media', express.static(assetUploadRoot, { fallthrough: false }));

app.use((req, _res, next) => {
  req.actor = getActor(req);
  next();
});

function getDefaultRegistrationTarget() {
  const cohort = store.listCohorts()[0] || null;
  const mallam = cohort
    ? store.listTeachers().find((teacher) => (teacher.podIds || []).includes(cohort.podId)) || store.listTeachers()[0] || null
    : store.listTeachers()[0] || null;

  return { cohort, mallam };
}

function buildRegistrationContext() {
  const cohorts = store.listCohorts();
  const mallams = store.listTeachers().map(presenters.presentMallam);
  const target = getDefaultRegistrationTarget();

  return {
    cohorts,
    mallams,
    defaultTarget: {
      cohortId: target.cohort?.id ?? null,
      podId: target.cohort?.podId ?? null,
      mallamId: target.mallam?.id ?? null,
    },
  };
}

function normalizeLearnerAppStudentPayload(body = {}) {
  const defaultTarget = getDefaultRegistrationTarget();

  return {
    ...body,
    name: body.fullName || body.name,
    gender: body.gender || (body.sex === 'Boy' ? 'male' : body.sex === 'Girl' ? 'female' : undefined),
    cohortId: body.cohortId || defaultTarget.cohort?.id,
    podId: body.podId || body.cohort?.podId || defaultTarget.cohort?.podId,
    mallamId: body.mallamId || defaultTarget.mallam?.id,
    guardianName: body.guardian?.name || body.guardianName,
    guardianPhone: body.guardian?.phone || body.guardianPhone,
    caregiverRelationship: body.guardian?.relationship || body.caregiverRelationship,
    preferredLanguage: body.placement?.preferredLanguage || body.preferredLanguage,
    consentCaptured: body.consentCaptured,
    supportPlan: body.placement?.supportPlan || body.supportPlan,
    village: body.village,
    level: body.level || (body.placement?.readinessLabel === 'Confident responder'
      ? 'confident'
      : body.placement?.readinessLabel === 'Ready for guided practice'
        ? 'emerging'
        : 'beginner'),
    stage: body.stage || body.placement?.baselineLevel || 'foundation-a',
    deviceAccess: body.deviceAccess || 'shared-tablet',
  };
}

function findStudentByLearnerCode(learnerCode) {
  if (!learnerCode) return null;

  return store
    .listStudents()
    .find((student) => presenters.presentLearnerProfile(student).learnerCode === learnerCode) || null;
}

function buildLearnerAssignmentIndex() {
  return store
    .listAssignments()
    .filter((assignment) => assignment.status === 'active')
    .map(presenters.presentLearnerAssignmentPack);
}

function buildLearnerLessons({ includeAssigned = false } = {}) {
  const assignedLessonIds = includeAssigned
    ? new Set(
        store
          .listAssignments()
          .filter((assignment) => ['active', 'scheduled'].includes(assignment.status))
          .map((assignment) => assignment.lessonId)
          .filter(Boolean),
      )
    : new Set();

  return store
    .listLessons()
    .filter((lesson) => ['approved', 'published'].includes(lesson.status) || assignedLessonIds.has(lesson.id))
    .map(presenters.presentLearnerLesson);
}

function buildLearnerAssessments() {
  return store
    .listAssessments()
    .filter((assessment) => assessment.status === 'active')
    .map(presenters.presentAssessment);
}

function buildLearnerModules({ includeAssigned = false } = {}) {
  const assignedModuleIds = includeAssigned
    ? new Set(
        store
          .listAssignments()
          .filter((assignment) => ['active', 'scheduled'].includes(assignment.status))
          .map((assignment) => store.findLessonById(assignment.lessonId)?.moduleId)
          .filter(Boolean),
      )
    : new Set();

  return store
    .listModules()
    .filter((module) => module.status === 'published' || assignedModuleIds.has(module.id))
    .map(presenters.presentLearnerModule);
}

function buildLearnerAppBootstrap() {
  const learners = store.listStudents().map(presenters.presentLearnerProfile);
  const modules = buildLearnerModules({ includeAssigned: true });
  const lessons = buildLearnerLessons({ includeAssigned: true });
  const assignments = buildLearnerAssignmentIndex();
  const assessments = buildLearnerAssessments();
  const lastSync = store.listSyncEvents().slice(-1)[0] || null;

  return {
    learners,
    modules,
    lessons,
    assignments,
    assignmentPacks: assignments,
    assessments,
    registrationContext: buildRegistrationContext(),
    sync: {
      acceptedEventCount: store.listSyncEvents().length,
      lastCursor: lastSync?.id ?? null,
      supports: ['idempotent-client-event-id', 'batch-receipts', 'progress-upsert', 'rewards-on-sync'],
    },
    rewards: {
      catalog: rewards.buildRewardsCatalog(),
      leaderboard: rewards.buildLeaderboard(5),
    },
    meta: {
      learnerCount: learners.length,
      moduleCount: modules.length,
      lessonCount: lessons.length,
      assignmentCount: assignments.length,
      assignmentPackCount: assignments.length,
      assessmentCount: assessments.length,
      generatedAt: new Date().toISOString(),
      contractVersion: 'learner-app-v2.3',
      supports: ['cors-local-origins', 'assignment-index', 'sync-dedupe', 'progress-upsert', 'lesson-localization', 'assessment-packs', 'learner-rewards'],
    },
  };
}


function coerceOptionalString(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function coerceOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveStudentScope({ learnerId = null, learnerCode = null } = {}) {
  return learnerId
    ? store.findStudentById(String(learnerId))
    : learnerCode
      ? findStudentByLearnerCode(String(learnerCode))
      : null;
}

function buildProgressionOverrideResponse(record) {
  const progress = record.progressId ? store.findProgressById(record.progressId) : null;
  return {
    ...record,
    progress: progress ? presenters.presentProgress(progress) : null,
  };
}


const CURRICULUM_CANVAS_ALLOWED_CHILDREN = {
  root: ['subject'],
  subject: ['strand'],
  strand: ['module'],
  module: ['lesson', 'assessment'],
};

function sortByOrderThenName(items = []) {
  return items.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || a.name || a.id).localeCompare(String(b.title || b.name || b.id)));
}

function findStrandById(id) {
  return store.listStrands().find((item) => item.id === id) || null;
}

function findModuleById(id) {
  return store.listModules().find((item) => item.id === id) || null;
}

function findAssessmentById(id) {
  return store.listAssessments().find((item) => item.id === id) || null;
}

function requireCurriculumNode(nodeType, nodeId) {
  if (nodeType === 'root') {
    return { id: 'root', nodeType: 'root', title: 'Curriculum Canvas' };
  }

  const finders = {
    subject: (id) => store.listSubjects().find((item) => item.id === id) || null,
    strand: findStrandById,
    module: findModuleById,
    lesson: store.findLessonById,
    assessment: findAssessmentById,
  };

  const node = finders[nodeType] ? finders[nodeType](nodeId) : null;
  if (!node) {
    const error = new Error(`${nodeType} not found`);
    error.statusCode = 404;
    throw error;
  }
  return node;
}

function getCurriculumNodeParent(nodeType, node) {
  if (nodeType === 'subject') return { parentType: 'root', parentId: null };
  if (nodeType === 'strand') return { parentType: 'subject', parentId: node.subjectId };
  if (nodeType === 'module') return { parentType: 'strand', parentId: node.strandId };
  if (nodeType === 'lesson' || nodeType === 'assessment') return { parentType: 'module', parentId: node.moduleId };
  return { parentType: null, parentId: null };
}

function presentCurriculumCanvasNode(nodeType, node) {
  if (nodeType === 'subject') {
    const strands = sortByOrderThenName(store.listStrands().filter((item) => item.subjectId === node.id));
    const modules = store.listModules().filter((item) => strands.some((strand) => strand.id === item.strandId));
    const lessons = store.listLessons().filter((item) => modules.some((module) => module.id === item.moduleId));
    const assessments = store.listAssessments().filter((item) => modules.some((module) => module.id === item.moduleId));
    return {
      id: node.id,
      nodeType,
      title: node.name,
      name: node.name,
      icon: node.icon || null,
      order: Number(node.order || 0),
      parentId: null,
      parentType: 'root',
      stats: {
        strandCount: strands.length,
        moduleCount: modules.length,
        lessonCount: lessons.length,
        assessmentCount: assessments.length,
      },
    };
  }

  if (nodeType === 'strand') {
    const subject = requireCurriculumNode('subject', node.subjectId);
    const modules = sortByOrderThenName(store.listModules().filter((item) => item.strandId === node.id));
    const lessons = store.listLessons().filter((item) => modules.some((module) => module.id === item.moduleId));
    const assessments = store.listAssessments().filter((item) => modules.some((module) => module.id === item.moduleId));
    return {
      id: node.id,
      nodeType,
      title: node.name,
      name: node.name,
      order: Number(node.order || 0),
      parentId: node.subjectId,
      parentType: 'subject',
      subjectId: subject.id,
      subjectName: subject.name,
      stats: {
        moduleCount: modules.length,
        lessonCount: lessons.length,
        assessmentCount: assessments.length,
      },
    };
  }

  if (nodeType === 'module') {
    const strand = requireCurriculumNode('strand', node.strandId);
    const subject = requireCurriculumNode('subject', strand.subjectId);
    const lessons = sortByOrderThenName(store.listLessons().filter((item) => item.moduleId === node.id));
    const assessments = sortByOrderThenName(store.listAssessments().filter((item) => item.moduleId === node.id));
    return {
      ...presenters.presentCurriculumModule(node),
      nodeType,
      title: node.title,
      parentId: node.strandId,
      parentType: 'strand',
      strandId: strand.id,
      strandName: strand.name,
      subjectId: subject.id,
      subjectName: subject.name,
      stats: {
        lessonCount: lessons.length,
        assessmentCount: assessments.length,
      },
    };
  }

  if (nodeType === 'lesson') {
    const module = requireCurriculumNode('module', node.moduleId);
    const strand = requireCurriculumNode('strand', module.strandId);
    const subject = requireCurriculumNode('subject', node.subjectId || strand.subjectId);
    return {
      ...presenters.presentLesson(node),
      nodeType,
      parentId: node.moduleId,
      parentType: 'module',
      strandId: strand.id,
      strandName: strand.name,
      subjectId: subject.id,
      subjectName: subject.name,
      title: node.title,
      order: Number(node.order || 0),
    };
  }

  if (nodeType === 'assessment') {
    const module = requireCurriculumNode('module', node.moduleId);
    const strand = requireCurriculumNode('strand', module.strandId);
    const subject = requireCurriculumNode('subject', node.subjectId || strand.subjectId);
    return {
      ...presenters.presentAssessment(node),
      nodeType,
      parentId: node.moduleId,
      parentType: 'module',
      strandId: strand.id,
      strandName: strand.name,
      subjectId: subject.id,
      subjectName: subject.name,
      title: node.title,
      order: Number(node.order || 0),
    };
  }

  return { ...node, nodeType };
}

function buildCurriculumCanvasTree() {
  const subjects = sortByOrderThenName(store.listSubjects()).map((subject) => {
    const strands = sortByOrderThenName(store.listStrands().filter((strand) => strand.subjectId === subject.id)).map((strand) => {
      const modules = sortByOrderThenName(store.listModules().filter((module) => module.strandId === strand.id)).map((module) => {
        const lessons = sortByOrderThenName(store.listLessons().filter((lesson) => lesson.moduleId === module.id)).map((lesson) => presentCurriculumCanvasNode('lesson', lesson));
        const assessments = sortByOrderThenName(store.listAssessments().filter((assessment) => assessment.moduleId === module.id)).map((assessment) => presentCurriculumCanvasNode('assessment', assessment));
        return {
          ...presentCurriculumCanvasNode('module', module),
          children: [...lessons, ...assessments].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''))),
        };
      });
      return { ...presentCurriculumCanvasNode('strand', strand), children: modules };
    });
    return { ...presentCurriculumCanvasNode('subject', subject), children: strands };
  });

  return {
    root: { id: 'root', nodeType: 'root', title: 'Curriculum Canvas', children: subjects },
    meta: {
      subjectCount: subjects.length,
      strandCount: store.listStrands().length,
      moduleCount: store.listModules().length,
      lessonCount: store.listLessons().length,
      assessmentCount: store.listAssessments().length,
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildCurriculumCanvasFocus(nodeType, nodeId) {
  const node = requireCurriculumNode(nodeType, nodeId);
  const parent = getCurriculumNodeParent(nodeType, node);
  const children = store.listCurriculumNodeChildren(nodeType, nodeId).map((child) => presentCurriculumCanvasNode(child.nodeType || (nodeType === 'module' && child.kind ? 'assessment' : undefined) || (nodeType === 'module' && child.trigger ? 'assessment' : undefined) || (child.lessonAssessment !== undefined || child.activitySteps !== undefined ? 'lesson' : nodeType === 'subject' ? 'strand' : nodeType === 'strand' ? 'module' : 'lesson'), child));

  return {
    node: nodeType === 'root' ? { id: 'root', nodeType: 'root', title: 'Curriculum Canvas' } : presentCurriculumCanvasNode(nodeType, node),
    parent: parent.parentType ? { nodeType: parent.parentType, nodeId: parent.parentId, node: presentCurriculumCanvasNode(parent.parentType, requireCurriculumNode(parent.parentType, parent.parentId)) } : null,
    children,
    allowedChildNodeTypes: CURRICULUM_CANVAS_ALLOWED_CHILDREN[nodeType] || [],
  };
}


function normalizeCanvasNodePatch(nodeType, body = {}) {
  const patch = { ...body };

  if ((nodeType === 'module' || nodeType === 'lesson' || nodeType === 'assessment') && patch.name && !patch.title) {
    patch.title = patch.name;
  }

  if ((nodeType === 'lesson' || nodeType === 'assessment') && patch.moduleId && !patch.subjectId) {
    const targetModule = requireCurriculumNode('module', patch.moduleId);
    const targetStrand = requireCurriculumNode('strand', targetModule.strandId);
    patch.subjectId = targetStrand.subjectId;
  }

  return patch;
}

function inferCanvasChildPayload(parentType, parentNode, childType, body = {}) {
  if (childType === 'strand') {
    return { subjectId: parentNode.id, name: body.name, order: body.order };
  }
  if (childType === 'module') {
    return { strandId: parentNode.id, title: body.title || body.name, level: body.level || 'beginner', status: body.status || 'draft', order: body.order };
  }
  if (childType === 'lesson') {
    const strand = requireCurriculumNode('strand', parentNode.strandId);
    return { subjectId: body.subjectId || strand.subjectId, moduleId: parentNode.id, title: body.title || body.name, durationMinutes: body.durationMinutes || 10, mode: body.mode || 'guided', status: body.status || 'draft', order: body.order, targetAgeRange: body.targetAgeRange, voicePersona: body.voicePersona, learningObjectives: body.learningObjectives, localization: body.localization, lessonAssessment: body.lessonAssessment, activitySteps: body.activitySteps || body.activities };
  }
  if (childType === 'assessment') {
    const strand = requireCurriculumNode('strand', parentNode.strandId);
    return { subjectId: body.subjectId || strand.subjectId, moduleId: parentNode.id, title: body.title || body.name, kind: body.kind || 'automatic', trigger: body.trigger || 'module-complete', triggerLabel: body.triggerLabel || 'After module completion', progressionGate: body.progressionGate || 'foundation-a', passingScore: body.passingScore !== undefined ? body.passingScore : 0.6, status: body.status || 'draft', items: body.items, order: body.order };
  }
  if (childType === 'subject') {
    return { id: body.id, name: body.name, icon: body.icon, order: body.order, initialStrandName: body.initialStrandName };
  }
  return body;
}

function normalizeMallamAssignmentValue(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = String(value).trim();
  if (!normalized || normalized === 'unassigned' || normalized === 'none' || normalized === 'null') {
    return null;
  }

  return normalized;
}

function assignStudentMallam(studentId, mallamId) {
  const student = store.findStudentById(studentId);

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  if (mallamId !== null) {
    const mallam = store.findTeacherById(mallamId);

    if (!mallam) {
      const error = new Error('Mallam not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const updatedStudent = store.updateStudent(studentId, { mallamId });
  return presenters.presentStudent(updatedStudent);
}

function hashPayload(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload || {})).digest('hex');
}

function buildSyncReceipt(event, result, batchId) {
  return {
    eventId: event.id || event.clientId || null,
    batchId: batchId || null,
    type: event.type || event.eventType || 'unknown',
    learnerId: result?.student?.id || result?.progress?.studentId || result?.session?.studentId || null,
    result,
  };
}

function mapCompletionStateToStatus(completionState) {
  if (completionState === 'completed') return 'completed';
  if (completionState === 'abandoned') return 'abandoned';
  return 'in_progress';
}

function upsertRuntimeSessionFromEvent(student, payload, type) {
  if (!payload.sessionId) {
    const error = new Error('Missing sessionId for learner runtime event');
    error.statusCode = 400;
    throw error;
  }

  const existing = store.findLessonSessionBySessionId(payload.sessionId);
  const currentStepIndex = Number(payload.stepIndex || existing?.currentStepIndex || 0);
  const stepsTotal = Number(payload.stepsTotal || existing?.stepsTotal || 0);
  const updates = {
    sessionId: payload.sessionId,
    studentId: student.id,
    learnerCode: payload.learnerCode || null,
    lessonId: payload.lessonId || existing?.lessonId || null,
    moduleId: payload.moduleId || existing?.moduleId || null,
    completionState: payload.completionState || existing?.completionState || 'inProgress',
    automationStatus: payload.automationStatus || existing?.automationStatus || 'guided',
    currentStepIndex,
    stepsTotal,
    latestReview: payload.review || existing?.latestReview || null,
    lastEventType: type,
    startedAt: existing?.startedAt || payload.capturedAt || new Date().toISOString(),
    lastActivityAt: payload.capturedAt || new Date().toISOString(),
  };

  if (type === 'lesson_session_started') {
    updates.status = 'in_progress';
  }

  if (type === 'learner_response_captured') {
    updates.responsesCaptured = Number(existing?.responsesCaptured || 0) + 1;
    updates.latestReview = payload.review || existing?.latestReview || null;
  }

  if (type === 'coach_support_used') {
    updates.supportActionsUsed = Number(existing?.supportActionsUsed || 0) + 1;
  }

  if (type === 'facilitator_observation_added') {
    updates.facilitatorObservations = Number(existing?.facilitatorObservations || 0) + 1;
  }

  if (type === 'learner_audio_captured') {
    updates.audioCaptures = Number(existing?.audioCaptures || 0) + 1;
  }

  if (type === 'lesson_step_completed' || type === 'lesson_step_advanced') {
    updates.currentStepIndex = Math.max(currentStepIndex, Number(existing?.currentStepIndex || 0));
  }

  if (type === 'lesson_completed') {
    updates.status = mapCompletionStateToStatus(payload.completionState || 'completed');
    updates.completionState = payload.completionState || 'completed';
    updates.completedAt = payload.capturedAt || new Date().toISOString();
    updates.currentStepIndex = Math.max(currentStepIndex, stepsTotal, Number(existing?.currentStepIndex || 0));
  }

  const session = store.upsertLessonSession(updates);

  store.createSessionEventLog({
    sessionId: session.sessionId,
    studentId: student.id,
    lessonId: session.lessonId,
    moduleId: session.moduleId,
    type,
    payload,
    createdAt: payload.capturedAt || new Date().toISOString(),
  });

  return presenters.presentLessonSession(session);
}

function syncLearnerAppEvents(events = [], options = {}) {
  const items = Array.isArray(events) ? events : [events];
  const batchId = options.batchId || null;

  const results = items.filter(Boolean).map((event, index) => {
    const type = event.type || event.eventType;
    const payload = event.payload || event;
    const clientId = event.id || event.clientId || payload.id || payload.clientId || null;
    const existingSync = clientId ? store.findSyncEventByClientId(clientId) : null;

    if (existingSync) {
      return {
        index,
        type,
        status: 'duplicate',
        reason: 'duplicate_client_event',
        previousSyncId: existingSync.id,
        receiptId: existingSync.id,
        syncedAt: existingSync.appliedAt || existingSync.receivedAt || null,
        result: existingSync.result,
      };
    }

    if (type === 'learner_registered') {
      const body = normalizeLearnerAppStudentPayload(payload);
      validators.validateStudent(body);
      const student = store.createStudent(body);
      const result = {
        index,
        type,
        status: 'accepted',
        student: presenters.presentLearnerProfile(student),
      };

      const receipt = store.createSyncEvent({
        clientId,
        batchId,
        type,
        learnerId: student.id,
        payloadHash: hashPayload(payload),
        result: buildSyncReceipt(event, result, batchId),
      });

      return {
        ...result,
        receiptId: receipt.id,
        syncedAt: receipt.appliedAt || receipt.receivedAt || null,
      };
    }

    if (['lesson_session_started', 'learner_response_captured', 'coach_support_used', 'facilitator_observation_added', 'learner_audio_captured', 'lesson_step_completed', 'lesson_step_advanced'].includes(type)) {
      const student = payload.studentId
        ? store.findStudentById(payload.studentId)
        : findStudentByLearnerCode(payload.learnerCode);

      if (!student) {
        const error = new Error(`Unknown learner for sync event: ${payload.learnerCode || payload.studentId || 'missing identifier'}`);
        error.statusCode = 400;
        throw error;
      }

      const session = upsertRuntimeSessionFromEvent(student, payload, type);
      const result = {
        index,
        type,
        status: 'accepted',
        session,
      };

      const receipt = store.createSyncEvent({
        clientId,
        batchId,
        type,
        learnerId: student.id,
        payloadHash: hashPayload(payload),
        result: buildSyncReceipt(event, result, batchId),
      });

      return {
        ...result,
        receiptId: receipt.id,
        syncedAt: receipt.appliedAt || receipt.receivedAt || null,
      };
    }

    if (type === 'lesson_completed') {
      const student = payload.studentId
        ? store.findStudentById(payload.studentId)
        : findStudentByLearnerCode(payload.learnerCode);

      if (!student) {
        const error = new Error(`Unknown learner for sync event: ${payload.learnerCode || payload.studentId || 'missing identifier'}`);
        error.statusCode = 400;
        throw error;
      }

      const lesson = payload.lessonId ? store.findLessonById(payload.lessonId) : null;
      const lessonModule = lesson?.moduleId ? store.listModules().find((module) => module.id === lesson.moduleId) : null;
      const moduleId = payload.curriculumModuleId || payload.moduleId || lesson?.moduleId || null;
      const subjectId = lesson?.subjectId || lessonModule?.subjectId || 'english';
      const progressRecord = store.upsertProgress({
        studentId: student.id,
        subjectId,
        moduleId,
        mastery: payload.review === 'onTrack' ? 0.75 : payload.review === 'needsSupport' ? 0.45 : 0.6,
        lessonsCompleted: Number(payload.stepsTotal || payload.stepIndex || 1),
        progressionStatus: payload.review === 'needsSupport' ? 'watch' : 'on-track',
        recommendedNextModuleId: moduleId,
      });

      const rewardResult = rewards.awardLessonCompletion({
        studentId: student.id,
        lessonId: lesson?.id || payload.lessonId || null,
        moduleId,
        subjectId,
        review: payload.review,
        supportActionsUsed: payload.supportActionsUsed,
        observationsCount: Array.isArray(payload.observations) ? payload.observations.length : 0,
      });

      if (Array.isArray(payload.observations)) {
        payload.observations
          .filter((item) => item && item.trim())
          .forEach((note) => {
            store.createObservation({
              studentId: student.id,
              teacherId: student.mallamId,
              note,
              competencyTag: lesson?.subjectId || subjectId,
              supportLevel: payload.review === 'needsSupport' ? 'guided' : 'independent',
            });
          });
      }

      const session = payload.sessionId ? upsertRuntimeSessionFromEvent(student, payload, type) : null;
      const result = {
        index,
        type,
        status: 'accepted',
        session,
        progress: presenters.presentProgress(progressRecord),
        rewards: rewardResult.snapshot,
        rewardDelta: rewardResult.delta,
      };

      const receipt = store.createSyncEvent({
        clientId,
        batchId,
        type,
        learnerId: student.id,
        payloadHash: hashPayload(payload),
        result: buildSyncReceipt(event, result, batchId),
      });

      return {
        ...result,
        receiptId: receipt.id,
        syncedAt: receipt.appliedAt || receipt.receivedAt || null,
      };
    }

    const result = {
      index,
      type: type || 'unknown',
      status: 'ignored',
      reason: 'unsupported_event_type',
    };

    store.createSyncEvent({
      clientId,
      batchId,
      type: type || 'unknown',
      learnerId: payload.studentId || null,
      payloadHash: hashPayload(payload),
      status: 'ignored',
      result: buildSyncReceipt(event, result, batchId),
    });

    return result;
  });

  return {
    accepted: results.filter((item) => item.status === 'accepted').length,
    duplicates: results.filter((item) => item.status === 'duplicate').length,
    ignored: results.filter((item) => item.status === 'ignored').length,
    results,
    syncedAt: new Date().toISOString(),
    batchId,
    cursor: store.listSyncEvents().slice(-1)[0]?.id ?? null,
    contractVersion: 'learner-app-v2.3',
  };
}

app.get('/health', (_req, res) => {
  const configAudit = buildConfigAudit();
  const storageStatus = store.getStorageStatus();

  res.json({
    status: configAudit.summary.ready ? 'ok' : 'degraded',
    service: 'lumo-api',
    storage: {
      mode: storageStatus?.db?.mode || getDbMode(),
      driver: storageStatus?.db?.driver || getDbModeMeta().driver,
      persistent: storageStatus?.db?.persistent ?? true,
    },
    config: {
      ready: configAudit.summary.ready,
      warningCount: configAudit.summary.warningCount,
      errorCount: configAudit.summary.errorCount,
    },
  });
});

app.get('/readyz', (_req, res) => {
  const configAudit = buildConfigAudit();
  return res.status(configAudit.summary.ready ? 200 : 503).json(configAudit);
});

app.get('/api/v1/meta', (req, res) => {
  res.json({
    actor: req.actor,
    mode: 'demo-seeded',
    seedSummary: seed.getSeedSummary(),
    store: store.getStoreMeta(),
    configAudit: buildConfigAudit(),
  });
});

app.get('/api/v1/admin/config/audit', requireRole(['admin']), (_req, res) => {
  res.json(buildConfigAudit());
});

app.get('/api/v1/learner-app/bootstrap', (_req, res) => {
  res.json(buildLearnerAppBootstrap());
});

app.get('/api/v1/learner-app/context', (_req, res) => {
  res.json(buildLearnerAppBootstrap());
});

app.get('/api/v1/learner-app/registration-context', (_req, res) => {
  res.json(buildRegistrationContext());
});

app.get('/api/v1/learner-app/learners', (_req, res) => {
  res.json(store.listStudents().map(presenters.presentLearnerProfile));
});

app.post('/api/v1/learner-app/learners', (req, res, next) => {
  try {
    const body = normalizeLearnerAppStudentPayload(req.body);

    validators.validateStudent(body);
    const student = store.createStudent(body);
    return res.status(201).json(presenters.presentLearnerProfile(student));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/learner-app/sessions', (req, res) => {
  const learnerCode = req.query.learnerCode ? String(req.query.learnerCode) : null;
  const learnerId = req.query.learnerId ? String(req.query.learnerId) : null;
  const limit = Number(req.query.limit || 20);
  const student = learnerId
    ? store.findStudentById(learnerId)
    : learnerCode
      ? findStudentByLearnerCode(learnerCode)
      : null;

  const sessions = store
    .listLessonSessions()
    .filter((item) => !student || item.studentId === student.id)
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
    .slice(0, Math.max(1, Math.min(limit, 100)))
    .map(presenters.presentLessonSession);

  return res.json({
    sessions,
    meta: {
      learnerId: student?.id ?? learnerId ?? null,
      learnerCode,
      count: sessions.length,
    },
  });
});

app.get('/api/v1/learner-app/sessions/:sessionId', (req, res) => {
  const session = store.findLessonSessionBySessionId(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }

  const events = store
    .listSessionEventLog()
    .filter((entry) => entry.sessionId === req.params.sessionId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return res.json({
    session: presenters.presentLessonSession(session),
    events,
  });
});

app.post('/api/v1/learner-app/sync', learnerSyncThrottle, (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events)
      ? req.body.events
      : Array.isArray(req.body)
        ? req.body
        : [req.body];
    const batchId = req.headers['x-lumo-sync-batch'] || req.body?.batchId || null;
    const result = syncLearnerAppEvents(events, { batchId });

    res.setHeader('x-lumo-sync-accepted', String(result.accepted));
    res.setHeader('x-lumo-sync-ignored', String(result.ignored));
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sync-batches', learnerSyncThrottle, (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events)
      ? req.body.events
      : Array.isArray(req.body)
        ? req.body
        : [req.body];
    const batchId = req.headers['x-lumo-sync-batch'] || req.body?.batchId || null;
    const result = syncLearnerAppEvents(events, { batchId });

    res.setHeader('x-lumo-sync-accepted', String(result.accepted));
    res.setHeader('x-lumo-sync-ignored', String(result.ignored));
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/learner-app/modules', (_req, res) => {
  res.json(buildLearnerModules({ includeAssigned: true }));
});

app.get('/api/v1/learner-app/assignments', (_req, res) => {
  res.json(buildLearnerAssignmentIndex());
});

app.get('/api/v1/learner-app/assignment-packs', (_req, res) => {
  res.json({
    items: buildLearnerAssignmentIndex(),
    generatedAt: new Date().toISOString(),
  });
});

app.get('/api/v1/learner-app/assessments', (_req, res) => {
  res.json({
    items: buildLearnerAssessments(),
    generatedAt: new Date().toISOString(),
  });
});

app.get('/api/v1/learner-app/lessons/:id', (req, res) => {
  const lesson = store
    .listLessons()
    .find((entry) => entry.id === req.params.id);

  if (!lesson) {
    return res.status(404).json({ message: 'Lesson not found' });
  }

  return res.json(presenters.presentLearnerLesson(lesson));
});

app.get('/api/v1/learner-app/modules/:id', (req, res) => {
  const sourceModule = store
    .listModules()
    .find((module) => module.id === req.params.id || presenters.presentLearnerModule(module).id === req.params.id);

  if (!sourceModule) {
    return res.status(404).json({ message: 'Module not found' });
  }

  const module = presenters.presentLearnerModule(sourceModule);
  const lessons = buildLearnerLessons({ includeAssigned: true }).filter(
    (lesson) =>
      lesson.curriculumModuleId === sourceModule.id ||
      lesson.moduleId === module.id,
  );
  const assignmentPacks = buildLearnerAssignmentIndex().filter(
    (assignment) =>
      assignment.lessonPack?.curriculumModuleId === sourceModule.id ||
      assignment.lessonPack?.moduleKey === module.id,
  );
  const assessments = buildLearnerAssessments().filter(
    (assessment) => assessment.moduleId === sourceModule.id,
  );

  return res.json({
    ...module,
    lessons,
    assignmentPacks,
    assessments,
  });
});

app.get('/api/v1/dashboard/summary', (_req, res) => {
  const assignments = store.listAssignments();
  const progress = store.listProgress();
  const pods = store.listPods();
  const assessments = store.listAssessments();

  res.json({
    activeLearners: store.listStudents().length,
    lessonsCompleted: progress.reduce((sum, item) => sum + item.lessonsCompleted, 0),
    centers: store.listCenters().length,
    syncSuccessRate: 0.96,
    mallams: store.listTeachers().length,
    activePods: pods.filter((item) => ['active', 'pilot'].includes(item.status)).length,
    activeAssignments: assignments.filter((item) => item.status === 'active').length,
    assessmentsLive: assessments.filter((item) => item.status === 'active').length,
    learnersReadyToProgress: progress.filter((item) => item.progressionStatus === 'ready').length,
  });
});

app.get('/api/v1/dashboard/insights', (_req, res) => {
  res.json(reporting.buildDashboardInsights());
});

app.get('/api/v1/dashboard/workboard', (_req, res) => {
  res.json(reporting.buildWorkboard());
});

app.get('/api/v1/dashboard/runtime', (req, res) => {
  res.json(
    reporting.buildRuntimeAnalytics({
      learnerId: coerceOptionalString(req.query.learnerId),
      lessonId: coerceOptionalString(req.query.lessonId),
      cohortId: coerceOptionalString(req.query.cohortId),
      podId: coerceOptionalString(req.query.podId),
      mallamId: coerceOptionalString(req.query.mallamId),
      since: coerceOptionalString(req.query.since),
      until: coerceOptionalString(req.query.until),
      limit: Number(req.query.limit || 50),
    }),
  );
});

app.get('/api/v1/dashboard/progression-rollup', (req, res) => {
  res.json(
    reporting.buildProgressionRollup({
      cohortId: coerceOptionalString(req.query.cohortId),
      podId: coerceOptionalString(req.query.podId),
      mallamId: coerceOptionalString(req.query.mallamId),
      subjectId: coerceOptionalString(req.query.subjectId),
      since: coerceOptionalString(req.query.since),
      until: coerceOptionalString(req.query.until),
    }),
  );
});

app.get('/api/v1/centers', (_req, res) => {
  res.json(store.listCenters());
});

app.get('/api/v1/pods', (_req, res) => {
  res.json(store.listPods().map(presenters.presentPod));
});

app.get('/api/v1/cohorts', (_req, res) => {
  res.json(store.listCohorts());
});

app.get('/api/v1/teachers', (_req, res) => {
  res.json(store.listTeachers());
});

app.get('/api/v1/mallams', (_req, res) => {
  res.json(store.listTeachers().map(presenters.presentMallam));
});

app.get('/api/v1/mallams/:id', (req, res) => {
  const profile = reporting.buildMallamProfile(req.params.id);

  if (!profile) {
    return res.status(404).json({ message: 'Mallam not found' });
  }

  return res.json(profile);
});

app.get('/api/v1/mallams/:id/summary', (req, res) => {
  const summary = reporting.buildMallamSummary(req.params.id);

  if (!summary) {
    return res.status(404).json({ message: 'Mallam not found' });
  }

  return res.json(summary);
});

app.post('/api/v1/mallams', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateTeacher(req.body);
    const mallam = store.createTeacher(req.body);
    return res.status(201).json(presenters.presentMallam(mallam));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/mallams/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateTeacher(req.body, { partial: true });
    const mallam = store.updateTeacher(req.params.id, req.body);

    if (!mallam) {
      return res.status(404).json({ message: 'Mallam not found' });
    }

    return res.json(presenters.presentMallam(mallam));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/mallams/:id', ...protectedMutation(['admin']), (req, res) => {
  const mallam = store.deleteTeacher(req.params.id);

  if (!mallam) {
    return res.status(404).json({ message: 'Mallam not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/students', (_req, res) => {
  res.json(store.listStudents().map(presenters.presentStudent));
});

app.post('/api/v1/students', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateStudent(req.body);
    const student = store.createStudent(req.body);
    return res.status(201).json(presenters.presentStudent(student));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/students/:id', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateStudent(req.body, { partial: true });
    const student = store.updateStudent(req.params.id, req.body);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.json(presenters.presentStudent(student));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/students/:id/mallam', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const updatedStudent = assignStudentMallam(req.params.id, normalizeMallamAssignmentValue(req.body?.mallamId));
    return res.status(201).json(updatedStudent);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/mallams/:id/roster', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const learnerIds = Array.isArray(req.body?.learnerIds)
      ? req.body.learnerIds.map((value) => String(value)).filter(Boolean)
      : [String(req.body?.learnerId || '')].filter(Boolean);

    if (!learnerIds.length) {
      const error = new Error('Provide learnerId or learnerIds');
      error.statusCode = 400;
      throw error;
    }

    const updates = learnerIds.map((learnerId) => assignStudentMallam(learnerId, req.params.id));
    return res.status(201).json({ items: updates, count: updates.length });
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/students/:id', ...protectedMutation(['admin']), (req, res) => {
  const student = store.deleteStudent(req.params.id);

  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/students/:id', (req, res) => {
  const profile = reporting.buildStudentProfile(req.params.id);

  if (!profile) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.json(profile);
});

app.get('/api/v1/students/:id/rewards', (req, res) => {
  const snapshot = rewards.buildLearnerRewards(req.params.id);

  if (!snapshot) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.json(snapshot);
});

app.post('/api/v1/students/:id/rewards', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const student = store.findStudentById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const xpDelta = Number(req.body?.xpDelta || 0);

    if (!Number.isFinite(xpDelta)) {
      const error = new Error('Invalid xpDelta');
      error.statusCode = 400;
      throw error;
    }

    const result = rewards.awardManualReward({
      studentId: req.params.id,
      xpDelta,
      badgeId: req.body?.badgeId || null,
      label: req.body?.label || null,
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/rewards/catalog', (_req, res) => {
  res.json(rewards.buildRewardsCatalog());
});

app.get('/api/v1/learner-app/rewards/catalog', (_req, res) => {
  res.json(rewards.buildRewardsCatalog());
});

app.get('/api/v1/learner-app/rewards', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });

  if (!learner) {
    return res.status(404).json({ message: 'Learner not found' });
  }

  return res.json(rewards.buildLearnerRewardHub(learner.id));
});

app.get('/api/v1/learner-app/rewards/store/:itemId', (req, res) => {
  const item = rewards.getRewardStoreItem(req.params.itemId);

  if (!item) {
    return res.status(404).json({ message: 'Reward item not found' });
  }

  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });
  const snapshot = learner ? rewards.buildLearnerRewards(learner.id) : null;

  return res.json({
    ...item,
    learnerId: learner?.id ?? null,
    affordable: snapshot ? snapshot.totalXp >= item.xpCost : null,
    xpShortfall: snapshot ? Math.max(0, item.xpCost - snapshot.totalXp) : null,
    currentXp: snapshot?.totalXp ?? null,
  });
});

app.get('/api/v1/learner-app/rewards/leaderboard', (req, res) => {
  const limit = Number(req.query.limit || 10);
  return res.json(rewards.buildScopedLeaderboard({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    limit: Number.isFinite(limit) ? limit : 10,
  }));
});

app.get('/api/v1/learner-app/rewards/requests', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });

  if (!learner) {
    return res.status(404).json({ message: 'Learner not found' });
  }

  return res.json(rewards.buildRewardRequestHistory(learner.id, {
    status: coerceOptionalString(req.query.status),
    limit: coerceOptionalNumber(req.query.limit) || 20,
  }));
});

app.post('/api/v1/learner-app/rewards/requests', learnerRewardRequestThrottle, (req, res, next) => {
  try {
    const learner = resolveStudentScope({ learnerId: req.body?.learnerId || req.query.learnerId, learnerCode: req.body?.learnerCode || req.query.learnerCode });

    if (!learner) {
      return res.status(404).json({ message: 'Learner not found' });
    }

    const result = rewards.createRewardRedemptionRequest({
      studentId: learner.id,
      rewardItemId: coerceOptionalString(req.body?.rewardItemId),
      learnerNote: coerceOptionalString(req.body?.learnerNote) || '',
      requestedBy: learner.id,
      requestedVia: 'learner-app',
      clientRequestId: coerceOptionalString(req.body?.clientRequestId) || coerceOptionalString(req.header('x-lumo-client-id')),
      metadata: req.body?.metadata,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/rewards/requests/:id/cancel', (req, res, next) => {
  try {
    const result = rewards.cancelRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name || 'Learner app',
      actorRole: req.actor?.role || 'learner',
      reason: req.body?.reason,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/rewards/requests', (req, res) => {
  const limit = coerceOptionalNumber(req.query.limit) || 50;
  return res.json(rewards.buildRewardRedemptionQueue({
    learnerId: coerceOptionalString(req.query.learnerId),
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    status: coerceOptionalString(req.query.status),
    limit: Number.isFinite(limit) ? limit : 50,
  }));
});

app.get('/api/v1/rewards/requests/:id', (req, res) => {
  const detail = rewards.buildRewardRequestDetail(req.params.id);

  if (!detail) {
    return res.status(404).json({ message: 'Reward request not found' });
  }

  return res.json(detail);
});


app.post('/api/v1/rewards/requests/:id/approve', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.approveRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      adminNote: req.body?.adminNote,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/rewards/requests/:id/reject', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.rejectRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason,
      adminNote: req.body?.adminNote,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});


app.post('/api/v1/rewards/requests/:id/reopen', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.reopenRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason,
      adminNote: req.body?.adminNote,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/rewards/requests/:id/requeue', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.requeueRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason,
      adminNote: req.body?.adminNote,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/rewards/requests/:id/expire', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.expireRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason,
      adminNote: req.body?.adminNote,
      metadata: req.body?.metadata,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/rewards/requests/expire-stale', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const result = rewards.expireStaleRewardRedemptionRequests({
      olderThanDays: coerceOptionalNumber(req.body?.olderThanDays) ?? 14,
      includeApproved: req.body?.includeApproved !== false,
      limit: coerceOptionalNumber(req.body?.limit) ?? 100,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason,
      adminNote: req.body?.adminNote,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/rewards/requests/:id/fulfill', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.fulfillRewardRedemptionRequest(req.params.id, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      adminNote: req.body?.adminNote,
      metadata: req.body?.metadata,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/rewards/summary', (req, res) => {
  res.json(rewards.buildRewardOpsSummary({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
  }));
});

app.get('/api/v1/admin/rewards/integrity', requireRole(['admin']), (req, res) => {
  res.json(rewards.buildRewardRequestIntegrityReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    limit: Number(req.query.limit || 100),
  }));
});

app.post('/api/v1/admin/rewards/repair-integrity', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.status(201).json(rewards.repairRewardRequestIntegrity({
      cohortId: coerceOptionalString(req.body?.cohortId),
      podId: coerceOptionalString(req.body?.podId),
      mallamId: coerceOptionalString(req.body?.mallamId),
      learnerId: coerceOptionalString(req.body?.learnerId),
      apply: Boolean(req.body?.apply),
      limit: Number(req.body?.limit || 100),
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/rewards/leaderboard', (req, res) => {
  const limit = Number(req.query.limit || 10);
  res.json(rewards.buildScopedLeaderboard({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    limit: Number.isFinite(limit) ? limit : 10,
  }));
});


app.get('/api/v1/curriculum/canvas', (_req, res) => {
  res.json(buildCurriculumCanvasTree());
});

app.get('/api/v1/curriculum/canvas/focus/:nodeType/:nodeId', (req, res, next) => {
  try {
    return res.json(buildCurriculumCanvasFocus(req.params.nodeType, req.params.nodeId));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/curriculum/canvas/children', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const parentType = req.body?.parentType || 'root';
    const childType = req.body?.childType;
    const parentNode = parentType === 'root' ? { id: 'root', nodeType: 'root' } : requireCurriculumNode(parentType, req.body?.parentId);

    if (!(CURRICULUM_CANVAS_ALLOWED_CHILDREN[parentType] || []).includes(childType)) {
      const error = new Error(`Cannot create ${childType || 'node'} under ${parentType}`);
      error.statusCode = 400;
      throw error;
    }

    const payload = inferCanvasChildPayload(parentType, parentNode, childType, req.body || {});
    let created;
    if (childType === 'subject') {
      validators.validateSubject(payload);
      created = store.createSubject(payload);
    } else if (childType === 'strand') {
      validators.validateStrand(payload);
      created = store.createStrand(payload);
    } else if (childType === 'module') {
      validators.validateModule(payload);
      created = store.createModule(payload);
    } else if (childType === 'lesson') {
      validators.validateLesson(payload);
      created = store.createLesson(payload);
    } else if (childType === 'assessment') {
      validators.validateAssessment(payload);
      created = store.createAssessment(payload);
    }

    return res.status(201).json({
      created: presentCurriculumCanvasNode(childType, created),
      focus: buildCurriculumCanvasFocus(parentType, parentNode.id),
    });
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/curriculum/canvas/nodes/:nodeType/:nodeId', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const { nodeType, nodeId } = req.params;
    requireCurriculumNode(nodeType, nodeId);
    const patch = normalizeCanvasNodePatch(nodeType, req.body || {});

    let updated;
    if (nodeType === 'subject') {
      validators.validateSubject(patch, { partial: true });
      updated = store.updateSubject(nodeId, patch);
    } else if (nodeType === 'strand') {
      validators.validateStrand(patch, { partial: true });
      updated = store.updateStrand(nodeId, patch);
    } else if (nodeType === 'module') {
      validators.validateModule(patch, { partial: true });
      updated = store.updateModule(nodeId, patch);
    } else if (nodeType === 'lesson') {
      validators.validateLesson(patch, { partial: true });
      updated = store.updateLesson(nodeId, patch);
    } else if (nodeType === 'assessment') {
      validators.validateAssessment(patch, { partial: true });
      updated = store.updateAssessment(nodeId, patch);
    } else {
      const error = new Error(`Unsupported curriculum node type: ${nodeType}`);
      error.statusCode = 400;
      throw error;
    }

    return res.json({ updated: presentCurriculumCanvasNode(nodeType, updated), focus: buildCurriculumCanvasFocus(nodeType, nodeId) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/curriculum/canvas/reorder', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const parentType = req.body?.parentType || 'root';
    const parentId = req.body?.parentId || null;
    const nodeType = req.body?.nodeType;
    const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds.map((value) => String(value)) : [];

    if (parentType !== 'root') {
      requireCurriculumNode(parentType, parentId);
    }

    const reordered = store.reorderCurriculumNodes({ parentType, parentId, nodeType, orderedIds });
    return res.status(201).json({
      parentType,
      parentId,
      nodeType,
      items: reordered.map((item) => presentCurriculumCanvasNode(nodeType, item)),
      focus: parentType === 'root' ? buildCurriculumCanvasTree().root : buildCurriculumCanvasFocus(parentType, parentId),
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/subjects', (_req, res) => {
  res.json(store.listSubjects());
});

app.post('/api/v1/subjects', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateSubject(req.body);
    const subject = store.createSubject(req.body);
    return res.status(201).json(subject);
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/subjects/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateSubject(req.body, { partial: true });
    const subject = store.updateSubject(req.params.id, req.body);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    return res.json(subject);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/subjects/:id', ...protectedMutation(['admin']), (req, res) => {
  const subject = store.deleteSubject(req.params.id);

  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/strands', (_req, res) => {
  res.json(store.listStrands().map(presenters.presentStrand));
});

app.post('/api/v1/strands', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateStrand(req.body);
    const strand = store.createStrand(req.body);
    return res.status(201).json(presenters.presentStrand(strand));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/strands/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateStrand(req.body, { partial: true });
    const strand = store.updateStrand(req.params.id, req.body);

    if (!strand) {
      return res.status(404).json({ message: 'Strand not found' });
    }

    return res.json(presenters.presentStrand(strand));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/strands/:id', ...protectedMutation(['admin']), (req, res) => {
  const strand = store.deleteStrand(req.params.id);

  if (!strand) {
    return res.status(404).json({ message: 'Strand not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/curriculum/modules', (_req, res) => {
  res.json(store.listModules().map(presenters.presentCurriculumModule));
});

app.post('/api/v1/curriculum/modules', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateModule(req.body);
    const module = store.createModule(req.body);
    return res.status(201).json(presenters.presentCurriculumModule(module));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/curriculum/modules/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateModule(req.body, { partial: true });
    const module = store.updateModule(req.params.id, req.body);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    return res.json(presenters.presentCurriculumModule(module));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/curriculum/modules/:id', ...protectedMutation(['admin']), (req, res) => {
  const module = store.deleteModule(req.params.id);

  if (!module) {
    return res.status(404).json({ message: 'Module not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/lessons', (_req, res) => {
  res.json(store.listLessons().map(presenters.presentLesson));
});

app.get('/api/v1/lessons/:id', (req, res) => {
  const lesson = store.findLessonById(req.params.id);

  if (!lesson) {
    return res.status(404).json({ message: 'Lesson not found' });
  }

  return res.json(presenters.presentLesson(lesson));
});

app.post('/api/v1/lessons', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateLesson(req.body);
    const lesson = store.createLesson(req.body);
    return res.status(201).json(presenters.presentLesson(lesson));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/lessons/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateLesson(req.body, { partial: true });
    const lesson = store.updateLesson(req.params.id, req.body);

    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    return res.json(presenters.presentLesson(lesson));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/lessons/:id', ...protectedMutation(['admin']), (req, res) => {
  const lesson = store.deleteLesson(req.params.id);

  if (!lesson) {
    return res.status(404).json({ message: 'Lesson not found' });
  }

  return res.status(204).send();
});



app.get('/api/v1/assets', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const subjectId = String(req.query.subjectId || '').trim();
  const moduleId = String(req.query.moduleId || '').trim();
  const lessonId = String(req.query.lessonId || '').trim();
  const kind = String(req.query.kind || '').trim();
  const items = store.listLessonAssets()
    .filter((item) => !subjectId || item.subjectId === subjectId)
    .filter((item) => !moduleId || item.moduleId === moduleId)
    .filter((item) => !lessonId || item.lessonId === lessonId)
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => !q || [item.title, item.description, ...(Array.isArray(item.tags) ? item.tags : []), item.originalFileName, item.fileName].filter(Boolean).join(' ').toLowerCase().includes(q))
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  res.json(items.map((item) => presenters.presentLessonAsset({
    ...item,
    fileUrl: item.fileUrl || (item.storagePath ? buildAssetFileUrl(req, item.storagePath) : null),
  })));
});

app.post('/api/v1/assets', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const tags = Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(',').map((item) => item.trim()).filter(Boolean);
    const payload = { ...req.body, tags, status: req.body.status || 'ready' };
    validators.validateLessonAsset(payload);
    const created = store.createLessonAsset({
      ...payload,
      createdBy: getActor(req).name,
      source: req.body.source || 'manual',
    });
    return res.status(201).json(presenters.presentLessonAsset(created));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/assets/upload', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const { fileName, contentType, base64, kind, title, description, subjectId, moduleId, lessonId } = req.body || {};
    if (!fileName || !base64) {
      return res.status(400).json({ message: 'fileName and base64 are required' });
    }

    const tags = Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(',').map((item) => item.trim()).filter(Boolean);
    const assetId = `asset-${crypto.randomUUID()}`;
    const ext = path.extname(String(fileName || '')).trim() || '';
    const safeBase = sanitizeAssetFileName(path.basename(String(fileName || 'asset'), ext));
    const datedDir = path.join(assetUploadRoot, new Date().toISOString().slice(0, 10));
    fs.mkdirSync(datedDir, { recursive: true });
    const storedFileName = `${assetId}-${safeBase}${ext}`;
    const storagePath = path.join(datedDir, storedFileName);
    const buffer = Buffer.from(String(base64), 'base64');
    fs.writeFileSync(storagePath, buffer);

    const payload = {
      id: assetId,
      kind: kind || 'image',
      title: title || safeBase,
      description: description || '',
      tags,
      subjectId: subjectId || null,
      moduleId: moduleId || null,
      lessonId: lessonId || null,
      mimeType: contentType || null,
      fileName: storedFileName,
      originalFileName: fileName,
      sizeBytes: buffer.length,
      storagePath,
      fileUrl: buildAssetFileUrl(req, storagePath),
      status: 'ready',
      createdBy: getActor(req).name,
      source: 'upload',
    };

    validators.validateLessonAsset(payload);
    const created = store.createLessonAsset(payload);
    return res.status(201).json(presenters.presentLessonAsset(created));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/assessments', (_req, res) => {
  res.json(store.listAssessments().map(presenters.presentAssessment));
});

app.post('/api/v1/assessments', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateAssessment(req.body);
    const assessment = store.createAssessment(req.body);
    return res.status(201).json(presenters.presentAssessment(assessment));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/assessments/:id', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    validators.validateAssessment(req.body, { partial: true });
    const assessment = store.updateAssessment(req.params.id, req.body);

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    return res.json(presenters.presentAssessment(assessment));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/assessments/:id', ...protectedMutation(['admin']), (req, res) => {
  const assessment = store.deleteAssessment(req.params.id);

  if (!assessment) {
    return res.status(404).json({ message: 'Assessment not found' });
  }

  return res.status(204).send();
});

app.get('/api/v1/assignments', (_req, res) => {
  res.json(store.listAssignments().map(presenters.presentAssignment));
});

app.post('/api/v1/assignments', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateAssignment(req.body);
    const assignment = store.createAssignment(req.body);
    return res.status(201).json(presenters.presentAssignment(assignment));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/assignments/:id', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    validators.validateAssignment(req.body, { partial: true });
    const assignment = store.updateAssignment(req.params.id, req.body);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    return res.json(presenters.presentAssignment(assignment));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/attendance', (_req, res) => {
  res.json(store.listAttendance().map(presenters.presentAttendance));
});

app.post('/api/v1/attendance', ...protectedMutation(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateAttendance(req.body);
    const record = store.createAttendance(req.body);
    return res.status(201).json(presenters.presentAttendance(record));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/progress', (_req, res) => {
  res.json(store.listProgress().map(presenters.presentProgress));
});

app.post('/api/v1/progress', ...protectedMutation(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateProgress(req.body);
    const record = store.createProgress(req.body);
    return res.status(201).json(presenters.presentProgress(record));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/v1/progress/:id', ...protectedMutation(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateProgress(req.body, { partial: true });
    const record = store.updateProgress(req.params.id, req.body);

    if (!record) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    return res.json(presenters.presentProgress(record));
  } catch (error) {
    return next(error);
  }
});


app.get('/api/v1/rewards/transactions', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });
  const kind = coerceOptionalString(req.query.kind);
  const cohortId = coerceOptionalString(req.query.cohortId);
  const podId = coerceOptionalString(req.query.podId);
  const mallamId = coerceOptionalString(req.query.mallamId);
  const limit = coerceOptionalNumber(req.query.limit) || 50;
  const scopedStudentIds = new Set(
    store
      .listStudents()
      .filter((student) => (!cohortId || student.cohortId === cohortId) && (!podId || student.podId === podId) && (!mallamId || student.mallamId === mallamId))
      .map((student) => student.id),
  );
  const items = store
    .listRewardTransactions()
    .filter((entry) => (!learner || entry.studentId === learner.id) && (!kind || entry.kind === kind) && (!scopedStudentIds.size || scopedStudentIds.has(entry.studentId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 100)));

  return res.json({
    items,
    meta: {
      learnerId: learner?.id ?? coerceOptionalString(req.query.learnerId),
      learnerCode: coerceOptionalString(req.query.learnerCode),
      cohortId,
      podId,
      mallamId,
      kind,
      count: items.length,
    },
  });
});

app.get('/api/v1/students/:id/rewards/history', (req, res) => {
  const history = rewards.buildRewardHistory(req.params.id, {
    kind: coerceOptionalString(req.query.kind),
    limit: coerceOptionalNumber(req.query.limit) || 20,
  });

  if (!history) {
    return res.status(404).json({ message: 'Student not found' });
  }

  return res.json(history);
});

app.get('/api/v1/rewards/adjustments', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });
  const action = coerceOptionalString(req.query.action);
  const items = rewards
    .listRewardAdjustments()
    .filter((entry) => (!learner || entry.studentId === learner.id) && (!action || entry.action === action))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    items,
    meta: {
      learnerId: learner?.id ?? coerceOptionalString(req.query.learnerId),
      learnerCode: coerceOptionalString(req.query.learnerCode),
      action,
      count: items.length,
    },
  });
});

app.post('/api/v1/rewards/transactions/:id/correct', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = rewards.correctRewardTransaction(req.params.id, {
      xpDelta: req.body?.xpDelta,
      label: req.body?.label,
      reason: req.body?.reason,
      note: req.body?.note,
      metadata: req.body?.metadata,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/rewards/transactions/:id/revoke', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const result = rewards.revokeRewardTransaction(req.params.id, {
      reason: req.body?.reason,
      note: req.body?.note,
      metadata: req.body?.metadata,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    });

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/progress/:id/override', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const record = store.findProgressById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    const nextStatus = coerceOptionalString(req.body?.progressionStatus);
    const nextRecommendedModuleId = coerceOptionalString(req.body?.recommendedNextModuleId);

    if (!nextStatus && !nextRecommendedModuleId) {
      const error = new Error('Provide progressionStatus or recommendedNextModuleId');
      error.statusCode = 400;
      throw error;
    }

    validators.validateProgress({
      studentId: record.studentId,
      subjectId: record.subjectId,
      moduleId: record.moduleId,
      progressionStatus: nextStatus || record.progressionStatus,
      recommendedNextModuleId: nextRecommendedModuleId || record.recommendedNextModuleId,
    }, { partial: true });

    const updated = store.updateProgress(req.params.id, {
      progressionStatus: nextStatus || record.progressionStatus,
      recommendedNextModuleId: nextRecommendedModuleId || record.recommendedNextModuleId,
    });

    const audit = store.createProgressionOverride({
      studentId: record.studentId,
      progressId: record.id,
      action: 'override',
      previousStatus: record.progressionStatus,
      nextStatus: updated.progressionStatus,
      previousRecommendedNextModuleId: record.recommendedNextModuleId,
      nextRecommendedNextModuleId: updated.recommendedNextModuleId,
      reason: req.body?.reason || 'manual_override',
      note: req.body?.note || '',
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    });

    return res.status(201).json(buildProgressionOverrideResponse(audit));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/progression-overrides', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });
  const cohortId = coerceOptionalString(req.query.cohortId);
  const podId = coerceOptionalString(req.query.podId);
  const mallamId = coerceOptionalString(req.query.mallamId);
  const scopedStudentIds = new Set(
    store
      .listStudents()
      .filter((student) => (!cohortId || student.cohortId === cohortId) && (!podId || student.podId === podId) && (!mallamId || student.mallamId === mallamId))
      .map((student) => student.id),
  );
  const items = store
    .listProgressionOverrides()
    .filter((entry) => (!learner || entry.studentId === learner.id) && (!scopedStudentIds.size || scopedStudentIds.has(entry.studentId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(buildProgressionOverrideResponse);

  return res.json({
    items,
    meta: {
      learnerId: learner?.id ?? coerceOptionalString(req.query.learnerId),
      learnerCode: coerceOptionalString(req.query.learnerCode),
      cohortId,
      podId,
      mallamId,
      count: items.length,
    },
  });
});

app.get('/api/v1/progression-overrides/:id', (req, res) => {
  const detail = reporting.buildProgressionOverrideDetail(req.params.id);

  if (!detail) {
    return res.status(404).json({ message: 'Progression override not found' });
  }

  return res.json(detail);
});

app.post('/api/v1/progression-overrides/:id/revoke', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const audit = store.listProgressionOverrides().find((entry) => entry.id === req.params.id) || null;

    if (!audit) {
      return res.status(404).json({ message: 'Progression override not found' });
    }

    if (audit.revokedAt) {
      return res.status(409).json({ message: 'Progression override already revoked' });
    }

    const progress = audit.progressId ? store.findProgressById(audit.progressId) : null;

    if (progress) {
      store.updateProgress(progress.id, {
        progressionStatus: audit.previousStatus || progress.progressionStatus,
        recommendedNextModuleId: audit.previousRecommendedNextModuleId || progress.recommendedNextModuleId,
      });
    }

    store.updateProgressionOverride(audit.id, {
      action: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedBy: req.actor?.name || 'Unknown actor',
      note: req.body?.note || audit.note,
      reason: req.body?.reason || audit.reason,
    });

    return res.json(buildProgressionOverrideResponse(store.listProgressionOverrides().find((entry) => entry.id === audit.id)));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/progression-overrides/:id/reapply', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const audit = store.findProgressionOverrideById(req.params.id);

    if (!audit) {
      return res.status(404).json({ message: 'Progression override not found' });
    }

    const progress = audit.progressId ? store.findProgressById(audit.progressId) : null;

    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    store.updateProgress(progress.id, {
      progressionStatus: audit.nextStatus || progress.progressionStatus,
      recommendedNextModuleId: audit.nextRecommendedNextModuleId || progress.recommendedNextModuleId,
    });

    const applied = store.updateProgressionOverride(audit.id, {
      action: 'override',
      nextStatus: audit.nextStatus || progress.progressionStatus,
      nextRecommendedNextModuleId: audit.nextRecommendedNextModuleId || progress.recommendedNextModuleId,
      revokedAt: null,
      revokedBy: null,
      note: req.body?.note || audit.note,
      reason: req.body?.reason || audit.reason,
    });

    return res.json(buildProgressionOverrideResponse(applied));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sessions/:sessionId/repair', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const session = store.findLessonSessionBySessionId(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const patch = req.body && typeof req.body === 'object' ? req.body : {};
    const before = presenters.presentLessonSession(session);
    const updates = {
      status: patch.status,
      completionState: patch.completionState,
      automationStatus: patch.automationStatus,
      currentStepIndex: patch.currentStepIndex,
      stepsTotal: patch.stepsTotal,
      responsesCaptured: patch.responsesCaptured,
      supportActionsUsed: patch.supportActionsUsed,
      audioCaptures: patch.audioCaptures,
      facilitatorObservations: patch.facilitatorObservations,
      latestReview: patch.latestReview,
      lessonId: patch.lessonId,
      moduleId: patch.moduleId,
      completedAt: patch.completedAt,
      lastActivityAt: patch.lastActivityAt || new Date().toISOString(),
      lastEventType: 'session_repaired',
      sessionId: session.sessionId,
      studentId: session.studentId,
      learnerCode: session.learnerCode,
      startedAt: session.startedAt,
    };

    const repaired = store.upsertLessonSession(updates);
    store.createSessionEventLog({
      sessionId: repaired.sessionId,
      studentId: repaired.studentId,
      lessonId: repaired.lessonId,
      moduleId: repaired.moduleId,
      type: 'session_repaired',
      payload: {
        reason: req.body?.reason || 'manual_repair',
        patch,
        actor: req.actor,
      },
      createdAt: new Date().toISOString(),
    });

    const audit = store.createSessionRepair({
      sessionId: repaired.sessionId,
      learnerId: repaired.studentId,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason || 'manual_repair',
      patch,
      before,
      after: presenters.presentLessonSession(repaired),
    });

    return res.status(201).json({
      repair: audit,
      session: presenters.presentLessonSession(repaired),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sessions/:sessionId/abandon', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const session = store.findLessonSessionBySessionId(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const before = presenters.presentLessonSession(session);
    const updated = store.upsertLessonSession({
      sessionId: session.sessionId,
      studentId: session.studentId,
      learnerCode: session.learnerCode,
      lessonId: session.lessonId,
      moduleId: session.moduleId,
      startedAt: session.startedAt,
      status: 'abandoned',
      completionState: 'abandoned',
      lastActivityAt: req.body?.lastActivityAt || new Date().toISOString(),
      lastEventType: 'session_abandoned',
      latestReview: session.latestReview,
      currentStepIndex: session.currentStepIndex,
      stepsTotal: session.stepsTotal,
      responsesCaptured: session.responsesCaptured,
      supportActionsUsed: session.supportActionsUsed,
      audioCaptures: session.audioCaptures,
      facilitatorObservations: session.facilitatorObservations,
      automationStatus: session.automationStatus,
    });

    store.createSessionEventLog({
      sessionId: updated.sessionId,
      studentId: updated.studentId,
      lessonId: updated.lessonId,
      moduleId: updated.moduleId,
      type: 'session_abandoned',
      payload: { reason: req.body?.reason || 'manual_abandon', actor: req.actor },
      createdAt: new Date().toISOString(),
    });

    const audit = store.createSessionRepair({
      sessionId: updated.sessionId,
      learnerId: updated.studentId,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason || 'manual_abandon',
      patch: { action: 'abandon' },
      before,
      after: presenters.presentLessonSession(updated),
    });

    return res.status(201).json({ repair: audit, session: presenters.presentLessonSession(updated) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/learner-app/sessions/:sessionId/reopen', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const session = store.findLessonSessionBySessionId(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const before = presenters.presentLessonSession(session);
    const updated = store.upsertLessonSession({
      sessionId: session.sessionId,
      studentId: session.studentId,
      learnerCode: session.learnerCode,
      lessonId: session.lessonId,
      moduleId: session.moduleId,
      startedAt: session.startedAt,
      status: 'in_progress',
      completionState: 'inProgress',
      completedAt: null,
      lastActivityAt: req.body?.lastActivityAt || new Date().toISOString(),
      lastEventType: 'session_reopened',
      latestReview: req.body?.latestReview !== undefined ? req.body.latestReview : session.latestReview,
      currentStepIndex: req.body?.currentStepIndex !== undefined ? req.body.currentStepIndex : session.currentStepIndex,
      stepsTotal: req.body?.stepsTotal !== undefined ? req.body.stepsTotal : session.stepsTotal,
      responsesCaptured: session.responsesCaptured,
      supportActionsUsed: session.supportActionsUsed,
      audioCaptures: session.audioCaptures,
      facilitatorObservations: session.facilitatorObservations,
      automationStatus: session.automationStatus,
    });

    store.createSessionEventLog({
      sessionId: updated.sessionId,
      studentId: updated.studentId,
      lessonId: updated.lessonId,
      moduleId: updated.moduleId,
      type: 'session_reopened',
      payload: { reason: req.body?.reason || 'manual_reopen', actor: req.actor },
      createdAt: new Date().toISOString(),
    });

    const audit = store.createSessionRepair({
      sessionId: updated.sessionId,
      learnerId: updated.studentId,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason || 'manual_reopen',
      patch: { action: 'reopen' },
      before,
      after: presenters.presentLessonSession(updated),
    });

    return res.status(201).json({ repair: audit, session: presenters.presentLessonSession(updated) });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/sessions/:sessionId/rebuild-from-events', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const result = store.rebuildLessonSessionFromEventLog(req.params.sessionId, {
      apply: Boolean(req.body?.apply),
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason || 'event_log_rebuild',
    });

    return res.status(result.applied ? 201 : 200).json(result);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/session-repairs', (req, res) => {
  const learner = resolveStudentScope({ learnerId: req.query.learnerId, learnerCode: req.query.learnerCode });
  const cohortId = coerceOptionalString(req.query.cohortId);
  const podId = coerceOptionalString(req.query.podId);
  const mallamId = coerceOptionalString(req.query.mallamId);
  const scopedStudentIds = new Set(
    store
      .listStudents()
      .filter((student) => (!cohortId || student.cohortId === cohortId) && (!podId || student.podId === podId) && (!mallamId || student.mallamId === mallamId))
      .map((student) => student.id),
  );
  const items = store
    .listSessionRepairs()
    .filter((entry) => (!learner || entry.learnerId === learner.id) && (!scopedStudentIds.size || scopedStudentIds.has(entry.learnerId)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    items,
    meta: {
      learnerId: learner?.id ?? coerceOptionalString(req.query.learnerId),
      learnerCode: coerceOptionalString(req.query.learnerCode),
      cohortId,
      podId,
      mallamId,
      count: items.length,
    },
  });
});

app.get('/api/v1/admin/progression-overrides/summary', requireRole(['admin']), (req, res) => {
  res.json(reporting.buildAdminControlsReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});

app.get('/api/v1/admin/session-repairs/summary', requireRole(['admin']), (req, res) => {
  res.json(reporting.buildAdminControlsReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});


app.get('/api/v1/session-repairs/:id', (req, res) => {
  const detail = reporting.buildSessionRepairDetail(req.params.id);

  if (!detail) {
    return res.status(404).json({ message: 'Session repair not found' });
  }

  return res.json(detail);
});

app.post('/api/v1/session-repairs/:id/revert', ...protectedMutation(['admin', 'teacher']), (req, res, next) => {
  try {
    const repair = store.findSessionRepairById(req.params.id);

    if (!repair) {
      return res.status(404).json({ message: 'Session repair not found' });
    }

    if (!repair.before || typeof repair.before !== 'object') {
      const error = new Error('Repair does not contain a revertable snapshot');
      error.statusCode = 400;
      throw error;
    }

    const existing = store.findLessonSessionBySessionId(repair.sessionId);

    if (!existing) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const reverted = store.upsertLessonSession({
      sessionId: repair.before.sessionId || repair.sessionId,
      studentId: repair.before.studentId || existing.studentId,
      learnerCode: repair.before.learnerCode !== undefined ? repair.before.learnerCode : existing.learnerCode,
      lessonId: repair.before.lessonId !== undefined ? repair.before.lessonId : existing.lessonId,
      moduleId: repair.before.moduleId !== undefined ? repair.before.moduleId : existing.moduleId,
      status: repair.before.status !== undefined ? repair.before.status : existing.status,
      completionState: repair.before.completionState !== undefined ? repair.before.completionState : existing.completionState,
      automationStatus: repair.before.automationStatus !== undefined ? repair.before.automationStatus : existing.automationStatus,
      currentStepIndex: repair.before.currentStepIndex !== undefined ? repair.before.currentStepIndex : existing.currentStepIndex,
      stepsTotal: repair.before.stepsTotal !== undefined ? repair.before.stepsTotal : existing.stepsTotal,
      responsesCaptured: repair.before.responsesCaptured !== undefined ? repair.before.responsesCaptured : existing.responsesCaptured,
      supportActionsUsed: repair.before.supportActionsUsed !== undefined ? repair.before.supportActionsUsed : existing.supportActionsUsed,
      audioCaptures: repair.before.audioCaptures !== undefined ? repair.before.audioCaptures : existing.audioCaptures,
      facilitatorObservations: repair.before.facilitatorObservations !== undefined ? repair.before.facilitatorObservations : existing.facilitatorObservations,
      latestReview: repair.before.latestReview !== undefined ? repair.before.latestReview : existing.latestReview,
      startedAt: repair.before.startedAt !== undefined ? repair.before.startedAt : existing.startedAt,
      completedAt: repair.before.completedAt !== undefined ? repair.before.completedAt : existing.completedAt,
      lastActivityAt: req.body?.lastActivityAt || new Date().toISOString(),
      lastEventType: 'session_repair_reverted',
    });

    store.createSessionEventLog({
      sessionId: reverted.sessionId,
      studentId: reverted.studentId,
      lessonId: reverted.lessonId,
      moduleId: reverted.moduleId,
      type: 'session_repair_reverted',
      payload: {
        sourceRepairId: repair.id,
        reason: req.body?.reason || 'manual_revert',
        actor: req.actor,
      },
      createdAt: new Date().toISOString(),
    });

    const audit = store.createSessionRepair({
      sessionId: reverted.sessionId,
      learnerId: reverted.studentId,
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
      reason: req.body?.reason || 'manual_revert',
      patch: { action: 'revert-repair', sourceRepairId: repair.id },
      before: presenters.presentLessonSession(existing),
      after: presenters.presentLessonSession(reverted),
    });

    return res.status(201).json({
      revertedFrom: repair.id,
      repair: audit,
      session: presenters.presentLessonSession(reverted),
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/observations', (_req, res) => {
  res.json(store.listObservations().map(presenters.presentObservation));
});

app.post('/api/v1/observations', ...protectedMutation(['admin', 'teacher', 'facilitator']), (req, res, next) => {
  try {
    validators.validateObservation(req.body);
    const record = store.createObservation(req.body);
    return res.status(201).json(presenters.presentObservation(record));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/reports/overview', (_req, res) => {
  res.json(reporting.buildOverviewReport());
});

app.get('/api/v1/reports/ngo-summary', (req, res) => {
  res.json(reporting.buildNgoSummary({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
  }));
});

app.get('/api/v1/reports/engagement', (req, res) => {
  res.json(reporting.buildEngagementReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
  }));
});

app.get('/api/v1/reports/rewards', (req, res) => {
  res.json(reporting.buildRewardsReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});


app.get('/api/v1/reports/reward-fulfillment', (req, res) => {
  res.json(rewards.buildRewardFulfillmentReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});

app.get('/api/v1/reports/admin-controls', (req, res) => {
  res.json(reporting.buildAdminControlsReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});

app.get('/api/v1/reports/operations', (req, res) => {
  res.json(reporting.buildOperationsReport({
    cohortId: coerceOptionalString(req.query.cohortId),
    podId: coerceOptionalString(req.query.podId),
    mallamId: coerceOptionalString(req.query.mallamId),
    subjectId: coerceOptionalString(req.query.subjectId),
    learnerId: coerceOptionalString(req.query.learnerId),
    since: coerceOptionalString(req.query.since),
    until: coerceOptionalString(req.query.until),
    limit: Number(req.query.limit || 20),
  }));
});

app.get('/api/v1/reports/storage', requireRole(['admin']), (req, res) => {
  res.json(reporting.buildStorageReport({
    limit: Number(req.query.limit || 10),
  }));
});

app.get('/api/v1/admin/storage/status', requireRole(['admin']), (_req, res) => {
  res.json(store.getStorageStatus());
});

app.get('/api/v1/admin/storage/integrity', requireRole(['admin']), (_req, res) => {
  res.json(store.getStorageIntegrityReport());
});
app.get('/api/v1/admin/storage/freshness', requireRole(['admin']), (_req, res) => {
  res.json(store.buildStorageFreshnessSignals());
});

app.get('/api/v1/admin/storage/drift', requireRole(['admin']), (_req, res) => {
  res.json(store.buildStorageDriftReport());
});

app.post('/api/v1/admin/storage/repair-drift', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.status(201).json(store.repairStorageDrift({
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});


app.get('/api/v1/admin/storage/operations', requireRole(['admin']), (req, res) => {
  res.json(reporting.buildStorageOperationsReport({
    limit: Number(req.query.limit || 20),
    kind: coerceOptionalString(req.query.kind),
    actorName: coerceOptionalString(req.query.actorName),
  }));
});

app.get('/api/v1/admin/storage/mutations', requireRole(['admin']), (req, res) => {
  const status = store.getStorageStatus();
  const data = require('./data');
  const limit = Number(req.query.limit || 20);
  const items = typeof data.storage?.listMutations === 'function' ? data.storage.listMutations(limit) : [];

  return res.json({
    items,
    summary: {
      total: status?.journal?.total || items.length,
      latestAt: status?.journal?.latestAt || items[0]?.createdAt || null,
      restorable: items.filter((entry) => entry.hasSnapshot).length,
    },
    status,
  });
});

app.get('/api/v1/admin/storage/mutations/:id', requireRole(['admin']), (req, res) => {
  const mutation = store.getStorageMutationDetail(req.params.id);

  if (!mutation) {
    return res.status(404).json({ message: 'Storage mutation not found' });
  }

  return res.json({ mutation });
});

app.get('/api/v1/admin/storage/operations/:id', requireRole(['admin']), (req, res) => {
  const operation = store.findStorageOperationById(req.params.id);

  if (!operation) {
    return res.status(404).json({ message: 'Storage operation not found' });
  }

  return res.json(operation);
});

app.post('/api/v1/admin/storage/repair-integrity', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.status(201).json(store.repairStorageIntegrity({
      apply: Boolean(req.body?.apply),
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/admin/storage/export', requireRole(['admin']), (_req, res) => {
  res.json(store.exportStorageSnapshot());
});

app.post('/api/v1/admin/storage/import/preview', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.json(store.previewStorageImport({
      snapshot: req.body?.snapshot,
      merge: Boolean(req.body?.merge),
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/import', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-import'), adminMutationThrottle, (req, res, next) => {
  try {
    return res.status(201).json(store.importStorageSnapshot({
      snapshot: req.body?.snapshot,
      merge: Boolean(req.body?.merge),
      createCheckpoint: req.body?.createCheckpoint !== false,
      force: Boolean(req.body?.force),
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/reload', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-reload'), (req, res, next) => {
  try {
    return res.status(201).json(store.reloadStorageSnapshot({
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/reconcile-cache', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.status(201).json(store.reconcileStorageCache({
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/recover-primary-from-cache', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-recover-primary-from-cache'), (req, res, next) => {
  try {
    return res.status(201).json(store.recoverStoragePrimaryFromWarmCache({
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/admin/storage/backups', requireRole(['admin']), (req, res) => {
  res.json({
    items: store.listStorageBackups(Number(req.query.limit || 20)),
    status: store.getStorageStatus(),
  });
});

app.post('/api/v1/admin/storage/checkpoint', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    return res.status(201).json(store.checkpointStorage(coerceOptionalString(req.body?.label) || 'manual-checkpoint', {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/v1/admin/storage/backups', ...protectedMutation(['admin']), (req, res, next) => {
  try {
    const backupPath = coerceOptionalString(req.body?.backupPath) || coerceOptionalString(req.query.backupPath);

    if (!backupPath) {
      const error = new Error('Provide backupPath');
      error.statusCode = 400;
      throw error;
    }

    return res.json(store.deleteStorageBackup(backupPath, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/restore-mutation', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-restore-mutation'), adminMutationThrottle, (req, res, next) => {
  try {
    const mutationId = Number(req.body?.mutationId);

    if (!Number.isInteger(mutationId) || mutationId <= 0) {
      const error = new Error('Provide mutationId');
      error.statusCode = 400;
      throw error;
    }

    return res.json(store.restoreStorageMutation(mutationId, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/restore', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-restore-backup'), adminMutationThrottle, (req, res, next) => {
  try {
    const backupPath = coerceOptionalString(req.body?.backupPath);

    if (!backupPath) {
      const error = new Error('Provide backupPath');
      error.statusCode = 400;
      throw error;
    }

    return res.json(store.restoreStorageBackup(backupPath, {
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/v1/admin/storage/recovery', requireRole(['admin']), (req, res) => {
  const limit = Number(req.query.limit || 10);
  const backups = store.listStorageBackups(limit);
  const latestBackup = backups[0] || null;
  const storageReport = reporting.buildStorageReport({ limit });
  const operationsReport = reporting.buildStorageOperationsReport({
    limit,
    kind: coerceOptionalString(req.query.kind),
    actorName: coerceOptionalString(req.query.actorName),
  });
  const latestMutation = typeof store.getStorageMutationDetail === 'function' && storageReport.journal?.recent?.[0]?.id
    ? store.getStorageMutationDetail(storageReport.journal.recent[0].id)
    : null;
  const recoveryPlan = typeof store.buildStorageRecoveryPlan === 'function'
    ? store.buildStorageRecoveryPlan({
        label: coerceOptionalString(req.query.label),
        limit,
      })
    : null;

  return res.json({
    generatedAt: new Date().toISOString(),
    status: store.getStorageStatus(),
    latestBackup,
    latestMutation,
    integrity: store.getStorageIntegrityReport(),
    operations: operationsReport,
    storage: storageReport,
    recoveryPlan,
  });
});

app.get('/api/v1/admin/storage/recovery-plan', requireRole(['admin']), (req, res) => {
  res.json(store.buildStorageRecoveryPlan({
    label: coerceOptionalString(req.query.label),
    limit: Number(req.query.limit || 10),
  }));
});

app.post('/api/v1/admin/storage/restore-smart', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-restore-smart'), adminMutationThrottle, (req, res, next) => {
  try {
    return res.status(201).json(store.restoreStorageSmart({
      label: coerceOptionalString(req.body?.label),
      backupPath: coerceOptionalString(req.body?.backupPath),
      mutationId: req.body?.mutationId,
      prefer: coerceOptionalString(req.body?.prefer) || 'auto',
      actorName: req.actor?.name,
      actorRole: req.actor?.role,
    }));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/v1/admin/storage/restore-latest', ...protectedMutation(['admin']), requireConfirmedDangerousAdminMutation('storage-restore-latest'), adminMutationThrottle, (req, res, next) => {
  try {
    const backups = store.listStorageBackups(100);
    const label = coerceOptionalString(req.body?.label);
    const candidate = label
      ? backups.find((entry) => [entry.label, entry.name, entry.path].some((value) => String(value || '').toLowerCase().includes(label.toLowerCase()))) || null
      : backups[0] || null;

    if (!candidate?.path) {
      const error = new Error(label ? `No backup found for label: ${label}` : 'No backups available');
      error.statusCode = 404;
      throw error;
    }

    return res.status(201).json({
      selectedBackup: candidate,
      result: store.restoreStorageBackup(candidate.path, {
        actorName: req.actor?.name,
        actorRole: req.actor?.role,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, _next) => {
  const statusCode = error.statusCode || (error.type === 'entity.parse.failed' ? 400 : 500);
  res.status(statusCode).json({
    message: error.type === 'entity.parse.failed'
      ? 'Invalid JSON body.'
      : error.message || 'Internal server error',
    requestId: req.requestId || null,
    ...(error.details ? { details: error.details } : {}),
  });
});

function startServer(port = process.env.PORT || 4000) {
  return app.listen(port, () => {
    const audit = buildConfigAudit();
    console.log(`Lumo API listening on port ${port}`);

    if (audit.warnings.length) {
      console.warn(`[lumo-api] config warnings: ${audit.warnings.join(' | ')}`);
    }

    if (audit.errors.length) {
      console.warn(`[lumo-api] config errors: ${audit.errors.join(' | ')}`);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};