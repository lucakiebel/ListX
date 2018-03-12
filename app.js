const express = require('express')                        				// Express as a Webserver
	, path = require('path')                              				// path used for local file access
	, favicon = require('serve-favicon')                  				// Serve favicons for every request
	, logger = require('morgan')                          				// Morgan to log requests to the console
	, cookieParser = require('cookie-parser')             				// Cookie parser to, well, parse cookies
	, bodyParser = require('body-parser')                 				// Again, the name stands for the concept, parse HTTP POST bodies
	, mongoose = require('bluebird').promisifyAll(require('mongoose'))  // Mongoose is used to connect to the mongoDB server
	, methodOverride = require('method-override')         				// Method Override to use delete method for elemets
	, i18n = require('i18n')                              				// i18n for translations (German/English)
	, session = require('client-sessions')                				// Client-Sessions to be able to access the session variables
	, bCrypt = require('bcryptjs')                   					// bCrypt for secure Password hashing (on the server side)
	, app = express()
	, mg = require('mailgun-js')										// Mailgun for handling emails
	, request = require("request")										// request for reCaptcha validation
	, fs = require("fs")
	, jwt = require("jsonwebtoken")										// jwt as a means of authentication
	, config = require(path.join(__dirname, "config.json"));			// config file

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.use(favicon(path.join(__dirname, 'public', "static" , 'images', 'favicon.png')));
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride());

const mailgun = mg({apiKey: config.mailgun.privateKey, domain: config.mailgun.domain});

i18n.configure({

//define what languages we support in our application
	locales: ['en', 'de'],

//define the path to language json files, default is /locales
	directory: __dirname + '/locales',

//define the default language
	defaultLocale: 'en',

// define a custom cookie name to parse locale settings from
	cookie: 'preferredLang',

// sync locale information across files
	syncFiles: false,
	updateFiles: false
});

app.use(cookieParser("preferredLang"));
app.use(session({
	secret: "preferredLang",
	resave: true,
	saveUninitialized: true,
	cookie: {maxAge: 900000, httpOnly: true}
}));

app.use(i18n.init);

console.info("ListX Started on http://" + config.domain);

// database setup
mongoose.Promise = Promise;
mongoose.connect('mongodb://' + config.mongo.address);	// sudo mongod --dbpath=/var/data --port=27070 --fork --logpath=./log.txt


const Item = mongoose.model('Item', {
	list: mongoose.Schema.Types.ObjectId,
	name: String,
	amount: String,
	count: Number,
	art: String,
	date: {
		type: String, default: () => {
			return (new Date(Date.now())).toString();
		}
	},
	remember: Boolean,
	bought: {type: Boolean, default: false}
});

const User = mongoose.model('User', {
	username: String,
	name: String,
	email: String,
	password: String,
	lists: [], // 1 User => 0+ Lists
	premium: {type: Boolean, default: false},
	alphaTester: {type: Boolean, default: false},
	betaTester: {type: Boolean, default: false},
	validated: {type: Boolean, default: false},
	address: String,
	zipCode: String,
	country: String,
	additionalFields: []
});

const EmailValidation = mongoose.model("EmailValidation", {
	email: String,
	userId: mongoose.Schema.Types.ObjectId,
	expiry: {
		type: String, default: () => {
			return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
		}
	} // 45 Minutes
});

const PasswordReset = mongoose.model("PasswordReset", {
	userId: mongoose.Schema.Types.ObjectId,
	expiry: {
		type: String, default: () => {
			return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
		}
	} // 45 Minutes
});

const UserDeletionToken = mongoose.model("UserDeletionToken", {
	userId: mongoose.Schema.Types.ObjectId
});

const EmailReset = mongoose.model("EmailReset", {
	userId: mongoose.Schema.Types.ObjectId,
	expiry: {
		type: String, default: () => {
			return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
		}
	} // 45 Minutes
});

const List = mongoose.model('List', {
	name: String,
	country: String,
	language: String,
	admin: mongoose.Schema.Types.ObjectId,
	invitations: [] // 1 List => 0+ Open Invitations
});

const Invitation = mongoose.model('Invitation', {
	name: String,
	email: String,
	list: mongoose.Schema.Types.ObjectId
});


const ShortDomain = mongoose.model('ShortDomain', {
	short: String,
	long: String,
	hits: {type: Number, default: 0}
});


app.get("/api/short/:short", (req, res) => {
	const {short} = req.params;
	const long = req.query.long;
	linkShortener(long, short, obj => res.json(obj));
});

app.get("/api/short/:short/metrics", (req, res) => {
	ShortDomain.findOne({short: req.params.short}, (err, url) => {
		if (!err && url) res.json(url);
	});
});

app.get("/s/:short", (req, res) => {
	// increment the hits-counter by one and redirect to LONG
	ShortDomain.findOneAndUpdate({short: req.params.short}, {$inc: {hits: 1}}, (err, url) => {
		if (err) res.redirect("/");
		res.redirect(url.long);
	});
});


/**
 * UI CONTROLLER
 */

app.post('/signup', (req, res) => {
	validateReCAPTCHA(req.body["g-recaptcha-response"], (err, success) => {
		if (success) {
			bCrypt.genSalt(10, (err, salt) => {
				bCrypt.hash(req.body.password, salt, function (err, hash) {
					let userData = {
						name: req.body.name,
						email: req.body.email,
						password: hash
					};
					if (req.body.list) userData.lists = [req.body.list];
					User.create(userData, function (err, user) {
						if (err) {
							res.json({success: false});
						}
						EmailValidation.create({email: user.email, userId: user._id}, (err, valid) => {
							if (err) res.json({success: false});
							const short = "http://" + config.domain + "/validate/" + valid._id;
							let mailData = {};
							mailData.to = user.email;
							mailData.subject = "ListX Account Activation";
							mailData.body = `ListX Account Activation \nHey ${req.body.name}, thanks for signing up with ListX! \nPlease verify your email address by clicking the following link: \n${short} (Voids in 45 minutes)\nSee you on the other side!`;
							mailData.send = true;
							mail(mailData);
							console.log("Signup Proccess complete: " + !!user);
							res.json({success: true, user: user, validation: valid});
						});
					});
				});
			});
		} else {
			res.json({success: false, error: err, code: 701});
		}
	});

});

