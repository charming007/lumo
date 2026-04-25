import test from 'node:test';
import assert from 'node:assert/strict';

import { filterModulesForSubject, moduleBelongsToSubject } from './module-subject-match.ts';

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
