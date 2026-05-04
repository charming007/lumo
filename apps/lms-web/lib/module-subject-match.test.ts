import test from 'node:test';
import assert from 'node:assert/strict';

import { assetMatchesModuleContext, filterModulesForSubject, findSubjectByContext, matchesSubjectFilter, moduleBelongsToSubject, resolveModuleSubjectId, subjectMatchesContext, subjectsIncludeId } from './module-subject-match.ts';

test('module subject matching keeps modules visible when subject names line up but ids drift', () => {
  const subject = {
    id: 'english',
    name: 'English',
  };

  const modules = [
    {
      id: 'module-1',
      title: 'Everyday Speaking',
      subjectId: '',
      subjectName: 'English',
    },
    {
      id: 'module-2',
      title: 'Counting Basics',
      subjectId: 'math',
      subjectName: 'Math',
    },
  ];

  assert.equal(moduleBelongsToSubject(modules[0] as any, subject as any), true);
  assert.equal(moduleBelongsToSubject(modules[1] as any, subject as any), false);
  assert.deepEqual(filterModulesForSubject(modules as any, subject as any).map((module: any) => module.id), ['module-1']);
});

test('module subject matching treats ids case-insensitively and trims whitespace', () => {
  const subject = {
    id: ' life-skills ',
    name: 'Life Skills',
  };

  const module = {
    id: 'module-life',
    title: 'Healthy Habits',
    subjectId: 'LIFE-SKILLS',
    subjectName: 'Life Skills',
  };

  assert.equal(moduleBelongsToSubject(module as any, subject as any), true);
});

test('module subject matching returns an empty list when no subject is selected', () => {
  const modules = [
    { id: 'module-1', title: 'Anything', subjectId: 'english', subjectName: 'English' },
  ];

  assert.deepEqual(filterModulesForSubject(modules as any, null as any), []);
});

test('resolveModuleSubjectId keeps an explicit subject id when it matches a loaded subject', () => {
  assert.equal(
    resolveModuleSubjectId(
      {
        subjectId: 'subject-math',
        subjectName: 'Mathematics',
      } as any,
      [{ id: 'subject-math', name: 'Mathematics' }] as any,
    ),
    'subject-math',
  );
});

test('resolveModuleSubjectId falls back to matching subject name when the explicit subject id is stale', () => {
  assert.equal(
    resolveModuleSubjectId(
      {
        subjectId: 'legacy-math-id',
        subjectName: 'Mathematics',
      } as any,
      [{ id: 'subject-math', name: 'Mathematics' }] as any,
    ),
    'subject-math',
  );
});

test('resolveModuleSubjectId falls back to the matching subject name when module subject id is missing', () => {
  assert.equal(
    resolveModuleSubjectId(
      {
        subjectId: '   ',
        subjectName: ' English ',
      } as any,
      [
        { id: 'subject-arabic', name: 'Arabic' },
        { id: 'subject-english', name: 'english' },
      ] as any,
    ),
    'subject-english',
  );
});

test('resolveModuleSubjectId returns empty string when no subject context can be recovered', () => {
  assert.equal(
    resolveModuleSubjectId(
      {
        subjectId: null,
        subjectName: 'Unknown subject',
      } as any,
      [{ id: 'subject-arabic', name: 'Arabic' }] as any,
    ),
    '',
  );
});

test('subjectsIncludeId treats subject ids case-insensitively and trims whitespace', () => {
  assert.equal(
    subjectsIncludeId(
      [
        { id: ' subject-english ' },
        { id: 'subject-math' },
      ] as any,
      'SUBJECT-ENGLISH',
    ),
    true,
  );
});

test('subjectsIncludeId returns false for empty or non-matching ids', () => {
  assert.equal(subjectsIncludeId([{ id: 'subject-english' }] as any, '   '), false);
  assert.equal(subjectsIncludeId([{ id: 'subject-english' }] as any, 'subject-math'), false);
});

test('findSubjectByContext recovers the real subject when ids drift but names still match', () => {
  const subjects = [
    { id: 'subject-english', name: 'English' },
    { id: 'subject-math', name: 'Mathematics' },
  ];

  assert.deepEqual(
    findSubjectByContext(subjects as any, {
      subjectId: 'legacy-english-id',
      subjectName: ' english ',
    }),
    subjects[0],
  );
});

test('findSubjectByContext skips malformed subject names instead of crashing while recovering by module name', () => {
  const subjects = [
    { id: 'subject-bad', name: null },
    { id: 'subject-readiness', name: 'Lumo Readiness' },
  ];

  assert.deepEqual(
    findSubjectByContext(subjects as any, {
      subjectId: 'legacy-readiness-id',
      subjectName: ' lumo readiness ',
    }),
    subjects[1],
  );
});

test('matchesSubjectFilter keeps blocker lanes visible when subject ids drift but names still match', () => {
  const subjects = [{ id: 'subject-english', name: 'English' }];

  assert.equal(
    matchesSubjectFilter(' subject-english ', subjects as any, {
      subjectIds: ['legacy-english-id'],
      subjectNames: [' english '],
    }),
    true,
  );
});

test('matchesSubjectFilter treats direct subject ids case-insensitively and trims whitespace', () => {
  const subjects = [{ id: 'subject-math', name: 'Mathematics' }];

  assert.equal(
    matchesSubjectFilter(' SUBJECT-MATH ', subjects as any, {
      subjectIds: [' subject-math '],
      subjectNames: ['Numeracy'],
    }),
    true,
  );
});

test('matchesSubjectFilter returns false when neither subject id nor subject name align', () => {
  const subjects = [{ id: 'subject-arabic', name: 'Arabic' }];

  assert.equal(
    matchesSubjectFilter('subject-arabic', subjects as any, {
      subjectIds: ['subject-english'],
      subjectNames: ['English'],
    }),
    false,
  );
});

test('subjectMatchesContext treats ids and names case-insensitively for subject lanes', () => {
  const subject = { id: ' subject-english ', name: 'English' };

  assert.equal(
    subjectMatchesContext(subject as any, {
      subjectIds: ['SUBJECT-ENGLISH'],
      subjectNames: [' english '],
    }),
    true,
  );
});

test('subjectMatchesContext returns false when neither id nor name match the lane', () => {
  const subject = { id: 'subject-math', name: 'Mathematics' };

  assert.equal(
    subjectMatchesContext(subject as any, {
      subjectIds: ['subject-english'],
      subjectNames: ['English'],
    }),
    false,
  );
});

test('assetMatchesModuleContext recovers module scope from title plus subject context when ids drift', () => {
  assert.equal(
    assetMatchesModuleContext(
      {
        moduleId: 'legacy-module-id',
        moduleTitle: 'Reading Foundations',
        subjectId: 'legacy-subject-id',
        subjectName: 'English',
      } as any,
      {
        id: 'module-live',
        title: 'Reading Foundations',
        subjectId: 'subject-live',
        subjectName: 'English',
      } as any,
    ),
    true,
  );
});

test('assetMatchesModuleContext rejects same-title assets from another subject when context is available', () => {
  assert.equal(
    assetMatchesModuleContext(
      {
        moduleId: null,
        moduleTitle: 'Reading Foundations',
        subjectId: 'subject-math',
        subjectName: 'Mathematics',
      } as any,
      {
        id: 'module-live',
        title: 'Reading Foundations',
        subjectId: 'subject-english',
        subjectName: 'English',
      } as any,
    ),
    false,
  );
});
