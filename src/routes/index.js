const express = require('express');
const he = require('he');
const router = express.Router();
const geddit = require('../geddit.js');
const G = new geddit.Geddit();


// GET /
router.get('/', async (req, res) => {
  res.redirect("/r/all")
});

// GET /r/:id
router.get('/r/:subreddit', async (req, res) => {
  var subreddit = req.params.subreddit;
  var query = req.query? req.query : {};
  if (!query.sort) {
    query.sort = 'hot';
  }

  var postsReq = G.getSubmissions(query.sort, `${subreddit}`, query);
  var aboutReq = G.getSubreddit(`${subreddit}`);

  var [posts, about] = await Promise.all([postsReq, aboutReq]);

  res.render('index', { subreddit, posts, about, query });
});

// GET /comments/:id
router.get('/comments/:id', async (req, res) => {
  var id = req.params.id;

  response = await G.getSubmissionComments(id);

  res.render('comments', unescape_submission(response));
});

// GET /subs
router.get('/subs', async (req, res) => {
  res.render('subs');
});

// GET /media
router.get('/media/*', async (req, res) => {
  var url = req.params[0];
  console.log(`making request to ${url}`);
  return await fetch(url, {
    headers: {
      Accept: "*/*",
    }
  });
});

module.exports = router;

function unescape_submission(response) {
  var post = response.submission.data;
  var comments = response.comments;

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
    if(comment.data.replies.data) {
      if(comment.data.replies.data.children) {
        comment.data.replies.data.children.forEach(unescape_comment);
      }
    }
  }
}
