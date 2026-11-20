import { defaultSemesters } from '../shared/curriculum.js';
import * as validation from './validation.js';
import { consumeLimit, currentUser, endSession, hashPassword, publicUser, startSession, userFields, verifyPassword } from './accounts.js';
import { query, transaction } from './db.js';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(data, status = 200, cookie) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return Response.json(data, { status, headers });
}

function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new HttpError(400, result.error.issues[0].message);
  return result.data;
}

async function readBody(request, schema) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !request.body) {
    throw new HttpError(415, 'Send a JSON request.');
  }
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 176_000) {
      void reader.cancel();
      throw new HttpError(413, 'The gradebook is too large to save.');
    }
    chunks.push(value);
  }
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'The request could not be read.');
  }
  return validate(schema, body);
}

async function findUser(id) {
  const [row] = await query('SELECT ' + userFields + ' FROM gradebook_users WHERE id = ?', [id]);
  if (!row) throw new HttpError(404, 'Account not found.');
  return publicUser(row);
}

async function readBook(id) {
  const [book] = await query('SELECT semesters, revision FROM gradebook_results WHERE user_id = ?', [id]);
  if (!book) throw new HttpError(404, 'This account has no gradebook.');
  const semesters = typeof book.semesters === 'string' ? JSON.parse(book.semesters) : book.semesters;
  return { semesters, revision: book.revision };
}

async function rateLimit(request, action, count, account) {
  if (!await consumeLimit(request, action, count, account)) {
    throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
  }
}

