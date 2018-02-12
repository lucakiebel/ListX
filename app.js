const express = require('express')                        // Express as a Webserver
    , path = require('path')                              // path used for local file access
    , favicon = require('serve-favicon')                  // Serve favicons for every request
    , logger = require('morgan')                          // Morgan to log requests to the console
    , cookieParser = require('cookie-parser')             // Cookie parser to, well, parse cookies
    , bodyParser = require('body-parser')                 // Again, the name stands for the concept, parse HTTP POST bodies
    , mongoose = require('bluebird').promisifyAll(require('mongoose'))                     // Mongoose is used to connect to the mongoDB server
    , methodOverride = require('method-override')         // Method Override to use delete method for elemets
    , i18n = require('i18n')                              // i18n for translations (German/English)
    , session = require('client-sessions')                // Client-Sessions to be able to access the session variables
    , bCrypt = require('bcryptjs')                   // bCrypt for secure Password hashing (on the server side)
    , app = express()
    , mg = require('mailgun-js')
    , request = require("request")
    , fs = require("fs")
    , config = require(path.join(__dirname, "config.json"));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride());
app.use(session({
    cookieName: 'session',
    secret: config.cookieSecret, // random cookie secret
    duration: 15 * 86400000, // 15 days
    activeDuration: 30 * 60000, // 30 minutes
    httpOnly: true // prevent session from being intercepted
}));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

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

console.info(i18n.__("/ListX/UI/Welcome"));
console.info("ListX Started on http://"+config.domain);

// database setup
mongoose.Promise = Promise;
mongoose.connect('mongodb://'+config.mongo.address);	// sudo mongod --dbpath=/var/data --port=27070 --fork --logpath=./log.txt


const Item = mongoose.model('Item', {
    list: mongoose.Schema.Types.ObjectId,
    name: String,
    amount: String,
    count: Number,
    art: String,
    date: {type: String, default: () => {
        return (new Date(Date.now())).toString();
    }},
    remember: Boolean,
    bought: {type: Boolean, default:false}
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
    expiry: {type: String, default: () => {
        return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
    }} // 45 Minutes
});

const PasswordReset = mongoose.model("PasswordReset", {
    userId: mongoose.Schema.Types.ObjectId,
    expiry: {type: String, default: () => {
        return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
    }} // 45 Minutes
});

const UserDeletionToken = mongoose.model("UserDeletionToken", {
   userId: mongoose.Schema.Types.ObjectId
});

const EmailReset = mongoose.model("EmailReset", {
    userId: mongoose.Schema.Types.ObjectId,
    expiry: {type: String, default: () => {
        return (new Date(Date.now() + 45 * 60 * 1000)).getTime().toString();
    }} // 45 Minutes
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


const DemoList = mongoose.model('DemoList', {
    name: String,
    language: String,
    expiry: {type: String, default: () => {
        return (new Date(Date.now() + 12 * 60 * 60 * 1000)).getTime().toString();
    }} // 45 Minutes
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
    console.log("Req.body", req.body);
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
                            console.log("SignUp::---");
                            console.log(user, req.body);
                            if (err) res.json({success: false});
                            let URL = "http://" + config.domain + "/validate/" + valid._id;
                            linkShortener(URL, null, short => {
                                console.log(short, URL);
                                short = "http://" + config.domain + "/s/"+short.short;
                                let mailData = {};
                                mailData.to = user.email;
                                mailData.subject = "ListX Account Activation";
                                mailData.body = `ListX Account Activation \nHey ${req.body.name}, thanks for signing up with ListX! \nPlease verify your email address by clicking the following link: \n${short} (Voids in 45 minutes)\nSee you on the other side!`;
                                mailData.send = true;
                                mail(mailData);
                                res.json({success: true, user: user, validation: valid});
                            });

                        });
                    });
                });
            });
        } else {
            res.json({success:false, error:err});
        }
    });

});

// signup page for users
app.get('/signup', function (req, res) {
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
        console.log("req.params.id: ", req.params.id);
        console.log("valid: ", valid);
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
        res.render("reset-password-email-form", {expired:true});
    }
    res.render("reset-password-email-form", {expired:false});
});

/**
 * Get Email from body, send mail to email,
 *      if mail is user: send password reset link
 *      else: send bruteforce reminder
 */
