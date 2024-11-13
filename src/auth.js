const jwt = require("jsonwebtoken");
const { JWT_KEY } = require("./");

function authenticateToken(req, res, next) {
	if (!req.cookies || !req.cookies.auth_token) {
		return res.redirect("/login");
	}

	const token = req.cookies.auth_token;

	// If no token, deny access
	if (!token) {
		return res.redirect(
			`/login?redirect=${encodeURIComponent(req.originalUrl)}`,
		);
	}

	try {
		const user = jwt.verify(token, JWT_KEY);
		req.user = user;
		next();
	} catch (error) {
		res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
	}
}

module.exports = { authenticateToken };