// signup page for users
app.get('/signup', function (req, res) {
	if (req.query.p === "✓") { /** premium signup **/
	}
	if (req.query.b === "✓") { /** beta signup **/
	}
	res.render('signup', {
		email: "",
		list: null
	});
});

/**
 * EMail Validation: Get Validation ID, find Email, see if not expired, set user.validation = true, delete EmailValidation, send success mail, redirect to dashboard
 */
app.get("/validate/:id", function (req, res) {
	EmailValidation.findOne({_id: req.params.id}, (err, valid) => {
		if (err) res.json({success: false});
		if (Number(valid.expiry) >= new Date(Date.now()).getTime()) {
			// Validation not expired
			User.findOneAndUpdate({_id: valid.userId}, {$set: {validated: true}}, (err, u) => {
				// if there was an error, redirect to /signup and pass error 201 (user not found)
				if (err) res.redirect("/signup?e=201");
				// else redirect to login
				res.redirect("/login");
			});
		}
		else {
			// if validation expired, delete account and send to signup with error 601 (validation expired)
			User.findOneAndRemove({_id: valid.userId}, (err) => {
				console.log(err)
			});
			res.redirect("/signup?e=601")
		}
	})
});

/**
 * Password Reset: Only display Email input
 */
app.get("/user/reset-password", (req, res) => {
	if (req.query.expired === "1") {
		// Password link expired.
		res.render("reset-password-email-form", {expired: true});
	}
	res.render("reset-password-email-form", {expired: false});
});

/**
 * Get Email from body, send mail to email,
 *      if mail is user: send password reset link
 *      else: send bruteforce reminder
 */
app.post("/api/reset", (req, res) => {
	const email = req.body.email;
	validateReCAPTCHA(req.body.recRes, (err, success) => {
		if (success) {
			User.findOne({email: email}, function (err, user) {
				if (err || !user) {
					let mailData = {
						to: email,
						subject: "ListX Password Reset Attempt",
						body: `You (or someone else) just entered this email address (${email}) when trying to change the password of a ListX account. \n\nHowever there is no user with this email address in our database, thus the password reset attempt failed. \n\nIf you are in fact a ListX customer and were expecting this email, please try again using the email address you gave when opening your account. \n\nIf you are not a ListX customer ignore this email. Someone most likely mistyped his own email address. \n\nFor more information on ListX, please visit http://listx.io. \n\nListX Support`,
						send: true
					};
					mail(mailData);
					res.json({success: true});
				} else {
					PasswordReset.create({userId: user._id}, (err, pwr) => {
						let long = "http://" + config.domain + "/user/reset-password/" + pwr._id;
						linkShortener(long, null, URL => {
							URL = "http://" + config.domain + "/s/" + URL.short;
							let mailData = {
								to: user.email,
								subject: "ListX Password Reset",
								body: `Hey ${user.name}, \nYou (or someone else) just entered this email address (${user.email}) when trying to change the password of a ListX account. \n\nIf it was you and you are trying to reset or change your password, please follow this link in order to set a new password: \n${URL} (Voids in 45 minutes)\n\nIf you did not request a password reset or change, please ignore this email. Someone most likely mistyped his own email address. \n\nListX Support`,
								send: true
							};
							mail(mailData);
							res.json({success: true});
						});
					});
				}
			});
		} else {
			res.json({success: false, error: err})
		}
	});
});

/**
 * Password reset link: display password form
 */
app.get("/user/reset-password/:id", (req, res) => {
	PasswordReset.findOne({_id: req.params.id}, (err, pwr) => {
		if (err) res.json({success: false});
		console.log(pwr.expiry, Date.now());
		if (pwr.expiry >= Date.now()) {
			res.render("reset-password-password-form", {
				userId: pwr.userId,
				pwrId: req.params.id
			});
		}
		else {
			res.redirect("/user/reset-password?expired=1");
		}
	});
});

app.post("/api/passwordreset", (req, res) => {
	let {pwrId, password} = req.body;
	bCrypt.hash(password, 10, function (err, hashedpassword) {
		PasswordReset.findOneAndRemove({_id: pwrId}, (err, pwr) => {
			if (err) res.json({success: false, code: 101});
			User.findOneAndUpdate({_id: pwr.userId}, {$set: {password: hashedpassword}}, (err, user) => {
				if (err) res.json({success: false, error: 201});
				console.log("Passwordreset for: ", user.email);
				res.json({success: true});
			});
		});

	});
});

app.post('/login', function (req, res) {
	User.findOne({email: req.body.email}, function (err, user) {
		console.log(user);
		if (!user) {
			console.error("No User with Email \"" + req.body.email + "\" found.");
			res.json({correct: false});
		}
		else if (false === user.validated) {
			console.error("User not yet validated");
			res.json({correct: false, error: "User not validated", code: 602});
		}
		else {
			bCrypt.compare(req.body.password, user.password, function (err, bc) {
				if (bc) {
					// sets a cookie with the user's id
					res.cookie('token', jwt.sign({id: user._id}, config.jwtSecret, {expiresIn: "90d"}), {});
					//req.cookies.token = jwt.sign({id:user._id}, config.jwtSecret, {expiresIn:"90d"});

					console.info("User " + user.email + " successfully logged in!");
					res.json({correct: true, user: user});
				} else {
					console.error("Wrong Password for " + user.name);
					res.json({correct: false});
				}
			});
		}
	});
});


app.get('/login', (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		if (userId) {
			User.findOne({_id: userId}, (err, user) => {
				if (user) res.redirect("/dashboard")
			});
		} else {
			res.render("login");
		}
	});
});

