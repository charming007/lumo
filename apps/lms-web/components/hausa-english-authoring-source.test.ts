import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const createFormSource = readFileSync(fileURLToPath(new URL('./lesson-create-form.tsx', import.meta.url)), 'utf8');
const editorFormSource = readFileSync(fileURLToPath(new URL('./lesson-editor-form.tsx', import.meta.url)), 'utf8');
const englishStudioSource = readFileSync(fileURLToPath(new URL('./english-studio-authoring-form.tsx', import.meta.url)), 'utf8');

test('lesson create form exposes phase-1 Hausa support defaults and English target step fields', () => {
  assert.match(createFormSource, /Default Hausa support cue for steps/);
  assert.match(createFormSource, /English target text/);
  assert.match(createFormSource, /Hausa support override/);
  assert.match(createFormSource, /supportLanguage:\s*supportLanguage\.trim\(\)\s*\|\|\s*'ha'/);
  assert.match(createFormSource, /supportLanguageLabel:\s*supportLanguageLabel\.trim\(\)\s*\|\|\s*'Hausa'/);
});

test('lesson editor form exposes phase-1 Hausa support defaults and English target step fields', () => {
  assert.match(editorFormSource, /Default Hausa support cue for steps/);
  assert.match(editorFormSource, /English target text/);
  assert.match(editorFormSource, /Hausa support override/);
  assert.match(editorFormSource, /supportLanguage:\s*supportLanguage\.trim\(\)\s*\|\|\s*'ha'/);
  assert.match(editorFormSource, /supportLanguageLabel:\s*supportLanguageLabel\.trim\(\)\s*\|\|\s*'Hausa'/);
});

test('english studio keeps the same Hausa support and English target authoring model', () => {
  assert.match(englishStudioSource, /Default Hausa support cue for steps/);
  assert.match(englishStudioSource, /English target text/);
  assert.match(englishStudioSource, /Hausa support override/);
  assert.match(englishStudioSource, /supportLanguage:\s*supportLanguage\.trim\(\)\s*\|\|\s*'ha'/);
  assert.match(englishStudioSource, /supportLanguageLabel:\s*supportLanguageLabel\.trim\(\)\s*\|\|\s*'Hausa'/);
});
