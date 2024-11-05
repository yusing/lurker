const express = require("express");
const he = require("he");
const router = express.Router();
const geddit = require("../geddit.js");
const G = new geddit.Geddit();

// GET /
router.get("/", async (req, res) => {
	res.redirect("/r/all");
});

// GET /r/:id
router.get("/r/:subreddit", async (req, res) => {
	const subreddit = req.params.subreddit;
	const query = req.query ? req.query : {};
	if (!query.sort) {
		query.sort = "hot";
	}

	const postsReq = G.getSubmissions(query.sort, `${subreddit}`, query);
	const aboutReq = G.getSubreddit(`${subreddit}`);

	const [posts, about] = await Promise.all([postsReq, aboutReq]);

	res.render("index", { subreddit, posts, about, query });
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