app.get('/logout', (req, res) => {
	res.cookie("token", "", {maxAge: new Date(0), domain: config.domain, path: "/"});
	res.clearCookie("token");
	res.render("logout", {domain: config.domain});
});

app.get("/auth/logout", (req, res) => {
	res.cookie("token", "", {maxAge: new Date(0), domain: config.domain, path: "../"});
	res.clearCookie("token");
	res.render("logout", {domain: config.domain});
});


/**
 * Nav Element Routes
 */


app.get("/support", (req, res) => {
	res.redirect("https://github.com/lucakiebel/ListX-Alpha/issues/new");
});

// Developer Page
app.get("/dev", (req, res) => {
	res.render("index-dev");
});

app.get("/imprint", (req, res) => {
	res.redirect("/legal/imprint");
});

app.get("/guides", (req, res) => {
	res.render("guides");
});

app.get("/privacy", (req, res) => {
	res.redirect("/legal/privacy");
});

app.get("/terms", (req, res) => {
	res.redirect("/legal/terms")
});

app.get("/legal/imprint", (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		User.findOne({_id: userId}, (err, user) => {
			res.render("imprint", {user: user || {}});
		});
	});
});

app.get("/legal/privacy", (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		User.findOne({_id: userId}, (err, user) => {
			res.render("privacy", {user: user || {}});
		});
	});
});

app.get("/legal/terms", (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		User.findOne({_id: userId}, (err, user) => {
			res.render("terms", {user: user || {}});
		});
	});
});

app.get("/legal/passwords", (req, res) => {
	const lang = req.cookies.preferredLang;
	let url = "http://blog.luca-kiebel.de/listx-passwords-";
	url += lang || "en";
	res.redirect(url);
});

app.get("/api/version", (req, res) => {
	res.json(
		{
			"info": "ListX API Version Manager. Copyright 2017 Bleurque, Inc.",
			"date": new Date(Date.now()).toDateString(),
			"version": require("./package.json").version
		}
	);
});

app.get("/lists", (req, res) => {
	res.redirect("/dashboard");
});

/**
 * Stuff which needs authentication
 */
// List index per List if $user is part of it
app.get('/list/:id', requireLogin, (req, res) => {
	List.findOne({_id: req.params.id}, (err, list) => {
		if (err) {
			res.render('index', {error: 'List not found!'});
		}
		verifyJWT(req.cookies.token, (err, userId) => {
			if (userId) {
				User.findOne({_id: userId}, (err, user) => {
					if (user.lists.indexOf(list._id) >= 0) {
						res.render('list', {
							list: list, user: user
						});
					}
					else {
						console.log("User " + user.name + " is not member of List " + list.name);
						res.render('index', {error: 'User not part of List!'});
					}
				});
			}
		});
	});
});

// List Settings. If $user is list.admin render admin settings
app.get('/list/:id/settings', requireLogin, function (req, res) {
	List.findOne({_id: req.params.id}, function (err, list) {
		if (err) {
			res.render('index', {error: 'List not found!'});
		}
		verifyJWT(req.cookies.token, (err, userId) => {
			User.findOne({_id: userId}, (err, user) => {
				if (user.lists.indexOf(list._id) >= 0) {
					if (list.admin.toString() === user._id.toString()) {
						res.render('list-settings-admin', {
							list: list, user: user
						});
						console.log("rendering " + list.name + "'s admin settings for user " + user.name);
					}
					else {
						res.render('list-settings', {
							list: list, user: user
						});
						console.log("rendering " + list.name + "'s settings for user " + user.name);
					}
				}
				else {
					console.log("User " + user.name + " is not member of List " + list.name);
					res.redirect("/dashboard");
				}
			});
		});
	});
});


// Users Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		User.findOne({_id: userId}, (err, user) => {
			res.render('dashboard', {user: user});
		});
	});
});


// User Profile
app.get('/user', requireLogin, (req, res) => {
	verifyJWT(req.cookies.token, (err, userId) => {
		User.findOne({_id: userId}, (err, user) => {
			res.render('settings-user', {user: user});
		});
	});
});


// Invitations page for invited users to join a family and "sign up"
app.get('/list/:id/invitations/:invId', (req, res) => {
	List.findOne({_id: req.params.id}, function (err, list) {
		if (err) {
			res.render('index', {error: 'List not found!', translate: res});
		}

		Invitation.findOne({_id: req.params.invId}, function (err, inv) {
			if (err) {
				res.render('index', {error: 'Invitation not found!', translate: res});
			}
			if (list.invitations.map(function (e) {
					return e._id;
				}).indexOf(inv._id)) {
				// List exists and has an invitation for :name
				// find user by inv id
				User.findOne({email: inv.email}, (err, user) => {
					if (user) {
						User.findOneAndUpdate({_id: user._id}, {$push: {lists: inv.list}}, (err, update) => {
							if (!err) {
								res.redirect("/dashboard?newlist");
							}
						});
					} else {
						res.render('signup', {
							list: list,
							email: inv.email
						});
					}
				});
			}
			else res.render('index', {error: 'Invitation not associated with List!'});
		});
	});
});

/**
 * Basic Route to change the used language
 */

app.get("/language/:lang", (req, res) => {
	res.cookie("preferredLang", req.params.lang, {maxAge: 9000000, httpOnly: true});
	let url = req.get('Referrer') !== undefined ? req.get('Referrer') : "/";
	res.redirect(url);
});

/**
 * Standard User Route
 */

app.all('/', (req, res) => {
	if (req.cookies.token) {
		verifyJWT(req.cookies.token, (err, userId) => {
			err && res.render("index", {user: false});
			User.findOne({_id: userId}, (err, user) => {
				if (user) res.render('index', {user: user});
				else res.render('index', {user: false});
			});
		});
	} else res.render('index', {user: false});

});


/**
 * API Controller
 */

/**
 * Lists API: Control Lists
 * /api/lists
 */

