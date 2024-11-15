import { Database } from "bun:sqlite";

const db = new Database("readit.db", {
	strict: true,
});

// Create the invites table if it doesn't exist
db.run(`
	CREATE TABLE IF NOT EXISTS invites (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT NOT NULL,
		createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		usedAt TIMESTAMP
	)
`);

// Generate a new invite token
function generateInviteToken() {
	const hasher = new Bun.CryptoHasher("sha256", "super-secret-invite-key");
	return hasher.update(Math.random().toString()).digest("hex");
}

// Store the token in the database
function createInvite() {
	const token = generateInviteToken();
	db.run("INSERT INTO invites (token) VALUES ($token)", { token });
	console.log(`Invite token created: ${token}`);
}

// CLI usage
const command = process.argv[2];
const arg = process.argv[3];

if (command === "create") {
	createInvite();
} else {
	console.log("requires an arg");
}
