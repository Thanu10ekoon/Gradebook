import { z } from 'zod';
import { batches, tracks } from '../shared/curriculum.js';
import { gpaGrades, nonGpaGrades } from '../shared/grades.js';

export const usernamePattern = /^EG20\d{6}$/;
const username = z.string().trim().toUpperCase().regex(usernamePattern, 'Use the EG20XXYYYY format, with digits for XXYYYY.');
const name = z.string().trim().min(1, 'Enter your name.').max(100);
const email = z.email().trim().toLowerCase().max(254);
const batch = z.number().int().refine(value => batches.includes(value), 'Select a batch from 23rd to 28th.');
const specialization = z.enum(Object.keys(tracks)).nullable();
const hashablePassword = z.string().min(1).max(72)
  .refine(value => Buffer.byteLength(value) <= 72 && !value.includes('\0'), 'Use a password of at most 72 UTF-8 bytes.');
const password = hashablePassword.refine(value => value.length >= 12, 'Use at least 12 characters.');
export const signup = z.object({ username, name, email, batch, specialization, password });
export const signin = z.object({
  username: z.string().trim().toUpperCase().max(16).regex(/^(ADMIN|EG20\d{6})$/),
  password: hashablePassword,
});
export const profile = z.object({ name, email, batch: batch.nullable(), specialization });
export const passwordChange = z.object({ current: hashablePassword, next: password });

const module = z.object({
  id: z.uuid(),
  code: z.string().trim().max(20),
  name: z.string().trim().min(1, 'Enter a name for each module.').max(180),
  credits: z.number().int().min(0).max(30),
  kind: z.enum(['Core', 'TE', 'GE', 'Training']),
  scale: z.enum(['gpa', 'non-gpa']),
  grade: z.string().max(3).nullable(),
}).refine(({ grade, scale }) => grade === null || (scale === 'gpa' ? gpaGrades : nonGpaGrades).includes(grade),
  'Choose a grade available on the selected grade scale.');

export const results = z.object({
  revision: z.number().int().nonnegative(),
  semesters: z.array(z.array(module).max(40)).length(8).refine(semesters => {
    const ids = semesters.flat().map(module => module.id);
    return new Set(ids).size === ids.length;
  }, 'Each module entry must have a unique ID.'),
});

export const userId = z.coerce.number().int().positive().max(4294967295);
export const roleChange = z.object({ id: userId, role: z.enum(['admin', 'student']) });
