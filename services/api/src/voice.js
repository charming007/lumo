const crypto = require('crypto');

function readOptionalEnv(name) {
  const value = String(process.env[name] || '').trim();
  return value || null;
}

function getVoiceConfig() {
  const provider = readOptionalEnv('LUMO_TUTOR_VOICE_PROVIDER') || 'disabled';
  const elevenLabsApiKey = readOptionalEnv('ELEVENLABS_API_KEY');
  const elevenLabsVoiceId = readOptionalEnv('ELEVENLABS_VOICE_ID');
  const elevenLabsModelId = readOptionalEnv('ELEVENLABS_MODEL_ID') || 'eleven_flash_v2_5';
  const outputFormat = readOptionalEnv('ELEVENLABS_OUTPUT_FORMAT') || 'mp3_44100_128';
  const enabled = provider === 'elevenlabs' && Boolean(elevenLabsApiKey && elevenLabsVoiceId);

  return {
    provider,
    enabled,
    elevenLabs: {
      apiKeyConfigured: Boolean(elevenLabsApiKey),
      voiceIdConfigured: Boolean(elevenLabsVoiceId),
      modelId: elevenLabsModelId,
      outputFormat,
      voiceId: elevenLabsVoiceId,
    },
  };
}

function buildVoiceAudit() {
  const config = getVoiceConfig();
  const warnings = [];

  if (config.provider === 'elevenlabs') {
    if (!config.elevenLabs.apiKeyConfigured) {
      warnings.push('ELEVENLABS_API_KEY is missing, so remote tutor audio will stay in fallback mode.');
    }
    if (!config.elevenLabs.voiceIdConfigured) {
      warnings.push('ELEVENLABS_VOICE_ID is missing, so remote tutor audio cannot target the production voice yet.');
    }
  }

  return {
    provider: config.provider,
    enabled: config.enabled,
    fallbackMode: config.enabled ? 'remote-first-with-local-tts-fallback' : 'local-tts-only',
    elevenLabs: {
      configured: config.elevenLabs.apiKeyConfigured && config.elevenLabs.voiceIdConfigured,
      apiKeyConfigured: config.elevenLabs.apiKeyConfigured,
      voiceIdConfigured: config.elevenLabs.voiceIdConfigured,
      modelId: config.elevenLabs.modelId,
      outputFormat: config.elevenLabs.outputFormat,
    },
    warnings,
  };
}

function buildTutorVoiceHeaders() {
  const config = getVoiceConfig();
  if (!config.enabled) return null;

  return {
    'xi-api-key': String(process.env.ELEVENLABS_API_KEY).trim(),
    'content-type': 'application/json',
    accept: 'audio/mpeg',
  };
}

function buildTutorVoiceBody({ text, mode = 'guiding', supportLanguage = '' }) {
  const trimmed = String(text || '').trim();
  const config = getVoiceConfig();
  const stability = mode === 'affirming' ? 0.42 : 0.55;
  const similarityBoost = mode === 'affirming' ? 0.78 : 0.72;
  const style = mode === 'affirming' ? 0.48 : 0.28;

  return {
    text: trimmed,
    model_id: config.elevenLabs.modelId,
    output_format: config.elevenLabs.outputFormat,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
      style,
      use_speaker_boost: true,
    },
    metadata: {
      requestId: crypto.randomUUID(),
      channel: 'learner-tablet',
      mode,
      supportLanguage: String(supportLanguage || '').trim() || undefined,
    },
  };
}

async function synthesizeTutorVoice({ text, mode = 'guiding', supportLanguage = '' }) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { ok: false, status: 400, code: 'empty-text', message: 'Tutor voice text is empty.' };
  }

  const config = getVoiceConfig();
  if (!config.enabled) {
    return { ok: false, status: 204, code: 'voice-unavailable', message: 'Remote tutor voice is not configured.' };
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.elevenLabs.voiceId)}/stream`,
    {
      method: 'POST',
      headers: buildTutorVoiceHeaders(),
      body: JSON.stringify(buildTutorVoiceBody({
        text: trimmed,
        mode,
        supportLanguage,
      })),
    },
  );

  if (!response.ok) {
    const raw = await response.text();
    return {
      ok: false,
      status: response.status,
      code: 'provider-error',
      message: raw || `ElevenLabs returned ${response.status}`,
    };
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  return {
    ok: true,
    status: 200,
    contentType: response.headers.get('content-type') || 'audio/mpeg',
    audioBuffer,
    provider: config.provider,
    modelId: config.elevenLabs.modelId,
  };
}

module.exports = {
  getVoiceConfig,
  buildVoiceAudit,
  synthesizeTutorVoice,
};
