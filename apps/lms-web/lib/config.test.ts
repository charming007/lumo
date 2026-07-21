import test from 'node:test';
import assert from 'node:assert/strict';

const CONFIG_MODULE_URL = new URL('./config.ts', import.meta.url);

async function loadConfigWithEnv(env: Record<string, string | undefined>) {
  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  };

  if (env.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = env.NODE_ENV;
  }

  if (env.NEXT_PUBLIC_API_BASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL;
  }

  try {
    return await import(`${CONFIG_MODULE_URL.href}?case=${encodeURIComponent(JSON.stringify(env))}&ts=${Date.now()}`);
  } finally {
    if (previousEnv.NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnv.NODE_ENV;
    }

    if (previousEnv.NEXT_PUBLIC_API_BASE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = previousEnv.NEXT_PUBLIC_API_BASE_URL;
    }
  }
}

test('production config blocks NEXT_PUBLIC_API_BASE_URL values that include nested API paths', async () => {
  const config = await loadConfigWithEnv({
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app/api/v1',
  });

  assert.equal(config.API_BASE_DIAGNOSTIC.deploymentBlocked, true);
  assert.match(config.API_BASE_DIAGNOSTIC.blockerDetail, /API origin only/i);
});

test('production config allows a root-origin NEXT_PUBLIC_API_BASE_URL', async () => {
  const config = await loadConfigWithEnv({
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_BASE_URL: 'https://lumo-api-production-303a.up.railway.app',
  });

  assert.equal(config.API_BASE_DIAGNOSTIC.deploymentBlocked, false);
  assert.equal(config.API_BASE, 'https://lumo-api-production-303a.up.railway.app');
});
