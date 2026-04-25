import test from 'node:test';
import assert from 'node:assert/strict';

import { filterModulesForSubject, moduleBelongsToSubject, resolveModuleSubjectId } from './module-subject-match.ts';

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

test('resolveModuleSubjectId keeps an explicit subject id when present', () => {
  assert.equal(
    resolveModuleSubjectId(
      {
        subjectId: 'subject-math',
        subjectName: 'Mathematics',
      } as any,
      [{ id: 'subject-other', name: 'Mathematics' }] as any,
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