// get all lists
app.get('/api/lists', requireAuthentication, (req, res) => {
	if (req.app.get('env') === 'development') {
		// use mongoose to get all lists in the database
		List.find(function (err, list) {

			// if there is an error retrieving, send the error
			if (err) {
				res.json({success: false, error: 'No Lists Found!', code: 400})
			}


			res.json(list); // return all lists in JSON format
			console.log(list);
		});
	}
});

// get single list
app.get('/api/lists/:id', requireAuthentication, (req, res) => {
	List.findOne({_id: req.params.id}, function (err, list) {
		if (req.authentication.user.lists.indexOf(list._id) >= 0) {
			// if there is an error retrieving, send the error, nothing after res.send(err) will execute
			if (err) {
				res.json({success: false, error: 'List not found', code: 401})
			}


			res.json(list); // return the List in JSON format
			console.log(list);
		}
	});
});

// get item-count of a list
app.get('/api/lists/:id/itemCount', requireAuthentication, (req, res) => {
	List.findOne({_id: req.params.id}, function (err, list) {
		if (req.authentication.user.lists.indexOf(list._id) >= 0) {
			if (err) {
				res.json({success: false, error: 'List not found', code: 401})
			}
			Item.find({list: list._id}, function (err, items) {
				if (err) {
					res.json({success: false, error: 'Items not found', code: 300})
				}
				res.json(items.length);
			});
		}
	});
});

// get all invitaions for a list
app.get('/api/lists/:id/invitations', requireAuthentication, (req, res) => {
	Invitation.find({list: req.params.id}, function (err, invitations) {
		if (req.authentication.user.lists.indexOf(req.params.id) >= 0) {
			if (err) {
				res.json({success: false, error: 'No Invitations found for this List', code: 402});
			}
			res.json(invitations);
		}
	});
});

// create list
app.post('/api/lists', requireAuthentication, (req, res) => {
	List.create({
		name: req.body.name,
		country: req.body.country,
		admin: req.body.admin,
		invitations: req.body.invitations
	}, function (err, list) {
		if (err) {
			res.json({success: false, error: 'List not created!', code: 403});
		}
		res.json({success: true, id: list._id.toString()});
	});
});

// let a user remove themselves from a list
app.post("/api/lists/:id/removeMeFromList", requireAuthentication, (req, res) => {
	User.findOneAndUpdate({_id: req.authentication.user._id}, {$pull: {lists: req.params.id.toString()}}, {"new": true}, (err, user) => {
		err && res.json({success: false, err: err});
		res.json({success: true});
	});
});

// remove a list
app.delete('/api/lists/:id/admin', requireAuthentication, (req, res) => {
	let user = req.authentication.user._id;
	List.findOne({_id: req.params.id}, (err, l) => {
		if (l.admin.toString() === user.toString()) {
			List.remove({_id: req.params.id}, function (err, list) {
				if (err) {
					res.json({success: false, error: 'List not removed', code: 404});
				}
				res.json({success: true, list: list});
			});
		}
		else res.json({success: false, error: 'User not List Admin'});
	});
});

// remove all users except the admin from :list
app.delete("/api/lists/:id/removeAllUsers", requireAuthentication, (req, res) => {
	let user = req.authentication.user._id;
	List.findOne({_id: req.params.id}, (err, list) => {
		console.log("err", err);
		!!err && (res.json({success: false, err: err}));
		if (list.admin.toString() === user.toString()) {
			User.find({lists: list._id.toString()}, (err, users) => {
				console.log("users: ", users);
				users.forEach(user => {
					if (list.admin.toString() === user._id.toString()) {
						// keep user
						console.log("keeping ", user.email);
					} else {
						User.update({_id: user._id}, {$pull: {lists: list._id.toString()}}, {"new": true}, (err, update) => {
							!!err && res.json({success: false, err: err});
							console.log("deleting ", user.email, update.lists)
						});
					}
				});
				res.json({success: true});
			});
		}
	});
});

// delete list
app.delete('/api/lists/:id', requireAuthentication, (req, res) => {
	let user = req.authentication.user._id.toString();
	let list = req.params.id;
	User.findOne({_id: user}, (err, u) => {
		if (err) res.json({success: false}); // user not found
		u.lists = u.lists.filter(e => e.id !== list);
		User.findOneAndUpdate({_id: u._id}, {$set: {lists: u.lists}}, (err, u2) => {
			if (err) res.json({success: false}); //user not updated
			res.json({success: true});
		});
	});
});

/**
 * List Settings:
 */

app.post("/api/lists/update/name", requireAuthentication, (req, res) => {
	const {list, newName} = req.body;
	let user = req.authentication.user._id.toString();
	List.findOne({_id: list}).then(l => {
		if (l.admin.toString() === user) {
			List.update({_id: list}, {$set: {name: newName}}, (err, l2) => {
				!!err && res.json({success: false, err: err});
				res.json({success: true}); // reload page in js
			});
		}
	});
});

app.post("/api/lists/update/country", requireAuthentication, (req, res) => {
	let {list, newCountry, admin} = req.body;
	admin = req.authentication.user._id.toString();
	List.findOne({_id: list}).then(l => {
		if (l.admin.toString() === admin) {
			List.update({_id: list}, {$set: {country: newCountry}}, (err, l2) => {
				!!err && res.json({success: false, err: err});
				res.json({success: true}); // reload page in js
			});
		}
	});
});

app.get("/api/lists/:id/userEmails", requireAuthentication, (req, res) => {
	User.find({lists: req.params.id}, (err, users) => {
		if (req.authentication.user.lists.indexOf(req.params.id) >= 0) {
			!!err && res.json({success: false, err: err});
			res.json({
				success: true, users: users.map(u=> {
					return {_id: u._id, email: u.email}
				})
			});
		}
	});
});

