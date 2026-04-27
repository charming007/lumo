const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-geo-device-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';

const { startServer } = require('../src/main');

let server;
let baseUrl;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const raw = await response.text();
  return {
    status: response.status,
    body: raw ? JSON.parse(raw) : null,
  };
}

test.before(async () => {
  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('states and local governments can be created and filtered for admin workflows', async () => {
  const state = await request('/api/v1/states', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ id: 'state-admin-test', code: 'AT', name: 'Admin Test State' }),
  });

  assert.equal(state.status, 201, JSON.stringify(state.body));
  assert.equal(state.body.name, 'Admin Test State');

  const lga = await request('/api/v1/local-governments', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ id: 'lga-admin-test', stateId: 'state-admin-test', name: 'Admin Test LGA', code: 'AT-LGA' }),
  });

  assert.equal(lga.status, 201, JSON.stringify(lga.body));
  assert.equal(lga.body.stateId, 'state-admin-test');

  const filtered = await request('/api/v1/local-governments?stateId=state-admin-test');
  assert.equal(filtered.status, 200);
  assert.deepEqual(filtered.body.map((item) => item.id), ['lga-admin-test']);
});

test('geography create routes reject duplicate ids instead of silently polluting admin filters', async () => {
  const duplicateState = await request('/api/v1/states', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ id: 'state-jigawa', code: 'JG', name: 'Jigawa Duplicate' }),
  });

  assert.equal(duplicateState.status, 409, JSON.stringify(duplicateState.body));
  assert.match(String(duplicateState.body?.message || ''), /State already exists/i);

  const duplicateLga = await request('/api/v1/local-governments', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ id: 'lga-dutse', stateId: 'state-jigawa', name: 'Dutse Duplicate', code: 'JG-DUT-2' }),
  });

  assert.equal(duplicateLga.status, 409, JSON.stringify(duplicateLga.body));
  assert.match(String(duplicateLga.body?.message || ''), /Local government already exists/i);
});

test('device registrations inherit pod geography and primary mallam through the API', async () => {
  const created = await request('/api/v1/device-registrations', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      podId: 'pod-2',
      deviceIdentifier: 'lumo-tablet-kaduna-02',
      serialNumber: 'KAD-TAB-002',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.podId, 'pod-2');
  assert.equal(created.body.stateId, 'state-kaduna');
  assert.equal(created.body.localGovernmentId, 'lga-igabi');
  assert.equal(created.body.assignedMallamId, 'teacher-2');
  assert.equal(created.body.assignedMallamName, 'Mallam Musa Ibrahim');

  const listed = await request('/api/v1/device-registrations?podId=pod-2');
  assert.equal(listed.status, 200);
  assert.equal(listed.body.some((item) => item.deviceIdentifier === 'lumo-tablet-kaduna-02'), true, JSON.stringify(listed.body));
});

test('device registrations reject a mallam that does not match the pod primary mallam', async () => {
  const created = await request('/api/v1/device-registrations', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      podId: 'pod-1',
      assignedMallamId: 'teacher-2',
      deviceIdentifier: 'lumo-tablet-kano-wrong-mallam',
    }),
  });

  assert.equal(created.status, 400, JSON.stringify(created.body));
  assert.match(String(created.body?.message || ''), /pod primary mallam/i);
});

test('device registration updates keep mallam assignment canonical to the pod even if stale values were stored earlier', async () => {
  const created = await request('/api/v1/device-registrations', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      podId: 'pod-1',
      deviceIdentifier: 'lumo-tablet-kano-canonical-update',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));

  const repository = require('../src/repository');
  const stored = repository.findDeviceRegistrationByIdentifier('lumo-tablet-kano-canonical-update');
  stored.assignedMallamId = 'teacher-2';

  const updated = await request(`/api/v1/device-registrations/${stored.id}`, {
    method: 'PATCH',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ serialNumber: 'KANO-CANONICAL-001' }),
  });

  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.assignedMallamId, 'teacher-1');
  assert.equal(updated.body.assignedMallamName, 'Mallama Amina Yusuf');
});

test('device registration presentation prefers pod canonical geography over stale stored device geography', async () => {
  const created = await request('/api/v1/device-registrations', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      podId: 'pod-1',
      deviceIdentifier: 'lumo-tablet-kano-stale-geo',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));

  const repository = require('../src/repository');
  const stored = repository.findDeviceRegistrationByIdentifier('lumo-tablet-kano-stale-geo');
  stored.centerId = 'center-2';
  stored.stateId = 'state-kaduna';
  stored.localGovernmentId = 'lga-igabi';

  const listed = await request('/api/v1/device-registrations?podId=pod-1');
  assert.equal(listed.status, 200, JSON.stringify(listed.body));

  const presented = listed.body.find((item) => item.deviceIdentifier === 'lumo-tablet-kano-stale-geo');
  assert.ok(presented, JSON.stringify(listed.body));
  assert.equal(presented.centerId, 'center-1');
  assert.equal(presented.centerName, 'Kano Learning Center A');
  assert.equal(presented.stateId, 'state-kano');
  assert.equal(presented.stateName, 'Kano');
  assert.equal(presented.localGovernmentId, 'lga-nassarawa');
  assert.equal(presented.localGovernmentName, 'Nassarawa');
});

