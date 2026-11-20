import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

const sessionDuration = 60 * 60 * 24 * 7;
const cookieName = 'gradebook_session';
const bcryptCost = 12;
const dummyHash = '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
export const userFields = 'id, username, name, email, batch, specialization, role, must_change_password';

export function publicUser(row) {
  const { id, username, name, email, batch, specialization, role, must_change_password } = row;
  return { id, username, name, email, batch, specialization, role, mustChangePassword: Boolean(must_change_password) };
}

export function hashPassword(password) {
  return bcrypt.hash(password, bcryptCost);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash ?? dummyHash);
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cookie(request, value, maxAge) {
  const secure = process.env.VERCEL || new URL(request.url).protocol === 'https:';
  return cookieName + '=' + value + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + maxAge + (secure ? '; Secure' : '');
}

function sessionHash(request) {
  const cookies = request.headers.get('cookie') ?? '';
  const token = cookies.match(/(?:^|;\s*)gradebook_session=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
  return token ? digest(token) : null;
}

export async function currentUser(request) {
  const hash = sessionHash(request);
  if (!hash) return null;
  const fields = userFields.split(', ').map(column => 'u.' + column).join(', ');
  const [row] = await query('SELECT ' + fields + ' FROM gradebook_sessions s JOIN gradebook_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()', [hash]);
  return row ? publicUser(row) : null;
}

export async function startSession(request, userId, connection) {
  const token = randomBytes(32).toString('base64url');
  await query('INSERT INTO gradebook_sessions (token_hash, user_id, expires_at) VALUES (?, ?, TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP()))',
    [digest(token), userId, sessionDuration], connection);
  const oldSession = sessionHash(request);
  if (oldSession) await query('DELETE FROM gradebook_sessions WHERE token_hash = ?', [oldSession], connection);
  return cookie(request, token, sessionDuration);
}

export async function endSession(request) {
  const hash = sessionHash(request);
  if (hash) await query('DELETE FROM gradebook_sessions WHERE token_hash = ?', [hash]);
  return cookie(request, '', 0);
}

export async function consumeLimit(request, action, limit, byAccount = '') {
  const address = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-gradebook-local-ip') ?? 'unknown';
  const bucket = digest([action, address, byAccount].join('|'));
  const windowStart = Math.floor(Date.now() / 900_000);
  await query('INSERT INTO gradebook_rate_limits (bucket, window_start, attempts) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE attempts = IF(window_start = ?, LEAST(attempts + 1, 65535), 1), window_start = ?', [bucket, windowStart, windowStart, windowStart]);
  const [row] = await query('SELECT attempts FROM gradebook_rate_limits WHERE bucket = ?', [bucket]);
  if (Math.random() < 0.02) {
    await query('DELETE FROM gradebook_rate_limits WHERE window_start < ?', [windowStart - 2]);
    await query('DELETE FROM gradebook_sessions WHERE expires_at <= UTC_TIMESTAMP()');
  }
  return row.attempts <= limit;
}