app.get("/api/lists/:id/invitationsForSettings", requireAuthentication, (req, res) => {
	Invitation.find({list: req.params.id}, (err, invs) => {
		if (req.authentication.user.lists.indexOf(req.params.id) >= 0) {
			!!err && res.json({success: false, err: err});
			res.json({
				success: true, invitations: invs.map(i=> {
					return {_id: i._id, email: i.email}
				})
			});
		}
	});
});

// update a list
/**
 * @deprecated since v0.10.0
 */
app.post('/api/lists/:id', deprecate, (req, res) => {
	let update = req.body;
	List.findOneAndUpdate({_id: req.params.id}, update, function (err, list) {
		if (err) {
			res.json({error: 'List not updated', success: false, code: 405});
		}
		res.json({success: true, list: list});
	});
});

/**
 * Items API: Control Items
 * /api/items
 */

// get all items per list
app.get('/api/items/:id', requireAuthentication, (req, res) => {
	if (req.authentication.user.lists.indexOf(req.params.id) >= 0) {
		// use mongoose to get all items in the database
		Item.find({list: req.params.id}, function (err, items) {

			// if there is an error retrieving, send the error. nothing after res.send(err) will execute
			if (err) {
				res.json({success: false, error: 'Items not found', code: 300});
			}


			res.json({success: true, items: items}); // return all items in JSON format
			console.log(items);
		});
	}
});

// create item
app.post('/api/items', requireAuthentication, (req, res) => {
	if (req.authentication.user.lists.indexOf(req.body.list) >= 0) {
		Item.create({
			list: req.body.list,
			name: req.body.name,
			amount: req.body.amount,
			art: req.body.art
		}, function (err, item) {
			if (err) {
				res.json({success: false, error: 'Item not created', code: 301});
			}
			res.json(item);
		});
	}
	// TODO: don't add preset fields to list, loop through a mask and add the parameters that way
});

// remove an item
app.delete('/api/items/:id', requireAuthentication, (req, res) => {
	Item.findOne({_id: req.params.id}, function (err, item) {
		if (req.authentication.user.lists.indexOf(item.list.toString()) >= 0) {
			Item.remove({_id: item._id}, (err, item) => {
				if (err) {
					res.json({success: false, error: 'Item not removed', code: 302});
				}
				res.json(item);
			});
		}
	});
});

// update an item
app.post('/api/items/:id', requireAuthentication, (req, res) => {
	let update = req.body;
	Item.findOneAndUpdate({_id: req.params.id}, update, function (err, item) {
		if (err) {
			res.json({success: false, error: 'Item not updated', code: 303});
		}
		res.json(item);
	});
});


/**
 * Users API: Control Users
 * /api/users
 */

// get all users
app.get('/api/users', deprecate, requireAuthentication, (req, res) => {
	if (req.app.get('env') === 'development') {
		// use mongoose to get all users in the database
		User.find(function (err, users) {
			// if there is an error retrieving, send the error. nothing after res.send(err) will execute
			if (err) {
				res.json({success: false, error: 'No users found', code: 200});
			}
			res.json(users); // return all users in JSON format
		});
	}
});

// get single user
app.get('/api/users/:id', requireAuthentication, (req, res) => {
	User.findOne({_id: req.params.id}, function (err, user) {
		// if there is an error retrieving, send the error. nothing after res.send(err) will execute
		if (err || !user) res.json({success: false, error: 'User not found', code: 201});
		let tmp = {
			_id: user._id,
			name: user.name,
			email: user.email,
			lists: user.lists,
			validated: user.validated
		};
		if (user.alphaTester) tmp.alphaTester = true;
		if (user.betaTester) tmp.betaTester = true;
		if (user.premium) tmp.premium = true;
		res.json(tmp); // return the user in JSON format
	});
});

// get single user per mail
app.get('/api/users/byMail/:mail', requireAuthentication, (req, res) => {
	User.findOne({email: req.params.mail}, function (err, user) {
		if (err) res.json({success: false, error: 'User not found', code: 201});
		let tmp = {
			_id: user._id,
			name: user.name,
			email: user.email,
			lists: user.lists,
			validated: user.validated
		};
		if (user.alphaTester) tmp.alphaTester = true;
		if (user.betaTester) tmp.betaTester = true;
		if (user.premium) tmp.premium = true;
		res.json(tmp);
	});

});

app.get("/api/users/me", requireAuthentication, (req, res) => {
	let user = req.authentication.user;
	let tmp = {
		_id: user._id,
		name: user.name,
		email: user.email,
		lists: user.lists,
		validated: user.validated
	};
	res.json(tmp);
});

// get all lists per user
app.get('/api/users/:id/lists', requireAuthentication, (req, res) => {
	if (req.authentication.user._id.toString() === req.params.id.toString()) {
		User.findOne({_id: req.params.id}, function (err, user) {
			if (err) res.json({success: false, error: err, code: 202});
			let lists = [];
			if (user.lists) {
				// first off, make an Array from the Users "list" Object
				lists = user.lists;
				console.log("Lists");
				// then use that Array to get all Lists in it
				List.find({_id: {$in: lists}}).exec()
					.then(function (gotLists) {
						console.info("Lists: " + gotLists);
						if (gotLists.length === 0) res.json({
							success: false,
							error: "No lists found, create one!",
							code: 203
						});
						else res.json({lists: gotLists, success: true});
					});
			}
			else res.json({success: false, error: 101});
		});
	} else res.json({success: false, msg: "You can only view your own Lists."});
});

