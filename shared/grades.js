export const gradePoints = Object.freeze({
  'A+': 40, A: 40, 'A-': 37, 'B+': 33, B: 30, 'B-': 27,
  'C+': 23, C: 20, 'C-': 17, E: 0,
});

export const withheldGrades = ['MC', 'AC', 'WH'];
export const gpaGrades = [...Object.keys(gradePoints), ...withheldGrades];
export const nonGpaGrades = ['H', 'M', 'S', 'F', ...withheldGrades];

function displayAverage(points, credits) {
  return credits ? (Math.round(points * 10 / credits) / 100).toFixed(2) : null;
}

export function summarize(semesters) {
  let weightedPoints = 0;
  let weightedCredits = 0;
  const terms = semesters.map((modules, index) => {
    let points = 0;
    let gradedCredits = 0;
    let totalCredits = 0;
    let pending = 0;
    let withheld = false;
    for (const module of modules) {
      totalCredits += module.credits;
      if (withheldGrades.includes(module.grade)) withheld = true;
      if (!module.grade) pending += 1;
      if (module.scale === 'gpa' && Object.hasOwn(gradePoints, module.grade)) {
        gradedCredits += module.credits;
        points += module.credits * gradePoints[module.grade];
      }
    }
    // 1 and 3 are proportional to the university's 0.05 and 0.15.
    const weight = index < 2 ? 1 : 3;
    weightedPoints += weight * points;
    weightedCredits += weight * gradedCredits;
    return { sgpa: withheld ? null : displayAverage(points, gradedCredits),
      totalCredits, gradedCredits, pending, withheld };
  });
  const withheld = terms.some(term => term.withheld);
  return {
    terms,
    cgpa: withheld ? null : displayAverage(weightedPoints, weightedCredits),
    withheld,
    gradedCredits: terms.reduce((total, term) => total + term.gradedCredits, 0),
    pending: terms.reduce((total, term) => total + term.pending, 0),
  };
}
