const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-admin-linkage-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const repository = require('../src/repository');
const validators = require('../src/validators');
const presenters = require('../src/presenters');

test('student validation allows omitted podId when cohort and scoped mallam agree, and repository derives linkage', () => {
  const payload = {
    name: 'Safiya Test',
    age: 10,
    cohortId: 'cohort-1',
    mallamId: 'teacher-1',
  };

  assert.doesNotThrow(() => validators.validateStudent(payload));
  const student = repository.createStudent(payload);
  assert.equal(student.cohortId, 'cohort-1');
  assert.equal(student.podId, 'pod-1');
  assert.equal(student.mallamId, 'teacher-1');

  const presented = presenters.presentStudent(student);
  assert.equal(presented.stateId, 'state-kano');
  assert.equal(presented.localGovernmentId, 'lga-nassarawa');
});

test('student validation blocks cross-wired cohort and pod combinations', () => {
  assert.throws(
    () => validators.validateStudent({
      name: 'Broken Link',
      age: 9,
      cohortId: 'cohort-1',
      podId: 'pod-2',
      mallamId: 'teacher-2',
    }),
    /Student podId must match cohort podId/,
  );
});

test('teacher-pod linkage stays bidirectional when teacher coverage is created from the teacher side', () => {
  const pod = repository.createPod({
    centerId: 'center-1',
    stateId: 'state-kano',
    localGovernmentId: 'lga-nassarawa',
    label: 'Sync Test Pod',
  });

  const mallam = repository.createTeacher({
    name: 'Mallama New',
    displayName: 'Mallama New',
    centerId: 'center-1',
    podIds: [pod.id],
  });

  const refreshedPod = repository.findPodById(pod.id);
  assert.deepEqual(refreshedPod.mallamIds, [mallam.id], JSON.stringify(refreshedPod));
  assert.ok(repository.findTeacherById(mallam.id).podIds.includes(pod.id));
});

test('student pod stays anchored to cohort pod and keeps its mallam derived from that pod', () => {
  const payload = {
    name: 'Pod Anchored Learner',
    age: 9,
    cohortId: 'cohort-1',
    mallamId: 'teacher-1',
  };

  const student = repository.createStudent(payload);
  const kadunaMallam = repository.updateTeacher('teacher-2', { podIds: ['pod-2'], primaryPodId: 'pod-2' });
  const updated = repository.updateStudent(student.id, { mallamId: kadunaMallam.id });

  assert.equal(updated.podId, 'pod-1');
  assert.equal(updated.mallamId, 'teacher-1');
});

test('student presenter falls back to the pod primary mallam when learner record mallam is stale', () => {
  const student = repository.createStudent({
    name: 'Presenter Fallback Learner',
    age: 8,
    cohortId: 'cohort-1',
    podId: 'pod-1',
  });

  const updated = repository.updateStudent(student.id, { mallamId: null });
  const presented = presenters.presentStudent(updated);

  assert.equal(presented.podId, 'pod-1');
  assert.equal(presented.mallamId, 'teacher-1');
  assert.equal(presented.mallamName, 'Mallama Amina Yusuf');
});

test('student repository keeps mallam derived from pod even when update payload tries to override it', () => {
  const student = repository.createStudent({
    name: 'Derived Mallam Learner',
    age: 8,
    cohortId: 'cohort-1',
    mallamId: 'teacher-1',
  });

  const updated = repository.updateStudent(student.id, { mallamId: 'teacher-2' });

  assert.equal(updated.podId, 'pod-1');
  assert.equal(updated.mallamId, 'teacher-1');
});

test('device presenter prefers the pod primary mallam over stale stored assignment data', () => {
  const record = repository.createDeviceRegistration({
    podId: 'pod-1',
    deviceIdentifier: 'lumo-tablet-kano-canonical-device',
  });

  record.assignedMallamId = 'teacher-2';

  const presented = presenters.presentDeviceRegistration(record);
  assert.equal(presented.podId, 'pod-1');
  assert.equal(presented.assignedMallamId, 'teacher-1');
  assert.equal(presented.assignedMallamName, 'Mallama Amina Yusuf');
});