// get all lists per user that contain :query
app.get('/api/users/:id/lists/:query', requireAuthentication, (req, res) => {
	if (req.authentication.user._id.toString() === req.params.id.toString()) {
		User.findOne({_id: req.authentication.user._id}, function (err, user) {
			if (err) res.json({success: false, error: err, code: 202});
			console.log(err);
			let lists = [];
			if (user.lists) {
				// first off, make an Array from the Users "list" Object
				lists = user.lists;
				console.log("Lists matching");
				// then use that Array to get all Lists in it
				List.find({_id: {$in: lists}}).exec()
					.then(function (gotLists) {
						let matching = [];
						gotLists.forEach(l => {
							if (l.name.toLowerCase().indexOf(req.params.query.toLowerCase()) !== -1) {
								matching.push(l);
							}
						});
						if (matching.length === 0) res.json({
							success: false,
							error: "No List found matching " + req.params.query,
							code: 208
						});
						else res.json({lists: matching, success: true});


					});
			}
			else res.json({success: false, error: 101});
		});
	} else res.json({success: false, msg: "You can only view your own Lists."});
});

// create user
app.post('/api/users', deprecate, (req, res) => {
	bCrypt.hash(req.body.password, 10, function (err, hash) {
		if (err) res.json({success: false, error: "Password Error", code: 101});
		User.find({email: req.body.email}, function (err, user) {
			if (user) res.json({success: false, error: "User already Exists!", code: 204});
		});
		User.create({
			name: req.body.name,
			email: req.body.email,
			password: hash,
			lists: req.body.lists
		}, function (err, user) {
			if (err) {
				res.json({success: false, error: 'User not created', code: 205});
			}
			res.json({success: true, data: user});
		});
	});

});

// remove a user
app.delete('/api/users/:id', requireAuthentication, (req, res) => {
	// send email to user with delete token //
	UserDeletionToken.create({userId: req.params.id}, function (err, token) {
		if (err) res.json({succes: false, error: 'User not removed', code: 206});
		token = token._id;
		User.findOne({_id: req.params.id}, function (err, user) {
			if (err) {
				res.json({success: false, error: 'User not removed', code: 206});
			}
			let URL = `http://${config.domain}/user/delete/${token}`;
			let mailData = {
				to: user.email,
				subject: "ListX Account Deletion",
				body: `Hey ${user.name}, \nYou (or someone else) just requested deletion for this ListX account. \n\nIf it was you and you are trying to delete your account, please follow this link in order to do so: \n\t${URL} \n\nIf you did not request account deletion, please immediately change your password, it might be known to someone else. \n\nListX Support`,
				send: true
			};
			mail(mailData);
			res.json({success: true});
		});
	});


});


app.get("/user/delete/:token", (req, res) => {
	const token = req.params.token;
	UserDeletionToken.findOne({_id: req.params.token}, function (err, token) {
		if (err) res.render("user-deleted", {error: "Deletion Token not found", code: 900});
		User.remove({_id: token.userId}, function (err, user) {
			if (err) res.render("user-deleted", {error: "User not found", code: 201});
			res.render("user-deleted");
		});
	});
});


// update a user adding new lists
app.post('/api/users/:id/newList', requireAuthentication, (req, res) => {
	User.findOne({_id: req.params.id}, function (err, user) {
		if (err) res.json({success: false, error: 'Lists not added to User', code: 207});
		else {
			User.update({_id: user._id}, {$push: {lists: req.body.lists}}, (err, update) => {
				!err && res.json({success: true, id: update._id});

			});
		}
	});
});


// update a user removing a list
app.post("/api/users/:id/removeList", requireAuthentication, (req, res) => {
	List.findOne({_id: req.body.list}, (err, list) => {
		if (req.authentication.user._id.toString() === list.admin.toString()) {
			User.findOneAndUpdate({_id: req.params.id}, {$pull: {lists: req.body.list.toString()}}, {"new": true}, (err, update) => {
				!!err && res.json({success: false, err: err});
				res.json({success: true, user: update._id});
			});
		}
	});
});

// add a list to multiple users
app.post("/api/users/addListBulk", (req, res) => {
	let {emails, list} = req.body;
	let a = [];
	if (emails) {
		emails.forEach(e => {
			createInvite(e, list, a, (err, list) => {
				err && res.json({success: false, err: err});
			});
		});
	}
	res.json({success: true, users: a});
});

/**
 * User Settings
 */

// email Change
app.post("/api/user/changeEmail", requireAuthentication, (req, res) => {
	const newEmail = req.body.newEmail;
	const userId = req.authentication.user._id;
	// send verification email to current email address
	User.findOne({_id: userId}, (err, user) => {
		EmailReset.create({userId: user._id}, (err, reset) => {
			let long = `http://${config.domain}/user/change-email/${reset._id}?newEmail=${newEmail}`;
			linkShortener(long, null, (URL) => {
				URL = "http://" + config.domain + "/s/" + URL.short;
				let resetLink = `http://${config.domain}/user/reset-password`;
				let mailData = {};
				mailData.to = user.email;
				mailData.subject = `ListX Email Change`;
				mailData.body = `Hey ${user.name}, \nTo change your ListX email address, follow the link below: \n${URL} (Voids in 45 minutes)\n\nIf you didn't request an email address change, please consider resetting your password (${resetLink}) \nListX Support`;
				mailData.send = true;
				mail(mailData);
			});
			res.json({success: true, set: !!newEmail});
		});
	})

});

app.get("/user/change-email/:id", (req, res) => {
	let newEmail = req.query.newEmail;
	let resetId = req.params.id;
	EmailReset.findOne({_id: resetId}, (err, er) => {
		let userId = er.userId;
		User.findOne({_id: userId}, (err, user) => {
			if (er.expiry >= Date.now()) {
				// not expired
				User.update({_id: user._id}, {$set: {email: newEmail}}, (err, update) => {
					if (!err) res.render("email-change-end", {success: true});
					else {
						res.render("email-change-end", {success: false});
						console.log(update, err)
					}
				})
			}
		});
	});
});

// name change

app.post("/api/user/changeName", requireAuthentication, (req, res) => {
	let newName = req.body.newName;
	let userId = req.authentication.user._id;
	// maybe check for how many name-changes the user had
	console.log("Changing " + userId + "'s name to " + newName);
	User.findOneAndUpdate({_id: userId}, {$set: {name: newName}}, (err, update) => {
		if (!err) res.json({success: true, user: update});
		else res.json({success: false})
	});
});

