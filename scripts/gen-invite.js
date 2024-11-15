import { Database } from "bun:sqlite";

const command = process.argv[2];

const dbPath = process.argv[3] ? process.argv[3] : "readit.db";
const db = new Database(dbPath, {
	strict: true,
});

db.run(`
	CREATE TABLE IF NOT EXISTS invites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT NOT NULL,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		usedAt TIMESTAMP
	)
`);

if (command === "create") {
	createInvite();
} else {
	console.log("requires an arg");
}

function generateInviteToken() {
	const hasher = new Bun.CryptoHasher("sha256", "super-secret-invite-key");
	return hasher.update(Math.random().toString()).digest("hex").slice(0, 10);
}

function createInvite() {
	const token = generateInviteToken();
	db.run("INSERT INTO invites (token) VALUES ($token)", { token });
	console.log(`Invite token created: ${token}`);
}
