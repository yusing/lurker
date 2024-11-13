const { Database } = require("bun:sqlite");
const db = new Database("readit.db", {
	strict: true,
});

db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )
`).run();

db.query(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subreddit TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, subreddit)
  )
`).run();

module.exports = { db };
