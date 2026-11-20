import mysql from 'mysql2';

let pool;
let promisePool;

export function getDriverPool() {
  if (pool) return pool;
  const password = process.env.DATABASE_PASSWORD;
  if (!password) throw new Error('DATABASE_PASSWORD is required');
  const ca = process.env.DATABASE_CA?.replace(/\\n/g, '\n');
  pool = mysql.createPool({
    host: process.env.DATABASE_HOST ?? 'brg5j2ppwncgufgso1g7-mysql.services.clever-cloud.com',
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database: process.env.DATABASE_NAME ?? 'brg5j2ppwncgufgso1g7',
    user: process.env.DATABASE_USER ?? 'ur87iuzq1wc6kqsw',
    password,
    // The configured private MySQL CA authenticates servers whose generated
    // certificates lack DNS names. Public CAs require hostname verification.
    ssl: { rejectUnauthorized: true, verifyIdentity: !ca, ca },
    connectionLimit: 3,
    maxIdle: 2,
    idleTimeout: 10_000,
    queueLimit: 24,
    connectTimeout: 8_000,
  });
  return pool;
}

export function getPool() {
  return promisePool ??= getDriverPool().promise();
}

export async function query(sql, values = [], connection = getPool()) {
  const [result] = await connection.execute(sql, values);
  return result;
}

export async function transaction(work) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
