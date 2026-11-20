import { attachDatabasePool } from '@vercel/functions';
import { getPool } from '../server/db.js';
import { handleRequest } from '../server/http.js';

if (process.env.DATABASE_PASSWORD) attachDatabasePool(getPool());

export default { fetch: handleRequest };