async function register(request) {
  const input = await readBody(request, validation.signup);
  await rateLimit(request, 'register', 15);
  const passwordHash = await hashPassword(input.password);
  const account = await transaction(async connection => {
    const { insertId } = await query('INSERT INTO gradebook_users (username, name, email, batch, specialization, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [input.username, input.name, input.email, input.batch, input.specialization, passwordHash], connection);
    const semesters = defaultSemesters(input.batch, input.specialization);
    await query('INSERT INTO gradebook_results (user_id, semesters) VALUES (?, ?)', [insertId, JSON.stringify(semesters)], connection);
    return { id: insertId, cookie: await startSession(request, insertId, connection) };
  });
  return json({ user: await findUser(account.id) }, 201, account.cookie);
}

async function login(request) {
  const { username, password } = await readBody(request, validation.signin);
  await rateLimit(request, 'login-ip', 45);
  await rateLimit(request, 'login-account', 12, username);
  const [row] = await query('SELECT ' + userFields + ', password_hash FROM gradebook_users WHERE username = ?', [username]);
  if (!await verifyPassword(password, row?.password_hash) || !row) {
    throw new HttpError(401, 'The username or password is incorrect.');
  }
  return json({ user: publicUser(row) }, 200, await startSession(request, row.id));
}

async function changePassword(request, user) {
  const { current, next } = await readBody(request, validation.passwordChange);
  await rateLimit(request, 'password', 12, String(user.id));
  const [row] = await query('SELECT password_hash FROM gradebook_users WHERE id = ?', [user.id]);
  if (!row || !await verifyPassword(current, row.password_hash)) throw new HttpError(400, 'Current password is incorrect.');
  if (current === next) throw new HttpError(400, 'Choose a different new password.');
  const passwordHash = await hashPassword(next);
  const cookie = await transaction(async connection => {
    const result = await query('UPDATE gradebook_users SET password_hash = ?, must_change_password = FALSE WHERE id = ? AND BINARY password_hash = BINARY ?',
      [passwordHash, user.id, row.password_hash], connection);
    if (result.affectedRows !== 1) throw new HttpError(409, 'Your password changed. Sign in again.');
    await query('DELETE FROM gradebook_sessions WHERE user_id = ?', [user.id], connection);
    return startSession(request, user.id, connection);
  });
  return json({ user: await findUser(user.id) }, 200, cookie);
}

async function editProfile(request, user) {
  const input = await readBody(request, validation.profile);
  if (user.username !== 'ADMIN' && input.batch === null) throw new HttpError(400, 'Select your batch.');
  await transaction(async connection => {
    await query('SELECT id FROM gradebook_users WHERE id = ? FOR UPDATE', [user.id], connection);
    await query('UPDATE gradebook_users SET name = ?, email = ?, batch = ?, specialization = ? WHERE id = ?',
      [input.name, input.email, input.batch, input.specialization, user.id], connection);
    if (user.batch === input.batch && user.specialization === input.specialization) return;
    const [book] = await query('SELECT semesters FROM gradebook_results WHERE user_id = ? FOR UPDATE', [user.id], connection);
    const semesters = typeof book.semesters === 'string' ? JSON.parse(book.semesters) : book.semesters;
    const defaults = defaultSemesters(input.batch, input.specialization);
    await query('UPDATE gradebook_results SET semesters = ?, revision = revision + 1 WHERE user_id = ?',
      [JSON.stringify(semesters.map((term, index) => term.length ? term : defaults[index])), user.id], connection);
  });
  return json({ user: await findUser(user.id) });
}

async function saveBook(request, user) {
  const { semesters, revision } = await readBody(request, validation.results);
  const result = await query('UPDATE gradebook_results SET semesters = ?, revision = revision + 1 WHERE user_id = ? AND revision = ?',
    [JSON.stringify(semesters), user.id, revision]);
  if (result.affectedRows !== 1) throw new HttpError(409, 'This gradebook changed in another tab. Reload before saving to see the latest version.');
  return json({ semesters, revision: revision + 1 });
}

async function listUsers(url) {
  const search = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
  const before = url.searchParams.has('before') ? validate(validation.userId, url.searchParams.get('before')) : 4294967296;
  const term = '%' + search.replace(/[%_!]/g, match => '!' + match) + '%';
  const rows = await query('SELECT ' + userFields + ' FROM gradebook_users WHERE id < ? AND (username LIKE ? ESCAPE \'!\' OR name LIKE ? ESCAPE \'!\' OR email LIKE ? ESCAPE \'!\') ORDER BY id DESC LIMIT 26',
    [before, term, term, term]);
  const users = rows.slice(0, 25).map(publicUser);
  return json({ users, next: rows.length > 25 ? users.at(-1).id : null });
}

async function changeRole(request, admin) {
  const { id, role } = await readBody(request, validation.roleChange);
  await transaction(async connection => {
    await query('SELECT id FROM gradebook_admin_lock WHERE id = 1 FOR UPDATE', [], connection);
    const [actor] = await query('SELECT role FROM gradebook_users WHERE id = ? FOR UPDATE', [admin.id], connection);
    if (actor?.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
    const [target] = await query('SELECT role FROM gradebook_users WHERE id = ? FOR UPDATE', [id], connection);
    if (!target) throw new HttpError(404, 'Account not found.');
    if (target.role === role) return;
    if (target.role === 'admin') {
      const [count] = await query("SELECT COUNT(*) AS active FROM gradebook_users WHERE role = 'admin'", [], connection);
      if (Number(count.active) <= 1) throw new HttpError(409, 'Keep at least one administrator.');
    }
    await query('UPDATE gradebook_users SET role = ? WHERE id = ?', [role, id], connection);
  });
  return json({ user: await findUser(id) });
}

export async function handleRequest(request) {
  try {
    const url = new URL(request.url);
    const [, , route] = url.pathname.split('/');
    const action = route === 'dispatch' ? url.searchParams.get('action') : route;
    const method = request.method;
    const key = method + ' ' + action;
    if (!['GET', 'HEAD'].includes(method)) {
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) throw new HttpError(403, 'Open Gradebook on this domain to continue.');
      if (request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Cross-site requests are disabled.');
    }
    if (key === 'POST register') return await register(request);
    if (key === 'POST login') return await login(request);
    if (key === 'POST logout') return json({}, 200, await endSession(request));
    const user = await currentUser(request);
    if (key === 'GET session') return json({ user });
    if (!user) throw new HttpError(401, 'Sign in to continue.');
    if (key === 'PUT password') return await changePassword(request, user);
    if (user.mustChangePassword) throw new HttpError(403, 'Change your temporary password to continue.');
    if (key === 'PUT profile') return await editProfile(request, user);
    if (key === 'GET results') return json(await readBook(user.id));
    if (key === 'PUT results') return await saveBook(request, user);
    if (action?.startsWith('admin-') && user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.');
    if (key === 'GET admin-users') return await listUsers(url);
    if (key === 'GET admin-results') {
      const id = validate(validation.userId, url.searchParams.get('id'));
      return json({ user: await findUser(id), ...await readBook(id) });
    }
    if (key === 'PUT admin-role') return await changeRole(request, user);
    throw new HttpError(404, 'This endpoint does not exist.');
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error.code === 'ER_DUP_ENTRY') return json({ error: 'That username or email is already in use.' }, 409);
    console.error('Gradebook request failed:', error.code ?? error.name);
    return json({ error: 'Gradebook could not reach its database. Check the server configuration and try again.' }, 503);
  }
}
