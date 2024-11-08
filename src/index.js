const express = require("express");
const path = require("node:path");
const routes = require("./routes/index");
const geddit = require("./geddit.js");
const { Database } = require("bun:sqlite");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", routes);

const db = new Database("users.db");

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subreddit TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, subreddit)
  )
`);

const port = process.env.READIT_PORT;
const server = app.listen(port ? port : 3000, () => {
	console.log(`started on ${server.address().port}`);
});
