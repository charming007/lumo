import test from 'node:test';
import assert from 'node:assert/strict';

import { isPilotControlPlaneEnabled } from './pilot-control-plane.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousPilotFlag = process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;

  if (env.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = env.NODE_ENV;
  }

  if (env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE === undefined) {
    delete process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
  } else {
    process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE = env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
  }

  try {
    fn();
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousPilotFlag === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE = previousPilotFlag;
    }
  }
}

test('pilot control plane defaults on in production deploys', () => {
  withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: undefined }, () => {
    assert.equal(isPilotControlPlaneEnabled(), true);
  });
});

test('pilot control plane stays off by default outside production', () => {
  withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: undefined }, () => {
    assert.equal(isPilotControlPlaneEnabled(), false);
  });
});

test('explicit env flag still wins over the runtime default', () => {
  withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: 'false' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), false);
  });

  withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: ' true ' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), true);
  });
});