test('pods reject multiple primary mallams', async () => {
  const created = await request('/api/v1/pods', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      centerId: 'center-1',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
      podName: 'Too Many Mallams',
      mallamIds: ['teacher-1', 'teacher-2'],
    }),
  });

  assert.equal(created.status, 400, JSON.stringify(created.body));
  assert.match(String(created.body?.message || ''), /one primary mallam|exactly one primary mallam/i);
});

test('reward queue summary exposes the LMS contract fields used by the rewards admin surface', async () => {
  const queue = await request('/api/v1/rewards/requests?limit=5');

  assert.equal(queue.status, 200, JSON.stringify(queue.body));
  assert.equal(typeof queue.body.summary.attentionCount, 'number');
  assert.equal(typeof queue.body.summary.urgentCount, 'number');
  assert.equal(typeof queue.body.summary.averageAgeDays, 'number');
  assert.equal(queue.body.summary.attentionCount, queue.body.summary.open);
  assert.equal(queue.body.summary.urgentCount, queue.body.summary.staleOpen);
  assert.equal(queue.body.summary.averageAgeDays, queue.body.summary.avgOpenAgeDays);
});

test('pod creation generates the required state-LG-Pod_name label and persists geography', async () => {
  const created = await request('/api/v1/pods', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      centerId: 'center-1',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
      podName: 'Girls Alpha',
      type: 'community-pod',
      status: 'active',
      capacity: 24,
      learnersActive: 0,
      connectivity: 'offline-first',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.label, 'kano-nassarawa-girls_alpha');
  assert.equal(created.body.stateId, 'state-kano');
  assert.equal(created.body.localGovernmentId, 'lga-nassarawa');
});

test('pod updates can persist geography without changing cohort semantics', async () => {
  const updated = await request('/api/v1/pods/pod-1', {
    method: 'PATCH',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ localGovernmentId: 'lga-fagge' }),
  });

  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.localGovernmentId, 'lga-fagge');
  assert.equal(updated.body.stateId, 'state-kano');

  const cohorts = await request('/api/v1/cohorts');
  assert.equal(cohorts.status, 200);
  assert.equal(cohorts.body.find((item) => item.id === 'cohort-1').podId, 'pod-1');
});

test('pod geography updates regenerate canonical pod labels so learner cards stay aligned with live tablet geography', async () => {
  const created = await request('/api/v1/pods', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      centerId: 'center-1',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
      podName: 'Pod 02',
      status: 'active',
      mallamIds: ['teacher-1'],
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.label, 'kano-nassarawa-pod_02');

  const updated = await request(`/api/v1/pods/${created.body.id}`, {
    method: 'PATCH',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      stateId: 'state-kaduna',
      localGovernmentId: 'lga-kagarko',
    }),
  });

  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.stateId, 'state-kaduna');
  assert.equal(updated.body.localGovernmentId, 'lga-kagarko');
  assert.equal(updated.body.label, 'kaduna-kagarko-pod_02');
});

test('student creation accepts pod-only placement so geography fields stay helper filters', async () => {
  const created = await request('/api/v1/students', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({
      name: 'Pod Canonical Learner',
      age: 9,
      gender: 'female',
      podId: 'pod-1',
      mallamId: 'teacher-1',
      level: 'beginner',
      stage: 'foundation-a',
      attendanceRate: 0.9,
      guardianName: 'Guardian Pending',
      deviceAccess: 'shared-tablet',
      stateId: 'state-kano',
      localGovernmentId: 'lga-nassarawa',
    }),
  });

  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.podId, 'pod-1');
  assert.equal(created.body.cohortId, null);
  assert.equal(created.body.mallamId, 'teacher-1');
  assert.equal(created.body.stateId, 'state-kano');
  assert.equal(created.body.localGovernmentId, 'lga-fagge');
});

test('admin geography edits survive a storage reload instead of snapping back to the baked Nigeria seed', async () => {
  const statePatch = await request('/api/v1/states/state-kano', {
    method: 'PATCH',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ name: 'Kano Persisted' }),
  });

  assert.equal(statePatch.status, 200, JSON.stringify(statePatch.body));
  assert.equal(statePatch.body.name, 'Kano Persisted');

  const lgaCreate = await request('/api/v1/local-governments', {
    method: 'POST',
    headers: { 'x-lumo-role': 'admin' },
    body: JSON.stringify({ id: 'lga-kano-persisted', stateId: 'state-kano', name: 'Kano Persisted LGA', code: 'KN-PERSIST' }),
  });

  assert.equal(lgaCreate.status, 201, JSON.stringify(lgaCreate.body));

  const data = require('../src/data');
  data.reload();

  const reloadedState = data.states.find((item) => item.id === 'state-kano');
  const reloadedLga = data.localGovernments.find((item) => item.id === 'lga-kano-persisted');

  assert.equal(reloadedState?.name, 'Kano Persisted');
  assert.equal(reloadedLga?.name, 'Kano Persisted LGA');
});
