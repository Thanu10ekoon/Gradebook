export const schema = [
  `CREATE TABLE IF NOT EXISTS gradebook_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    batch TINYINT UNSIGNED NULL,
    specialization VARCHAR(24) NULL,
    password_hash VARCHAR(60) NOT NULL,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS gradebook_results (
    user_id INT UNSIGNED PRIMARY KEY,
    semesters JSON NOT NULL,
    revision INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES gradebook_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS gradebook_sessions (
    token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX (expires_at),
    FOREIGN KEY (user_id) REFERENCES gradebook_users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS gradebook_rate_limits (
    bucket CHAR(64) CHARACTER SET ascii PRIMARY KEY,
    window_start INT UNSIGNED NOT NULL,
    attempts SMALLINT UNSIGNED NOT NULL,
    INDEX (window_start)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS gradebook_admin_lock (
    id TINYINT UNSIGNED PRIMARY KEY
  ) ENGINE=InnoDB`,
  'INSERT IGNORE INTO gradebook_admin_lock (id) VALUES (1)',
];
