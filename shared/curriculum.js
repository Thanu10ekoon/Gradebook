import curricula from './curricula.json' with { type: 'json' };

export const batches = [23, 24, 25, 26, 27, 28];
export const tracks = {
  civil: 'Civil and Environmental Engineering',
  electrical: 'Electrical and Information Engineering',
  computer: 'Computer Engineering',
  mechanical: 'Mechanical and Manufacturing Engineering',
  marine: 'Marine Engineering and Naval Architecture',
};

export function sourceBatch(batch) {
  return Math.max(24, Math.min(27, batch || 24));
}

export function curriculumFor(batch, specialization) {
  const curriculum = curricula[sourceBatch(batch)];
  const track = curriculum.tracks[specialization];
  return {
    core: [...curriculum.common, ...(track?.core ?? [])],
    electives: [...(track?.electives ?? []), ...curriculum.general],
  };
}

export function templateModule(entry) {
  const { semester, ...module } = entry;
  return { ...module, id: globalThis.crypto.randomUUID(), grade: null };
}

export function defaultSemesters(batch, specialization) {
  const { core } = curriculumFor(batch, specialization);
  return Array.from({ length: 8 }, (_, index) =>
    core.filter(entry => entry.semester === index + 1).map(templateModule));
}
