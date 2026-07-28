import test from 'node:test';
import assert from 'node:assert/strict';

import { isPilotControlPlaneEnabled } from './pilot-control-plane.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const processEnv = process.env as Record<string, string | undefined>;
  const previousNodeEnv = processEnv.NODE_ENV;
  const previousPilotFlag = processEnv.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;

  if (env.NODE_ENV === undefined) {
    delete processEnv.NODE_ENV;
  } else {
    processEnv.NODE_ENV = env.NODE_ENV;
  }

  if (env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE === undefined) {
    delete processEnv.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
  } else {
    processEnv.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE = env.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
  }

  try {
    fn();
  } finally {
    if (previousNodeEnv === undefined) {
      delete processEnv.NODE_ENV;
    } else {
      processEnv.NODE_ENV = previousNodeEnv;
    }

    if (previousPilotFlag === undefined) {
      delete processEnv.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE;
    } else {
      processEnv.NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE = previousPilotFlag;
    }
  }
}

test('pilot control plane stays on by default in production deploys', () => {
  withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: undefined }, () => {
    assert.equal(isPilotControlPlaneEnabled(), true);
  });
});

test('pilot control plane stays off by default outside production', () => {
  withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: undefined }, () => {
    assert.equal(isPilotControlPlaneEnabled(), false);
  });
});

test('explicit env flag still wins over the production-safe default', () => {
  withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: 'false' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), false);
  });

  withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: ' true ' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), true);
  });

  withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: ' true ' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), true);
  });

  withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_ENABLE_PILOT_CONTROL_PLANE: ' false ' }, () => {
    assert.equal(isPilotControlPlaneEnabled(), false);
  });
});
