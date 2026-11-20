import { defaultSemesters } from '../shared/curriculum.js';

const supplied = [
  [
    ['Programming Fundamentals', 1, 'A', 'EE1102'],
    ['Fundamentals of Electricity', 3, 'B+', 'EE1301'],
    ['Basic Concepts in Environmental Engineering', 1, 'A+', 'CE1101'],
    ['Introduction to Infrastructure Planning', 2, 'A-', 'CE1202'],
    ['Engineering Drawing', 2, 'B+', 'ME1201'],
    ['Introduction to Mechanical Engineering', 2, 'A'],
    ['Communication for Engineers', 3, 'A', 'IS1301'],
    ['Mathematical Fundamentals for Engineers', 4, 'B+', 'IS1402'],
  ],
  [
    ['Object Oriented Programming', 2, 'A', 'EE2202'],
    ['Fundamentals of Electronics', 2, 'A-', 'EE2201'],
    ['Fundamentals of Fluid Mechanics', 2, 'B+', 'CE2201'],
    ['Mechanics of Materials', 3, 'B', 'CE2302'],
    ['Fundamentals of Thermodynamics', 2, 'B+', 'ME1202'],
    ['Fundamentals of Materials and Manufacturing Engineering', 3, 'A-', 'ME2302'],
    ['Linear Algebra and Differential Equations', 4, 'B', 'IS2401'],
  ],
  [
    ['Analog Electronics', 3, 'B', 'ECE3301'],
    ['Data Structures and Algorithms', 3, 'A', 'ECE3302'],
    ['Electrical and Electronic Measurements', 2, 'A-', 'ECE3203'],
    ['GUI Programming', 2, 'A+', 'ECE3404'],
    ['Signals and Systems', 3, 'A-', 'ECE3305'],
    ['Complex Analysis and Mathematical Transforms', 3, 'A-', 'IS3301'],
    ['Basic Economics', 3, 'M', 'IS4322', 'GE'],
    ['Society and Engineer', 3, 'H', 'IS3307', 'GE'],
  ],
  [
    ['Database Systems', 2, 'A', 'ECE4201'],
    ['Digital Logic Design', 3, 'B-', 'ECE4302'],
    ['Advanced Data Structures & Algorithms', 2, 'A', 'ECE4203'],
    ['Software Engineering Principles', 2, 'A', 'ECE4204'],
    ['Web Application Development', 3, 'A', 'ECE4305'],
    ['Probability and Statistics', 3, 'A-', 'IS4301'],
    ['Software Testing & Quality Assurance', 3, 'A', 'ECE4212', 'TE'],
    ['Computer Architecture', 1, 'A'],
  ],
  [
    ['Computer Architecture and Organization', 2, 'A', 'ECE5201'],
    ['Control Systems Design', 3, null, 'ECE5302'],
    ['Machine Learning', 2, null, 'ECE5204'],
    ['Software Group Project', 2, null, 'ECE5406'],
    ['Discrete Mathematics', 3, 'A', 'ECE5311'],
    ['Hardware Description Language', 0, null, 'ECE5212', 'TE'],
    ['Object Oriented Design Patterns and Principles', 2, 'A+', 'ECE5205'],
    ['Mobile Application Development', 2, null, 'ECE4211', 'TE'],
  ],
  [
    ['Computer Networks', 3, null, 'ECE6302'],
    ['Embedded Systems Design', 3, null, 'ECE6303'],
    ['Operating System and Network Programming', 2, null, 'ECE6205'],
    ['Software Group Project (Cntd.)', 2, null, 'ECE5406'],
    ['Engineering Ethics', 1, 'A+', 'IS5101'],
    ['Numerical Methods', 3, 'A', 'IS5302'],
    ['Artificial Intelligence', 3, null, 'ECE6201'],
    ['DevOps Engineering', 2, null, 'ECE5211', 'TE'],
  ],
];

export function initialStudentSemesters() {
  const semesters = defaultSemesters(24, 'computer');
  for (const [index, term] of supplied.entries()) {
    semesters[index] = term.map(([name, credits, grade, code = '', kind = 'Core']) => ({
      id: crypto.randomUUID(), code, name, credits, grade, kind,
      scale: kind === 'GE' ? 'non-gpa' : 'gpa',
    }));
  }
  return semesters;
}