// username change

app.post("/api/user/changeUsername", requireAuthentication, (req, res) => {
	let newUsername = req.body.newUsername;
	let userId = req.authentication.user._id;
	//User.findById(userId, (err, user) => {
	// maybe check for how many name-changes the user had
	User.findOneAndUpdate({_id: userId}, {$set: {username: newUsername}}, (err, update) => {
		if (!err) res.json({success: true, user: update});
		else res.json({success: false, err: err});
	});
	//});
});


app.post("/api/user/changeAddress", requireAuthentication, (req, res) => {
	User.findOneAndUpdate({_id: req.authentication.user._id}, {
		$set: {
			address: req.body.address,
			zipCode: req.body.zipCode,
			country: req.body.country
		}
	}, (err, update) => {
		if (!err && update) {
			res.json({success: true, update: update});
		}
	});
});

// private information deletion
app.post("/api/user/deleteUser", requireAuthentication, (req, res) => {
	let userId = req.authentication.user._id;
	let password = req.body.password;
	let confirmation = req.body.confirmation;
	if (confirmation) {
		User.findById(userId, (err, user) => {
			if (err) res.json({success: false, reason: 3});
			bCrypt.compare(password, user.password, (err, eq) => {
				if (eq) { // password correct
					User.findByIdAndRemove(userId, (err, u) => {
						if (!err) res.json({success: true})
					});
				}
				else {
					res.json({success: false, reason: 2})
				}
			});

		});
	} else {
		res.json({success: false, reason: 1});
	}
	/*
	 reason number
	 conf   1
	 passw  2
	 user   3
	 */
});

// get all private information per mail
/**
 * private information includes the user, all lists, all items on those lists
 */
app.post("/api/user/emailInformation", requireAuthentication, (req, res) => {
	let userId = req.authentication.user._id;
	let information = {};
	User.findOne({_id: userId}, (err, user) => {
		if (err) res.json({success: false});
		information.user = user;
		delete information.user.lists;
		List.find({_id: {$in: user.lists}}).exec()
			.then(lists => {
				lists.forEach(list => {
					Item.find({list: list._id}, function (err, items) {
						list.itemsData = items;
					});
				});
				information.lists = lists;
				let filePath = path.join(__dirname, "data", "userInfo", user._id + "-information.json");
				fs.writeFile(filePath, JSON.stringify(information), (err) => {
					let mailData = {
						to: user.email,
						from: "userinformation",
						subject: "ListX Account Information",
						text: `Hey ${user.name}! \nThe requested information about your account can be found in the attachment. \nListX Support`,
						attachment: filePath,
						send: true
					};
					if (mailData.text === undefined) console.log("It's in the route");
					mail(mailData);
					fs.unlink(filePath, (err) => {
						if (!(err)) res.json({success: true});
						else res.json({success: false, error: err, msg: "Deleting the file didn't work."})
					});
				});
			}).catch(err => {
			res.json({success: false, error: err});
		})
	});
});


// delete all lists, items, and personal data
app.post("/api/user/deletePersonalInformation", requireAuthentication, (req, res) => {
	let userId = req.authentication.user._id;
	let password = req.body.password;
	let confirmation = req.body.confirmation;
	if (confirmation) {
		User.findById(userId, (err, user) => {
			if (err) res.json({success: false, reason: 3});
			bCrypt.compare(password, user.password, (err, eq) => {
				if (eq) { // password correct
					User.findByIdAndRemove(userId, (err, u) => {
						if (!err) res.json({success: true})
					});
				}
				else {
					res.json({success: false, reason: 2})
				}
			});

		});
	} else {
		res.json({success: false, reason: 1});
	}
	/*
	 reason number
	 conf   1
	 passw  2
	 user   3
	 */
});


// cancel premium subscriptons

// TODO: how to proccess subscriptions.


/**
 * Invitations API: Control Invitations
 * /api/invitations
 */


// get all invitations
app.get('/api/invitations', requireAuthentication, (req, res) => {
	if (req.app.get('env') === 'development') {
		Invitation.find(function (err, invitations) {
			if (err) {
				res.json({success: false, error: 'No Invitation found'});
			}
			res.json(invitations);
		});
	}
});

// get single invitation
app.get('/api/invitations/:id', requireAuthentication, (req, res) => {
	Invitation.find({_id: req.params.id}, function (err, invitation) {
		if (err) {
			res.json({success: false, error: 'Invitation not found'});
		}
		res.json(invitation);
	});
});

// create invitation from array
app.post('/api/invitations/array', requireAuthentication, (req, res) => {
	let inv = [] // invitation
		, l = req.body.list;
	if (req.authentication.user.lists.indexOf(req.body.list) >= 0) {
		if (req.body.invs) {
			if (Array.isArray(req.body.invs)) {
				req.body.invs.forEach(i => {
					createInvite(i, l, inv);
					console.log("INV: " + inv);
				});
			}
			else {
				if (req.body.email) {
					console.log("List in array", l);
					createInvite(req.body.email, l, inv);
				} else res.json({success: true});

			}
		}

		res.json({invs: inv, success: true});
	} else res.json({success: false, msg: "You may only create Invitations for Lists that you are a member of!"})
});

// create a single invitation
app.post("/api/invitations", requireAuthentication, (req, res) => {
	createInvite(req.body.email, req.body.list, [], function (err, list) {
		!!err && res.json({success: false, err: err});
		res.json({success: true, list: list});
	});
});

function userExists(id, mail) {
	if (id === null) byMail(mail);
	if (mail === null) byId(id);

	function byId(id) {
		User.find({_id: id}, function (err, user) {
			return !err;
		});
	}

	function byMail(mail) {
		User.find({email: mail}, function (err, user) {
			return !err;
		});
	}
}


