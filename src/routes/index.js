const express = require("express");
const he = require("he");
const router = express.Router();
const geddit = require("../geddit.js");
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