app.post("/api/reset", (req, res) => {
    const email = req.body.email;
    console.log("Req.body", req.body);
    validateReCAPTCHA(req.body.recRes, (err, success) => {
        if (err === null) {
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
                            URL = "http://" + config.domain + "/s/"+URL.short;
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
            res.json({success:false, error:err})
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

app.post("/api/passwordreset", (req,res) => {
    let {pwrId, userId, password} = req.body;
    bCrypt.hash(password, 10, function (err, hashedpassword) {
        PasswordReset.findOneAndRemove({_id: pwrId}, (err, pwr) => {
            if (err) res.json({success: false, code: 101});
        });
        User.findOneAndUpdate({_id: userId}, {$set: {password: hashedpassword}}, (err, user) => {
            if (err) res.json({success: false, error: 201});
            console.log("Passwordreset for: ", user.email);
            res.json({success: true});
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
            bCrypt.compare(req.body.password, user.password, function(err, bc) {
                if (bc) {
                    // sets a cookie with the user's info
                    req.session.user = user;
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
    if (req.session.user) {
        res.redirect("/dashboard");
    }
    res.render("login");
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect("/");
});


/**
 * Nav Element Routes
 */


// Demo Page
app.get("/demo", (req, res) => {
    res.render("demo");
});

// Demo List
app.get("/demo/:id", (req, res) => {
    DemoList.findOne({_id: req.params.id}, (err, list) => {
        // if list has not yet expired
        if (list.expiry.getTime() > new Date().getTime()) {
            // display list
            res.render('list', {
                list: list, user: {name: "anonymous"}
            });
        }
        else {
            // if list has expired, redirect to signup
            res.redirect("/signup?demo");
        }
    });
});

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
    res.render("imprint", {user:req.session.user});
});

app.get("/legal/privacy", (req, res) => {
    res.render("privacy", {user:req.session.user});
});

app.get("/legal/terms", (req, res) => {
    res.render("terms", {user:req.session.user});
});

app.get("/legal/passwords", (req, res) => {
    let lang = req.cookies.preferredLang;
    let url = "http://blog.luca-kiebel.de/listx-passwords-";
    url += lang || "en";
    res.redirect(url);
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
        let user = req.session.user;
        if (err) {
            res.render('index', {error: 'List not found!'});
        }
        if (user.lists.indexOf(list._id)) {
            res.render('list', {
                list: list, user: user
            });
        }
        else {
            console.log("User " + user.name + " is not member of List " + list.name);
            res.render('index', {error: 'User not part of List!'});
        }
    });
});

// List Settings. If $user is list.admin render admin settings
app.get('/list/:id/settings', requireLogin, function (req, res) {
    List.findOne({_id: req.params.id}, function (err, list) {
        let user = req.session.user;
        if (err) {
            res.render('index', {error: 'List not found!'});
        }
        if (user.lists.indexOf(list._id)) {
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


// Users Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
    console.log(req.session.user.lists);
    res.render('dashboard', {user: req.session.user});
});


// User Profile
app.get('/user', requireLogin, (req, res) => {
    res.render('settings-user', {user: req.session.user});
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

                                res.render("login", {email: user.email, list:list});
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
            else res.render('index', {error: 'Invitation not associated with List!', translate: res});
        });
    });
});

// page for family members to invite new ppl
app.get('/list/:id/invite', requireLogin, (req, res) => {
    List.findOne({_id: req.params.id}, function (err, list) {
        if (err) {
            res.render('index', {error: 'List not found!', translate: res});
        }
        res.render('invite', {list: list._id, translate: res})
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
    if (req.session.user) res.render('index', {user: req.session.user});
    else res.render('index', {user: false});
});


/**
 * API Controller
 */

/**
 * Lists API: Control Lists
 * /api/lists
 */

// get all lists
app.get('/api/lists', (req, res) => {
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
app.get('/api/lists/:id', (req, res) => {
    List.findOne({_id: req.params.id}, function (err, list) {

        // if there is an error retrieving, send the error, nothing after res.send(err) will execute
        if (err) {
            res.json({success: false, error: 'List not found', code: 401})
        }


        res.json(list); // return the List in JSON format
        console.log(list);
    });
});

// get item-count of a list
app.get('/api/lists/:id/itemCount', (req, res) => {
    List.findOne({_id: req.params.id}, function (err, list) {
        if (err) {
            res.json({success: false, error: 'List not found', code: 401})
        }
        Item.find({list: list._id}, function (err, items) {
            if (err) {
                res.json({success: false, error: 'Items not found', code: 300})
            }
            res.json(items.length);
        });
    });
});

// get all invitaions for a list
app.get('/api/lists/:id/invitations', (req, res) => {
    Invitation.find({list: req.params.id}, function (err, invitations) {
        if (err) {
            res.json({success: false, error: 'No Invitations found for this List', code: 402});
        }
        res.json(invitations);
    });
});

// create list
app.post('/api/lists', (req, res) => {
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
app.post("/api/lists/:id/removeMeFromList", (req, res) => {
    let user = req.session.user._id || req.body.user;
    User.findOneAndUpdate({_id: user}, {$pull: {lists: req.params.id}}, (err, user) => {
        !!err && res.json({success:false, err:err});
        res.json({success:true});
    })
});

// remove a list
app.delete('/api/lists/:id/admin', (req, res) => {
    let user = req.query.user === req.session.user._id.toString() ? req.query.user : "";
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
app.delete("/api/lists/:id/removeAllUsers", (req, res) => {
    let user = req.query.user === req.session.user._id.toString() ? req.query.user : "";
    List.findOne({_id:req.params.id}, (err, list) => {
        console.log("err",err);
        !!err && (res.json({success:false, err:err}));
        if (list.admin.toString() === user.toString()) {
            User.find({lists: list._id.toString()}, (err, users) => {
                console.log("users: ", users);
                users.forEach(user => {
                    if (list.admin.toString() === user._id.toString()) {
                        // keep user
                        console.log("keeping ", user.email);
                    } else {
                        User.update({_id: user._id}, {$pull: {lists:list._id}}, (err, update) => {
                            !!err && res.json({success:false, err:err});
                            console.log("deleting ", user.email, update.lists)
                        });
                    }
                });
                res.json({success:true});
            });
        }
    });
});

app.delete('/api/lists/:id', (req, res) => {
    let user = req.query.user === req.session.user._id.toString() ? req.query.user : "";
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

app.post("/api/lists/update/name", (req, res) => {
    const {list, newName, admin} = req.body;
    let user = admin === req.session.user._id.toString() ? admin : "";
    List.findOne({_id: list}).then(l => {
        if (l.admin.toString() === user) {
            List.update({_id: list}, {$set: {name:newName}}, (err, l2) => {
               !!err && res.json({success:false, err:err});
               res.json({success:true}); // reload page in js
            });
        }
    });
});

app.post("/api/lists/update/country", (req, res) => {
    const {list, newCountry, admin} = req.body;
    List.findOne({_id:list}).then(l => {
        if (l.admin.toString() === admin) {
            List.update({_id:list}, {$set: {country:newCountry}}, (err, l2) => {
                !!err && res.json({success:false, err:err});
                res.json({success:true}); // reload page in js
            });
        }
    });
});

app.get("/api/lists/:id/userEmails", (req, res) => {
    User.find({lists: req.params.id}, (err, users) => {
        !!err && res.json({success:false, err:err});
        res.json({success:true, users:users.map(u=>{ return {_id:u._id, email:u.email}})});
    });
});

app.get("/api/lists/:id/invitationsForSettings", (req, res) => {
    Invitation.find({list:req.params.id}, (err, invs) => {
        !!err && res.json({success:false, err:err});
        res.json({success:true, invitations:invs.map(i=>{return {_id:i._id, email:i.email}})});
    })
});

// update a list
/**
 * @deprecated since v0.10.0
 */
app.post('/api/lists/:id', (req, res) => {
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
app.get('/api/items/:id', (req, res) => {
    // use mongoose to get all items in the database
    Item.find({list: req.params.id}, function (err, items) {

        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err) {
            res.json({success: false, error: 'Items not found', code: 300});
        }


        res.json({success: true, items: items}); // return all items in JSON format
        console.log(items);
    });
});

// create item
app.post('/api/items', (req, res) => {
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
});

// remove an item
app.delete('/api/items/:id', (req, res) => {
    Item.remove({_id: req.params.id}, function (err, item) {
        if (err) {
            res.json({success: false, error: 'Item not removed', code: 302});
        }
        res.json(item);
    });
});

// update an item
app.post('/api/items/:id', (req, res) => {
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
app.get('/api/users', (req, res) => {
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
app.get('/api/users/:id', (req, res) => {
    User.findOne({_id: req.params.id}, function (err, user) {

        // if there is an error retrieving, send the error. nothing after res.send(err) will execute
        if (err) {
            res.json({success: false, error: 'User not found', code: 201});
        }

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

        console.log(tmp);

        res.json(tmp); // return the user in JSON format
    });
});

// get single user per mail
app.get('/api/users/byMail/:mail', (req, res) => {
    User.findOne({email: req.params.mail}, function (err, user) {
        if (err) {
            res.json({success: false, error: 'User not found', code: 201});
        }

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

        console.log(tmp);

        res.json(tmp);
    });

});

// get all lists per user
app.get('/api/users/:id/lists', (req, res) => {
    User.findOne({_id: req.params.id}, function (err, user) {
        if (err) res.json({success: false, error: err, code: 202});
        console.log(err);

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
});

// get all lists per user that contain :query
app.get('/api/users/:id/lists/:query', (req, res) => {
    User.findOne({_id: req.params.id}, function (err, user) {
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
});

// create user
app.post('/api/users', (req, res) => {
    bCrypt.hash(req.body.password, 10, function(err, hash) {
        if (err) res.json({success:false, error: "Password Error", code:101});
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
app.delete('/api/users/:id', (req, res) => {
    // send email to user with delete token //
    UserDeletionToken.create({userId: req.params.id}, function (err, token) {
        if (err) res.json({succes:false, error:'User not removed', code: 206});
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
            if (err) res.render("user-deleted", {error: "User not found", code:201});
            res.render("user-deleted");
        });
    });
});


// update a user adding new lists
app.post('/api/users/:id/newList', (req, res) => {
    User.findOneAndUpdate({_id: req.params.id}, {$push: {"lists": {$each: req.body.lists}}}, function (err, user) {
        if (err) res.json({success: false, error: 'Lists not added to User', code: 207});
        else res.json({success: true, id: user._id});
    });
});



// update a user removing a list
app.post("/api/users/:id/removeList", (req, res) => {
    List.findOne({_id: req.body.list}, (err, list) => {
        if (req.body.removingUser.toString() === list.admin.toString()) {
            User.findOneAndUpdate({_id: req.params.id}, {$pull: {lists: req.body.list}}, (err, update) => {
                !!err && res.json({success:false, err:err});
                res.json({success:true, user:update._id});
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
            User.findOneAndUpdate({email: e}, {$push: {"lists": list}}, (err, user) => {
                if (err) res.json({success: false, error: 'Lists not added to User', code: 207});
                else a.push(e);
            });
        });
    }
    res.json({success: true, users: a});
});

/**
 * User Settings
 */

// email Change
app.post("/api/user/changeEmail", (req, res) => {
    const newEmail = req.body.newEmail;
    const userId = req.body.userId;
    // send verification email to current email address
    User.findById(userId, (err, user) => {
        EmailReset.create({userId:user._id}, (err, reset) => {
            let long = `http://${config.domain}/user/change-email/${reset._id}?newEmail=${newEmail}`;
            linkShortener(long, null, (URL) => {
                URL = "http://" + config.domain + "/s/"+URL.short;
                let resetLink = `http://${config.domain}/user/reset-password`;
                let mailData = {};
                mailData.to = user.email;
                mailData.subject = `ListX Email Change`;
                mailData.body = `Hey ${user.name}, \nTo change your ListX email address, follow the link below: \n${URL} (Voids in 45 minutes)\n\nIf you didn't request an email address change, please consider resetting your password (${resetLink}) \nListX Support`;
                mailData.send = true;
                mail(mailData);
            });
            res.json({success:true, set:!!newEmail});
        });
    })

});

app.get("/user/change-email/:id", (req, res) => {
    let newEmail = req.query.newEmail;
    let resetId = req.body.id;
    EmailReset.findById(resetId, (err, er) => {
        let userId = er.userId;
        User.findById(userId, (err, user) => {
           if (er.expiry.getTime() >= new Date(Date.now()).getTime()) {
               // not expired
               User.findOneAndUpdate(user, {$set: {email:newEmail}}, (err, update) => {
                   if (!err) res.render("email-change-end", {success:true});
                   else res.render("email-change-end", {success:false});
               })
           }
        });
    });
});

// name change

app.post("/api/user/changeName", (req, res) => {
    let newName = req.body.newName;
    let userId = req.body.userId;
    // maybe check for how many name-changes the user had
    console.log("Changing " + userId + "'s name to " + newName);
    User.findOneAndUpdate({_id:userId}, {$set: {name:newName}}, (err, update) => {
        if (!err) res.json({success:true, user:update});
        else res.json({success:false})
    });
});

// username change

app.post("/api/user/changeUsername", (req, res) => {
    let newUsername = req.body.newUsername;
    let userId = req.body.userId;
    //User.findById(userId, (err, user) => {
        // maybe check for how many name-changes the user had
        User.findOneAndUpdate({_id: userId}, {$set: {username:newUsername}}, (err, update) => {
            if (!err) res.json({success:true, user:update});
            else res.json({success:false, err:err});
        });
    //});
});


app.post("/api/user/changeAddress", (req, res) => {
    let addr = {
        a: req.body.address,
        z: req.body.zipCode,
        c: req.body.country
    };
    User.findOneAndUpdate({_id: req.body.userId}, {$set: {address:addr.a, zipCode: addr.z, country: addr.c}}, (err, update) => {
        if (!err && update) {
            res.json({success:true, update:addr});
        }
    });
});

// private information deletion

app.post("/api/user/deleteUser", (req, res) => {
    let userId = req.body.userId;
    let password = req.body.password;
    let confirmation = req.body.confirmation;
    if (confirmation) {
        User.findById(userId, (err, user) => {
            if(err) res.json({success:false, reason:3});
            bCrypt.compare(password, user.password, (err, eq) => {
                if (eq) { // password correct
                    User.findByIdAndRemove(userId, (err, u) => {
                        if (!err) res.json({success:true})
                    });
                }
                else {
                    res.json({success:false, reason:2})
                }
            });

        });
    } else {
        res.json({success:false, reason:1});
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
app.post("/api/user/emailInformation", (req, res) => {
    let userId = req.body.userId;
    let information = {};
    User.findById(userId, (err, user) => {
        if (err) res.json({success:false});
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
                let fp = path.join(__dirname, "data", "userInfo", user._id + "-information.json");
                fs.writeFile(fp, information, (err) => {
                    let mailData = {
                        to: user.email,
                        from: "userinformation",
                        text: "Hey "+user.name+"! \nThe requested information can be found in the attachment below. \nListX Support",
                        attachment:fp,
                        send:true
                    };
                    mail(mailData);
                    res.json({success:true});
                });
            }).catch(err => {
            res.json({success:false, error:err});
        })
    });
});



// delete all lists, items, and personal data
app.post("/api/user/deletePersonalInformation", (req, res) => {
    let userId = req.body.userId;
    let password = req.body.password;
    let confirmation = req.body.confirmation;
    if (confirmation) {
        User.findById(userId, (err, user) => {
            if(err) res.json({success:false, reason:3});
            bCrypt.compare(password, user.password, (err, eq) => {
                if (eq) { // password correct
                    User.findByIdAndRemove(userId, (err, u) => {
                        if (!err) res.json({success:true})
                    });
                }
                else {
                    res.json({success:false, reason:2})
                }
            });

        });
    } else {
        res.json({success:false, reason:1});
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
app.get('/api/invitations', (req, res) => {
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
app.get('/api/invitations/:id', (req, res) => {
    Invitation.find({_id: req.params.id}, function (err, invitation) {
        if (err) {
            res.json({success: false, error: 'Invitation not found'});
        }
        res.json(invitation);
    });
});

// create invitation from array
app.post('/api/invitations/array', (req, res) => {
    let inv = [] // invitation
        , l = req.body.list;
    if (req.body.invs) {
        if (Array.isArray(req.body.invs) && undefined !== req.body.invs) {
            req.body.invs.forEach(i => {
                createInvite(i, l, inv);
                console.log("INV: " + inv);
            });
        }
        else {
            createInvite(req.body.email, l, inv);
        }
    }

    res.json({invs: inv, success: true});

});

// create a single invitation
app.post("/api/invitations", (req, res) => {
    createInvite(req.body.email, req.body.list, [], function (err, list) {
        !!err && res.json({success:false, err:err});
        res.json({success:true, list:list});
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
            List.findById(list, (err, l) => {
                User.findById(l.admin, (err, admin) => {
                    let msg = {
                        to: email,
                        subject: `ListX - New Invitation to List ${l.name}!`,
                        body: `Howdy! \nThe ListX User ${admin.name} has invited you to join the List ${l.name}! \nPlease follow this link to join ListX and accept the Invitation: \n \n http://${config.domain}/list/${l._id}/invitations/${invitation._id} \n \n The ListX.io Team`,
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

    }
}

// Delete an invitation
app.delete('/api/invitations/:id', (req, res) => {
    Invitation.remove({_id: req.params.id}, function (err, invitation) {
        if (err) {
            res.json({success: false, error: 'Invitation not deleted'});
        }
        res.json({success: true, invitation: invitation});
    });
});

// Delete all invitations per list
app.delete('/api/invitations/list/:id', (req, res) => {
    let inv = [];
    // first grab the Invitations from the list of :id
    List.findOne({_id: req.params.id}, function (err, list) {
        if (err) {
            res.json({success: false, error: 'List not found'});
        }
        let user = req.query.user === req.session.user._id.toString() ? req.query.user : "";
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
                res.json({success:true, inv: inv});
            });
        } else {
            res.json({success:false, error: "User not admin of list, this is confusing"});
        }

    });

});

// Delete invitation for user from list /list/ admin, user
app.post("/api/invitations/user/list/:list", (req, res) => {
    List.findOne({_id: req.params.list}, (err, list) => {
        if (list.admin.toString() === req.body.admin.toString()) {
            Invitation.findOneAndRemove({email:req.body.user, list:list._id}, (err, removed) => {
                !!err && res.json({success:false, err:err});
                res.json({success:true, user:removed._id});
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
        let body = data.body;
        let html = data.html;
        let from = data.from || "noreply";

        let msg = {
            from: "ListX <"+from+"@listx.io>",
            to: to,
            subject: sub,
            text: body
        };

        msg.html = html || undefined;
        msg.attachment = data.attachment || undefined;


        mailgun.messages().send(msg, (error) => {
            if (error) console.error(error);
            console.log(`Mail sent to ${data.to} at ${new Date().getTime()}`, msg)
        });
    }
}


/**
 * Global Middleware
 */

// authentication
app.use(function (req, res, next) {
    if (req.session && req.session.user) {
        User.findOne({email: req.session.user.email}, function (err, user) {
            if (user) {
                req.user = user;
                delete req.user.password; // delete the password from the session
                req.session.user = user;  //refresh the session value
                res.locals.user = user;   // refresh locals value
            }
            // finishing processing the middleware and run the route
            next();
        });
    } else {
        res.redirect("/login");
        next();
    }
});


/**
 * requireLogin for User Specific areas
 * @param req Request send by $User to the server
 * @param res Response to be send by the server
 * @param next The next handler
 */
function requireLogin(req, res, next) {
    if (!req.session.user) {
        // redirect to login page
        res.redirect('/login');
    } else {
        next();
    }
}


function slugMaker() {
    // get all shortlinks
    return new Promise((resolve, reject) => {
        ShortDomain.find({}, (err, sls) => {
            if (err) throw err;
            sls = sls.map(sl => sl.short); // sls is now an array of all shortlinks
            let slug = makeSlug();
            let rep = true;
            while(rep) {
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

function recursiveSlugMaker(short) {
    if (!short) short = makeSlug();
    ShortDomain.findOne({short:short}).exec().then((sl) => {
        if (!sl) {
            // not found
            return short;
        }
        recursiveSlugMaker();
    });
}

function validateReCAPTCHA(gResponse, callback) {
    const secretKey = config.reCaptcha.privateKey;
    console.log(gResponse);
    request.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${gResponse}`,
        function (error, response, body) {
            console.log(body);
            callback(null, true);
        }
    );
}

function makeSlug() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";

    for (let i = 0; i < 5; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

// catch 404 and forward to error handler
app.use(function (req, res) {
    console.log(req.app.get('env'));
    let err = new Error('Not Found');
    err.status = 404;
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.render('error', {msg:err.message, url:req.get('Referrer') !== undefined ? req.get('Referrer') : "/"});
});


module.exports = app;
