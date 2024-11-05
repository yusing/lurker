const express = require("express");
const path = require("node:path");
const routes = require("./routes/index");
const geddit = require("./geddit.js");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, "public")));
app.use("/", routes);

const port = process.env.READIT_PORT;
const server = app.listen(port ? port : 3000, () => {
	console.log(`started on ${server.address().port}`);
});
