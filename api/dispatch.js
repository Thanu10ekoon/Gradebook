import { attachDatabasePool } from '@vercel/functions';
import { getDriverPool } from '../server/db.js';
import { handleRequest } from '../server/http.js';

if (process.env.DATABASE_PASSWORD) attachDatabasePool(getDriverPool());

export default { fetch: handleRequest };
