import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const canvasPageSource = readFileSync(fileURLToPath(new URL('./page.tsx', import.meta.url)), 'utf8');

test('canvas blocks when the production API target is missing or unsafe', () => {
  assert.match(
    canvasPageSource,
    /import \{ API_BASE_DIAGNOSTIC \} from '\.\.\/\.\.\/lib\/config';/,
    'canvas page should read the shared production API diagnostic instead of inventing its own trust rules',
  );
  assert.match(
    canvasPageSource,
    /if \(API_BASE_DIAGNOSTIC\.deploymentBlocked\) \{/,
    'canvas should block before rendering a live-looking graph when the LMS is not wired to a production-safe API target',
  );
  assert.match(
    canvasPageSource,
    /title="Curriculum Canvas"/,
    'canvas blocker should identify the exact route that is being withheld',
  );
  assert.match(
    canvasPageSource,
    /NEXT_PUBLIC_API_BASE_URL/,
    'canvas blocker should explain that broken production API wiring is the reason the route is withheld',
  );
});

test('canvas hard-blocks when core authoring feeds degrade', () => {
  assert.match(
    canvasPageSource,
    /const criticalCanvasFailures = \[/,
    'canvas should identify the curriculum feeds that are too important to degrade into a warning banner',
  );
  assert.match(
    canvasPageSource,
    /subjectsResult\.status === 'rejected' \? 'subjects' : null/,
    'canvas should treat subject feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /strandsResult\.status === 'rejected' \? 'strands' : null/,
    'canvas should treat strand feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /modulesResult\.status === 'rejected' \? 'modules' : null/,
    'canvas should treat module feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /lessonsResult\.status === 'rejected' \? 'lessons' : null/,
    'canvas should treat lesson feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /assessmentsResult\.status === 'rejected' \? 'assessments' : null/,
    'canvas should treat assessment feed failures as deployment-blocking authoring gaps',
  );
  assert.match(
    canvasPageSource,
    /if \(criticalCanvasFailures\.length \|\| hasEmptyAuthoringGraph\) \{/,
    'canvas should stop rendering interactive authoring controls when core curriculum feeds fail',
  );
  assert.match(
    canvasPageSource,
    /Deployment blocker: curriculum authoring feeds are degraded\./,
    'canvas should surface an explicit degraded-authoring blocker headline',
  );
  assert.match(
    canvasPageSource,
    /Leaving Canvas interactive here would let operators edit modules, lessons, strands, or assessment gates against a partial curriculum graph\./,
    'canvas should explain the unsafe write failure mode it prevents',
  );
  assert.match(
    canvasPageSource,
    /The fallback create-lesson CTA is only safe when the authoring feeds are healthy enough to trust the scoped context\./,
    'canvas blocker should call out why launching fallback authoring while degraded is unsafe',
  );
  assert.match(
    canvasPageSource,
    /\{ label: 'Review blocker stack', href: returnPath, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' \},/,
    'canvas degraded blocker should route operators back to the scoped blocker stack instead of exposing lesson studio while authoring feeds are blind',
  );
  assert.doesNotMatch(
    canvasPageSource,
    /\{ label: 'Lesson studio', href: createLessonHref, background: '#ECFDF5', color: '#166534', border: '1px solid #BBF7D0' \},/,
    'canvas degraded blocker should not keep a direct lesson-studio CTA once the route admits fallback authoring is unsafe during feed loss',
  );
});

test('canvas hard-blocks when the live subject and module spine resolves empty', () => {
  assert.match(
    canvasPageSource,
    /const hasEmptyAuthoringGraph = subjectsResult\.status === 'fulfilled'[\s\S]*modulesResult\.status === 'fulfilled'[\s\S]*subjects\.length === 0[\s\S]*modules\.length === 0;/,
    'canvas should detect the hollow live-curriculum case instead of treating it like a normal empty state',
  );
  assert.match(
    canvasPageSource,
    /if \(criticalCanvasFailures\.length \|\| hasEmptyAuthoringGraph\) \{/,
    'canvas should block both degraded feeds and the empty live-authoring spine case before exposing rescue-mode authoring',
  );
  assert.match(
    canvasPageSource,
    /Deployment blocker: live curriculum spine came back empty\./,
    'canvas should name the empty live-curriculum condition as a deployment blocker instead of a harmless fallback',
  );
  assert.match(
    canvasPageSource,
    /The live subjects and modules feeds both resolved empty, so Canvas has no trustworthy authoring spine to map\./,
    'canvas should explain why an empty live graph is unsafe for deployment trust',
  );
});