function createInvite(email, list, arr, callback) {
	if (!userExists(null, email)) {
		Invitation.create({
			email: email,
			list: list
		}, function (err, invitation) {
			arr.push(invitation.email);
			User.findOne({email: email}, (err, user) => {
				let greeting, invite;
				if (user && user.email === email) {
					greeting = `Howdy ${user.name}!`;
					invite = `log in`;
				} else {
					greeting = `Howdy!`;
					invite = `sign up, join ListX`;
				}
				List.findOne({_id: list}, (err, l) => {
					User.findOne({_id: l.admin}, (err, admin) => {
						let msg = {
							to: email,
							subject: `ListX - New Invitation to List ${l.name}!`,
							body: `${greeting} \nThe ListX User ${admin.name} has invited you to join the List ${l.name}! \nPlease follow this link to ${invite} and accept the Invitation: \n \n http://${config.domain}/list/${l._id}/invitations/${invitation._id} \n \n The ListX.io Team`,
							send: true
						};

						console.log("Sending Invitation Email:");
						mail(msg);

						l.invitations.push(invitation._id);
						List.findOneAndUpdate({_id: list}, {$set: {invitations: l.invitations}}, (err, l2) => {
							if (typeof callback === "function") {
								if (err) callback(err, null);
								callback(null, l2);
							}
						});
					});


				});
			});

		});

	}
}

// Delete an invitation
app.delete('/api/invitations/:id', requireAuthentication, (req, res) => {
	Invitation.remove({_id: req.params.id}, function (err, invitation) {
		if (err) {
			res.json({success: false, error: 'Invitation not deleted'});
		}
		res.json({success: true, invitation: invitation});
	});
});

// Delete all invitations per list
app.delete('/api/invitations/list/:id', requireAuthentication, (req, res) => {
	let inv = [];
	// first grab the Invitations from the list of :id
	List.findOne({_id: req.params.id}, function (err, list) {
		if (err) {
			res.json({success: false, error: 'List not found'});
		}
		let user = req.authentication.user._id;
		if (list.admin !== undefined && list.admin.toString() === user.toString()) {
			// bind the invitations
			Invitation.find({list: list._id}, (err, invites) => {
				invites.forEach(e => {
					// remove the invitation bound to e
					console.log("Removing invitation for ", e.email);
					Invitation.remove({_id: e._id}, function (err, invite) {
						if (err) {
							res.json({success: false, error: 'Invitation not deleted'});
						}
						inv.push(invite._id);
					});
				});
				res.json({success: true, inv: inv});
			});
		} else {
			res.json({success: false, error: "User not admin of list, this is confusing"});
		}

	});

});

// Delete invitation for user from list /list/ admin, user
app.post("/api/invitations/user/list/:list", requireAuthentication, (req, res) => {
	List.findOne({_id: req.params.list}, (err, list) => {
		if (list.admin.toString() === req.authentication.user._id.toString()) {
			Invitation.findOneAndRemove({email: req.body.user, list: list._id}, (err, removed) => {
				!!err && res.json({success: false, err: err});
				res.json({success: true, user: removed._id});
			});
		}
	});
});

/**
 * MailGun API
 */

function mail(data) {
	if (data.send === true) {
		let to = data.to;
		let sub = data.subject;
		let body = data.body || data.text;
		let html = data.html;
		let from = data.from || "noreply";

		let msg = {
			from: "ListX <" + from + "@" + config.domain + ">",
			to: to,
			subject: sub,
			text: body
		};

		msg.html = html || undefined;
		msg.attachment = data.attachment || undefined;


		mailgun.messages().send(msg, error => {
			if (error) console.error(error);
			console.log(`Mail sent to ${data.to} at ${new Date().toLocaleDateString()}`, msg)
		});
	}
}


/**
 * Global Middleware
 */

// authentication
app.use(function (req, res, next) {
	verifyJWT(req.cookies.token, (err, userId) => {
		if (userId) {
			User.findOne({_id: userId}, function (err, user) {
				err && console.log(err);
				next();
			});
		} else {
			next();
		}
	});
});

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
		User.findOne({_id: userId}, (err, user) => {
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
		User.findOne({_id: userId}, (err, user) => {
			if (user) {
				req.authentication = {
					user: user,
					token: tk
				};
				next();
			} else {
				res.end(JSON.stringify({success: false, msg: "Failed to authenticate with Token."}));
				console.log("API Access without Authentication. Token: ", tk)
			}
		});
	});
}

function slugMaker() {
	// get all shortlinks
	return new Promise((resolve, reject) => {
		ShortDomain.find({}, (err, sls) => {
			if (err) throw err;
			sls = sls.map(sl => sl.short); // sls is now an array of all shortlinks
			let slug = makeSlug();
			let rep = true;
			while (rep) {
				if (sls.indexOf(slug) > -1)
					slug = makeSlug();
				else
					resolve(slug);
				rep = false;
			}
		});
	});

}

function linkShortener(long, short, callback) {
	let returnData = {};
	if (!short) slugMaker().then(short => {
		console.log(short);
		ShortDomain.findOne({long: long}, (err, url) => {
			if (url) {
				// url already in database, return shortlink
				returnData = url;
				console.log(returnData);
				callback(returnData);
			}
			ShortDomain.create({
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

function deprecate(req, res, next) {
	res.json({"sucess": false, msg: "This Route/Function is deprecated, please refrain from using it."});
}

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

function makeSlug() {
	let text = [];
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
	for (let i = 0; i < config.slugLength; i++)
		text.push(possible.charAt(Math.floor(Math.random() * possible.length)));
	return text.join("");
}

// catch 404 and forward to error handler
app.use(function (req, res) {
	console.log(req.app.get('env'));
	let err = new Error('Not Found');
	err.status = 404;
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	let user = false;
	if (req.authentication) user = req.authentication.user || false;

	// render the error page
	res.render('error', {
		msg: err.message,
		url: req.get('Referrer') !== undefined ? req.get('Referrer') : "/",
		user: user
	});
});


module.exports = app;
