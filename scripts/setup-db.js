import { randomBytes } from 'node:crypto';
import { hashPassword } from '../server/accounts.js';
import { getPool, query, transaction } from '../server/db.js';
import { schema } from '../server/schema.js';
import { initialStudentSemesters } from './student-results.js';

try {
  try {
    process.loadEnvFile('.env.local');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const statement of schema) await query(statement);
  const seeded = await transaction(async connection => {
    await query('SELECT id FROM gradebook_admin_lock WHERE id = 1 FOR UPDATE', [], connection);
    const accounts = [
      { username: 'ADMIN', name: 'Gradebook Administrator', email: 'admin@gradebook.example',
        batch: null, specialization: null, role: 'admin', semesters: Array.from({ length: 8 }, () => []) },
      { username: 'EG20225364', name: process.env.STUDENT_NAME || 'EG20225364',
        email: process.env.STUDENT_EMAIL || 'eg20225364@gradebook.example',
        batch: 24, specialization: 'computer', role: 'student', semesters: initialStudentSemesters() },
    ];
    const credentials = [];
    for (const account of accounts) {
      const [existing] = await query('SELECT id FROM gradebook_users WHERE username = ?', [account.username], connection);
      if (existing) continue;
      const password = randomBytes(18).toString('base64url');
      const { insertId } = await query('INSERT INTO gradebook_users (username, name, email, batch, specialization, role, password_hash, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
        [account.username, account.name, account.email, account.batch, account.specialization, account.role, await hashPassword(password)], connection);
      await query('INSERT INTO gradebook_results (user_id, semesters) VALUES (?, ?)', [insertId, JSON.stringify(account.semesters)], connection);
      credentials.push({ username: account.username, password });
    }
    return credentials;
  });
  console.log('Clever Cloud database schema is ready.');
  for (const { username, password } of seeded) console.log(username + ' temporary password: ' + password);
  if (!seeded.length) console.log('Both seed accounts already exist.');
} catch (error) {
  console.error('Database setup failed:', error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (process.env.DATABASE_PASSWORD) await getPool().end();
}
