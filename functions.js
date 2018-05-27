const mongoose = require("mongoose");
const request = require("request");
const jwt = require("jsonwebtoken");



function linkShortener(long, short, callback) {
	let returnData = {};
	if (!short) slugMaker().then(short => {
		console.log(short);
		mongoose.model("ShortDomain").findOne({long: long}, (err, url) => {
			if (url) {
				// url already in database, return shortlink
				returnData = url;
				console.log(returnData);
				callback(returnData);
			}
			mongoose.model("ShortDomain").create({
				long: long,
				short: short
			}, (err, sd) => {
				if (err) returnData.err = err;
				returnData = sd;
				console.log(returnData);
				callback(returnData);
			});

		});
	});
}

/**
 * Deprecate Functions and API Routes
 * @param req
 * @param res
 * @param next
 */
function deprecate(req, res, next) {
	res.json({"sucess": false, msg: "This Route/Function is deprecated, please refrain from using it."});
}

/**
 * Validate Google reCaptchas
 * @param gResponse
 * @param callback
 */
function validateReCAPTCHA(gResponse, callback) {
	const secretKey = config.reCaptcha.privateKey;
	request.post(
		`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${gResponse}`,
		function (error, response, body) {
			body = JSON.parse(body);
			callback(body.error, body.success);
		}
	);
}

/**
 * Verify JSON Web Tokens
 * @param jwt_token
 * @param callback
 */
function verifyJWT(jwt_token, callback) {
	jwt.verify(jwt_token, config.jwtSecret, (e, u) => {
		if (u && u.id) callback(e, u.id);
		else callback(e);
	});
}

/**
 * requireLogin for User Specific areas
 * @param req Request send by $User to the server
 * @param res Response to be send by the server
 * @param next The next handler
 */
function requireLogin(req, res, next) {
	verifyJWT(req.cookies.token, (err, userId) => {
		console.log(userId);
		mongoose.model("User").findOne({_id: userId}, (err, user) => {
			if (!user) {
				res.redirect('/login');
			} else {
				next();
			}
		});
	});
}

/**
 * reuireAuthentication for user-specific API routes
 * @param req
 * @param res
 * @param next
 */
function requireAuthentication(req, res, next) {
	let tk = req.body.token || req.query.token || req.headers['x-access-token'] || req.cookies.token;
	if (!tk) res.json({success: false, msg: "Failed to authenticate with Token."});
	verifyJWT(tk, (err, userId) => {
		mongoose.model("User").findOne({_id: userId}, (err, user) => {
			if (user) {
				req.authentication = {
					user: user,
					token: tk
				};
				next();
			} else {
				res.end(JSON.stringify({success: false, msg: "Failed to authenticate with Token."}));
				console.log("API Access without valid Authentication. Token: ", tk)
			}
		});
	});
}
