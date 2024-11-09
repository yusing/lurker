const express = require("express");
const he = require("he");
const { hash, compare } = require("bun");
const jwt = require("jsonwebtoken");
const router = express.Router();
const secretKey = "your_secret_key"; // Replace with your actual secret key
const geddit = require("../geddit.js");
const { db } = require("../index");
const G = new geddit.Geddit();

// GET /
router.get("/", async (req, res) => {
	res.render("home");
});

// GET /r/:id
router.get("/r/:subreddit", async (req, res) => {
	const subreddit = req.params.subreddit;
	const isMulti = subreddit.includes("+");
	const query = req.query ? req.query : {};
	if (!query.sort) {
		query.sort = "hot";
	}

	const postsReq = G.getSubmissions(query.sort, `${subreddit}`, query);
	const aboutReq = G.getSubreddit(`${subreddit}`);

	const [posts, about] = await Promise.all([postsReq, aboutReq]);

	res.render("index", { subreddit, posts, about, query, isMulti });
});

// GET /comments/:id
router.get("/comments/:id", async (req, res) => {
	const id = req.params.id;

	const params = {
		limit: 50,
	};
	response = await G.getSubmissionComments(id, params);

	res.render("comments", unescape_submission(response));
});

// GET /comments/:parent_id/comment/:child_id
router.get("/comments/:parent_id/comment/:child_id", async (req, res) => {
	const parent_id = req.params.parent_id;
	const child_id = req.params.child_id;

	const params = {
		limit: 50,
	};
	response = await G.getSingleCommentThread(parent_id, child_id, params);
	const comments = response.comments;
	comments.forEach(unescape_comment);
	res.render("single_comment_thread", { comments, parent_id });
});

router.get("/login", async (req, res) => {
	res.render("login");
});

// GET /subs
router.get("/subs", async (req, res) => {
	res.render("subs");
});

// GET /media
router.get("/media/*", async (req, res) => {
	const url = req.params[0];
	const ext = url.split(".").pop().toLowerCase();
	const kind = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
		? "img"
		: "video";
	res.render("media", { kind, url });
});

router.get("/register", async (req, res) => {
	res.render("register");
});

router.post("/register", async (req, res) => {
	const { username, password, confirm_password } = req.body;
	console.log("Request body:", req.body);
	if (!username || !password || !confirm_password) {
		return res.status(400).send("All fields are required");
	}
	if (password !== confirm_password) {
		return res.status(400).send("Passwords do not match");
	}
	try {
		const hashedPassword = await hash(password);
		db.query("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
			username,
			hashedPassword,
		]).run();
		res.status(201).redirect("/");
	} catch (err) {
		console.log(err);
		res.status(400).send("Error registering user");
	}
});

// POST /login
router.post("/login", async (req, res) => {
	const { username, password } = req.body;
	const user = db
		.query("SELECT * FROM users WHERE username = ?", [username])
		.get();
	if (user && await compare(password, user.password_hash)) {
		res.status(200).redirect("/");
	} else {
		res.status(401).send("Invalid credentials");
	}
});

// POST /subscribe
router.post("/subscribe", async (req, res) => {
	const { username, subreddit } = req.body;
	const user = db
		.query("SELECT * FROM users WHERE username = ?", [username])
		.get();
	if (user) {
		const existingSubscription = db
			.query(
				"SELECT * FROM subscriptions WHERE user_id = ? AND subreddit = ?",
				[user.id, subreddit],
			)
			.get();
		if (existingSubscription) {
			res.status(400).send("Already subscribed to this subreddit");
		} else {
			db.query("INSERT INTO subscriptions (user_id, subreddit) VALUES (?, ?)", [
				user.id,
				subreddit,
			]).run();
			res.status(201).send("Subscribed successfully");
		}
	} else {
		res.status(404).send("User not found");
	}
});

router.post("/unsubscribe", async (req, res) => {
	const { username, subreddit } = req.body;
	const user = db
		.query("SELECT * FROM users WHERE username = ?", [username])
		.get();
	if (user) {
		const existingSubscription = db
			.query(
				"SELECT * FROM subscriptions WHERE user_id = ? AND subreddit = ?",
				[user.id, subreddit],
			)
			.get();
		if (existingSubscription) {
			db.run("DELETE FROM subscriptions WHERE user_id = ? AND subreddit = ?", [
				user.id,
				subreddit,
			]);
			res.status(200).send("Unsubscribed successfully");
		} else {
			res.status(400).send("Subscription not found");
		}
	} else {
		res.status(404).send("User not found");
	}
});

module.exports = router;

function unescape_submission(response) {
	const post = response.submission.data;
	const comments = response.comments;

	if (post.selftext_html) {
		post.selftext_html = he.decode(post.selftext_html);
	}
	comments.forEach(unescape_comment);

	return { post, comments };
}

function unescape_comment(comment) {
	if (comment.data.body_html) {
		comment.data.body_html = he.decode(comment.data.body_html);
	}
	if (comment.data.replies) {
		if (comment.data.replies.data) {
			if (comment.data.replies.data.children) {
				comment.data.replies.data.children.forEach(unescape_comment);
			}
		}
	}
}
