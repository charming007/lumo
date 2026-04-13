const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-test-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';

const reporting = require('../src/reporting');
const store = require('../src/store');

test('buildRewardsReport returns reward ops summary and scoped details', () => {
  const report = reporting.buildRewardsReport({ limit: 5 });

  assert.equal(report.scope.learnerCount > 0, true);
  assert.equal(report.summary.transactionCount >= 1, true);
  assert.ok(Array.isArray(report.dailyXpTrend));
  assert.ok(Array.isArray(report.learnerBreakdown));
  assert.ok(Array.isArray(report.leaderboard));
});

test('storage snapshot export exposes persisted data and db metadata', () => {
  const snapshot = store.exportStorageSnapshot();
  const status = store.getStorageStatus();

  assert.equal(snapshot.mode, 'file');
  assert.ok(snapshot.snapshot.students);
  assert.equal(status.db.mode, 'file');
  assert.equal(status.db.persistent, true);
});

test('storage integrity repair dry-run reports without mutating data', () => {
  const before = store.listRewardRedemptionRequests().length;
  const result = store.repairStorageIntegrity({ apply: false });
  const after = store.listRewardRedemptionRequests().length;

  assert.equal(result.apply, false);
  assert.equal(before, after);
  assert.ok(result.report.summary);
});
