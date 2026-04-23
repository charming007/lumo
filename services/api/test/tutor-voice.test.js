const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumo-api-tutor-voice-'));
process.env.LUMO_DATA_FILE = path.join(tempDir, 'store.json');
process.env.LUMO_DB_MODE = 'file';
process.env.PORT = '0';
process.env.LUMO_TUTOR_VOICE_PROVIDER = 'elevenlabs';
process.env.ELEVENLABS_API_KEY = 'test-eleven-key';
process.env.ELEVENLABS_VOICE_ID = 'voice-123';

const { startServer } = require('../src/main');
const { buildConfigAudit } = require('../src/config-audit');

let server;
let baseUrl;
let originalFetch;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  return {
    status: response.status,
    headers: response.headers,
    bodyText: await response.text(),
  };
}

test.before(async () => {
  originalFetch = global.fetch;
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('api.elevenlabs.io')) {
      const payload = JSON.parse(options.body);
      assert.equal(payload.text, 'Hello learner');
      assert.equal(payload.model_id, 'eleven_flash_v2_5');
      return new Response(Buffer.from('fake-mp3-audio'), {
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
      });
    }

    return originalFetch(url, options);
  };

  server = startServer(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  global.fetch = originalFetch;
  if (server) {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('config audit exposes tutor voice integration posture', () => {
  const audit = buildConfigAudit();
  assert.equal(audit.voice.provider, 'elevenlabs');
  assert.equal(audit.voice.enabled, true);
  assert.equal(audit.voice.fallbackMode, 'remote-first-with-local-tts-fallback');
});

test('learner tutor voice route proxies remote audio without exposing provider secrets', async () => {
  const response = await request('/api/v1/learner-app/voice/replay', {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello learner', mode: 'guiding' }),
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/mpeg');
  assert.equal(response.headers.get('x-lumo-voice-provider'), 'elevenlabs');
  assert.equal(response.bodyText, 'fake-mp3-audio');
});
