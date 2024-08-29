const express = require('express');
const router = express.Router();
const geddit = require('../geddit.js');
const G = new geddit.Geddit();
const fs = require('fs/promises');


// GET /
router.get('/', async (req, res) => {
  res.redirect("/r/all")
});

// GET /r/:id
router.get('/r/:subreddit', async (req, res) => {
  var subreddit = req.params.subreddit;

  var postsReq = G.getSubmissions(`r/${subreddit}`);
  var aboutReq = G.getSubreddit(`${subreddit}`);

  var [posts, about] = await Promise.all([postsReq, aboutReq]);
  res.render('index', { subreddit, posts, about });
});

// GET /comments/:id
router.get('/comments/:id', async (req, res) => {
  var id = req.params.id;

  response = await G.getSubmissionComments(id);
  var post = response.submission.data;
  var comments = response.comments;

  res.render('comments', { post, comments });
});

module.exports = router;
