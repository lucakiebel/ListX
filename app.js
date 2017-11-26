const   express = require('express')                        // Express as a Webserver
    , path = require('path')                              // path used for local file access
    , favicon = require('serve-favicon')                  // Serve favicons for every request
    , logger = require('morgan')                          // Morgan to log requests to the console
    , cookieParser = require('cookie-parser')             // Cookie parser to, well, parse cookies
    , bodyParser = require('body-parser')                 // Again, the name stands for the concept, parse HTTP POST bodies
    , mongoose = require('bluebird').promisifyAll(require('mongoose'))                     // Mongoose is used to connect to the mongoDB server
    , methodOverride = require('method-override')         // Method Override to use delete method for elemets
    , i18n = require('i18n')                              // i18n for translations (German/English)
    , session = require('client-sessions')                // Client-Sessions to be able to access the session variables
	, async = require('async')
    , bCrypt = require('bcrypt-nodejs')                   // bCrypt for secure Password hashing (on the server side)
    , app = express()
	, mg = require('mailgun-js');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.use(logger('short'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride());
app.use(session({
  cookieName: 'session',
  secret: 'a1yON9OMzD@SRIQ964eEqau#LS1qz@cP8XlXzMt&', // random cookie secret
  duration: 15 * 86400000, // 15 days
  activeDuration: 30 * 60000, // 30 minutes
  httpOnly: true // prevent session from being intercepted
}));

const mailgun = mg({apiKey: 'key-7a2e1c0248d4728c528b5f8859ad2f46', domain: 'mail.listx.io'});

i18n.configure({

//define what languages we support in our application
  locales:['en', 'de'],

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
  cookie: { maxAge: 900000, httpOnly: true }
}));

app.use(i18n.init);

console.info(i18n.__("/ListX/UI/Welcome"));
console.info("ListX Started on http://localhost:2850");

mail({to:"listx-dev@luca-kiebel.de", subject:"New ListX instance spawned", body:`Hey, friend! \nA new Instance of ListX has just been spawned at ${new Date().getTime()}! \nListX Team`, send:true});

// database setup
mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost:27070/listx');	// sudo mongod --dbpath=/var/data --port=27070 --fork --logpath=./log.txt

const Item = mongoose.model('Item', {
  list:mongoose.Schema.Types.ObjectId,
  name:String,
  amount:String,
  count:Number,
  art:String,
  date:{type:Date, default:Date.now()}
});

const User = mongoose.model('User', {
  name:String,
  email:String,
  password:String,
  lists:[], // 1 User => 0+ Lists
  premium:{type:Boolean, default:false},
  alphaTester:{type:Boolean, default:false},
  betaTester:{type:Boolean, default:false},
  validated:{type:Boolean, default:false},
  additionalFields:[]
});

const EmailValidation = mongoose.model("EmailValidation", {
    email:String,
    userId:mongoose.Schema.Types.ObjectId,
    expiry:{type:Date, default:Date.now()+45*60*1000} // 45 Minutes
});

const List = mongoose.model('List', {
  name:String,
  country:String,
  language:String,
  admin:mongoose.Schema.Types.ObjectId,
  invitations:[] // 1 List => 0+ Open Invitations
});

const Invitation = mongoose.model('Invitation', {
  name:String,
  email:String,
  list:mongoose.Schema.Types.ObjectId
});


const DemoList = mongoose.model('DemoList', {
  name:String,
  language:String,
  expiry:{type:Date, default:Date.now()+12*60*60*1000} // 12 hours
});

const ShortDomain = mongoose.model('ShortDomain', {
  short:String,
  long:String,
  hits:{type:Number, default:0}
});

app.get("/api/short/:short", (req,res) => {
   const {short} = req.params;
   const long = req.query.long;
   // check whether there already is a short for the long
   ShortDomain.findOne({long: long}, (err, url) => {
      if (url) {
          // url already in database, return shortlink
          res.json({long: url.long, short: url.short});
      }
      else {
          // url not in database
          ShortDomain.create({
              long: long,
              short: short
          }, err => {
              if (err) res.json({success: false, error:err});
              res.json({long: long, short: short});
          });
      }
   });
});

app.get("/api/short/:short/metrics", (req,res) => {
    ShortDomain.findOne({short: req.params.short}, (err, url) => {
       if(!err && url) res.json(url);
    });
});

app.get("/s/:short", (req, res) => {
    // increment the hits-counter by one and redirect to LONG
    ShortDomain.findOneAndUpdate({short: req.params.short}, {$inc : {hits: 1}}, (err, url) => {
       if(err) res.redirect("/");
       res.redirect(url.long);
    });
});


/**
 * UI CONTROLLER
 */

app.post('/signup', (req, res) => {
  let hash = bCrypt.hashSync(req.body.password);
  User.create({
    name: req.body.name,
    email: req.body.email,
    password: hash
  }, function(err, user) {
    if(err){res.json({ success: false});}
    EmailValidation.create({email:user.email, userId:user._id}, (err, valid) => {
        if (err) res.json({success:false});
        let URL = "https://listx.io/validate/" + valid._id;
        let mailData = {};
        mailData.to = user.email;
        mailData.subject = "ListX Account Activation";
        mailData.body = `ListX Account Activation \nHey ${user.name}, thanks for signing up with ListX! \nPlease verify your Email-address by clicking the following link: \n\t${URL} \nSee you on the other side!`;
        mailData.send = true;
        mail(mailData);
        res.json({success: true, user:user, validation: valid});
    });
  });
});

// signup page for users
app.get('/signup', function(req, res) {
  res.render('signup');
});

/**
 * EMail Validation: Get Validation ID, find Email, see if not expired, set user.validation = true, delete EmailValidation, send success mail, redirect to dashboard
 */
app.get("/validate/:id", function (req, res) {
    EmailValidation.find({_id: req.params.id}, (err, valid) => {
        if (err) res.json({success:false});
        if (valid.expiry >= new Date.now()) {
            // Validation not expired
            User.findOneAndUpdate({_id: valid.userId}, {$set:{validated: true}}, (err, u) => {
                // if there was an error, redirect to /signup and pass error 201 (user not found)
                if(err) res.redirect("/signup?e=201");
                // else redirect to login
                res.redirect("/login");
            });
        }
        else {
            // if validation expired, delete account and send to signup with error 601 (validation expired)
            res.redirect("/signup?e=601")
        }
    })
});

app.post('/login', function(req, res) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) {
      console.error("No User with Email \"" + req.body.email + "\" found.");
      res.json({correct:false});
    }
    else if(!user.validated) {
        console.error("User not yet validated");
        res.json({success:false, error:"User not validated", code:602});
    }
    else {
      if (bCrypt.compareSync(req.body.password, user.password)) {
        // sets a cookie with the user's info
        req.session.user = user;
        console.info("User "+ user.email + " successfully logged in!");
        res.json({correct:true, username:user.name});
      } else {
        console.error("Wrong Password for " + user.name);
        res.json({correct:false});
      }
    }
  });
});


app.get('/login', (req, res) => {
  if(req.session.user){
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
                list:list, user:{name: "anonymous"}
            });
        }
        else {
            // if list has expired, redirect to signup
            res.redirect("/signup");
        }
    });
});

// Developer Page
app.get("/dev", (req, res) => {
  res.render("index-dev");
});

/**
 * Stuff which needs authentication
 */
// List index per List if $user is part of it
app.get('/list/:id', requireLogin, (req, res) => {
  List.findOne({_id : req.params.id}, (err, list) => {
    let user = req.session.user;
    if(err){res.render('index', { error: 'List not found!'});}
    if (user.lists.indexOf(list._id)){
      res.render('list', {
        list:list, user:user
      });
    }
    else {
      console.log("User "+user.name+" is not member of List "+list.name);
      res.render('index', { error: 'User not part of List!'});
    }
  });
});

// List Settings. If $user is list.admin render admin settings
app.get('/list/:id/settings', requireLogin, function(req, res) {
	List.findOne({_id : req.params.id}, function(err, list) {
		let user = req.session.user;
		if(err){res.render('index', { error: 'List not found!'});}
		if (user.lists.indexOf(list._id)){
			if (list.admin === user._id) {
				res.render('list-settings-admin', {
					list:list, user:user
				});
				console.log("rendering " + list._id + "'s admin settings for user " + user.name);
			}
			else {
				res.render('list-settings', {
					list:list, user:user
				});
				console.log("rendering " + list._id + "'s settings for user " + user.name);
			}
		}
		else {
			console.log("User "+user.name+" is not member of List "+list.name);
			res.render('index', { error: 'User not part of List!'});
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
app.get('/list/:id/invitations/:invId/:email/:name', (req, res) => {
  List.findOne({_id : req.params.id}, function(err, list) {
    if(err){res.render('index', { error: 'List not found!', translate : res  });}

    Invitation.findOne({_id : req.params.invId}, function (err, inv) {
      if(err){res.render('index', { error: 'Invitation not found!', translate : res  });}
      if (list.invitations.map(function(e) { return e._id; }).indexOf(inv._id)){
        // List exists and has an invitation for :name
        res.render('signup', {list: req.params.id, email: req.params.email, name: req.params.name, translate : res })
      }
      else res.render('index', {error: 'Invitation not associated with List!', translate : res });
    });
  });
});

// page for family members to invite new ppl
app.get('/list/:id/invite', requireLogin, (req, res) => {
  List.findOne({_id: req.params.id}, function (err, list) {
    if(err){res.render('index', { error: 'List not found!', translate : res });}
    res.render('invite', {list: list._id, translate : res})
  });
});

/**
 * Basic Route to change the used language
 */

app.get("/language/:lang", (req, res) => {
  res.cookie("preferredLang", req.params.lang, { maxAge: 900000, httpOnly: true });
  let url = req.headers.referer !== undefined ? req.headers.referer : "/";
  res.redirect(url);
});

/**
 * Standard User Route
 */

app.all('/', (req, res) => {
  if(req.session.user) res.render('index', {user: req.session.user});
  else res.render('index', {user:false});
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
		List.find(function(err, list) {

			// if there is an error retrieving, send the error
			if(err){res.json({success: false, error: 'No Lists Found!', code:400 })}


			res.json(list); // return all lists in JSON format
			console.log(list);
		});
	}
});

// get single list
app.get('/api/lists/:id', (req, res) => {
  List.findOne({_id : req.params.id}, function(err, list) {

    // if there is an error retrieving, send the error, nothing after res.send(err) will execute
    if(err){res.json({success: false, error: 'List not found', code:401})}


    res.json(list); // return the List in JSON format
    console.log(list);
  });
});

// get item-count of a list
app.get('/api/lists/:id/itemCount', (req, res) => {
	List.findOne({_id : req.params.id}, function(err, list) {
		if(err){res.json({success: false, error: 'List not found', code:401})}
		Item.find({list : list._id}, function (err, items) {
			if(err){res.json({success: false, error: 'Items not found', code:300})}
			res.json(items.length);
		});
	});
});

// get all invitaions for a list
app.get('/api/lists/:id/invitations', (req, res) => {
	Invitation.find({list: req.params.id} ,function (err, invitations) {
		if(err){res.json({success: false, error: 'No Invitations found for this List', code:402});}
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
  }, function(err, list) {
    if(err){res.json({success: false, error: 'List not created!', code:403});}
    res.json({success: true, id : list._id.toString()});
  });
});

// remove a list
app.delete('/api/lists/:id/admin', (req, res) => {
    let user = req.body.user;
    List.findOne({_id: req.params.id}, (err, l) => {
        if (l.admin === user) {
            List.remove({_id : req.params.id}, function(err, list) {
                if(err){res.json({success: false, error: 'List not removed', code:404});}
                res.json({success: true, list: list});
            });
        }
        else res.json({success:false, error: 'User not List Admin'});
    });
});

app.delete('/api/lists/:id', (req, res) => {
    let user = req.body.user;
    let list = req.body.list;
    User.findOne({_id: user}, (err, u) => {
        if (err) res.json({success: false}); // user not found
       u.lists = u.lists.filter(e => e.id !== list);
       User.findOneAndUpdate({_id: u._id}, {$set:{lists: u.lists}}, (err, u2) => {
          if (err) res.json({success:false}); //user not updated
           res.json({success:true});
       });
    });
});


// update a list
app.post('/api/lists/:id', (req, res) => {
  let update = req.body;
  List.findOneAndUpdate({_id : req.params.id}, update, function (err, list) {
    if(err){res.json({error: 'List not updated', success: false, code:405});}
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
  Item.find({list : req.params.id}, function(err, items) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({success: false, error: 'Items not found', code:300});}


    res.json({success: true, items : items}); // return all items in JSON format
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
  }, function(err, item) {
    if(err){res.json({success: false, error: 'Item not created', code:301});}
    res.json(item);
  });
});

// remove an item
app.delete('/api/items/:id', (req, res) => {
  Item.remove({_id : req.params.id}, function(err, item) {
    if(err){res.json({success: false, error: 'Item not removed', code:302});}
    res.json(item);
  });
});

// update an item
app.post('/api/items/:id', (req, res) => {
  let update = req.body;
  Item.findOneAndUpdate({_id : req.params.id}, update, function (err, item) {
    if(err){res.json({success: false, error: 'Item not updated', code:303});}
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
		User.find(function(err, users) {

			// if there is an error retrieving, send the error. nothing after res.send(err) will execute
			if(err){res.json({success: false, error: 'No users found', code:200});}



			res.json(users); // return all users in JSON format

		});
	}
});

// get single user
app.get('/api/users/:id', (req, res) => {
  User.findOne({_id : req.params.id}, function(err, user) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({success: false, error: 'User not found', code:201});}

    let tmp = {
        _id:user._id,
        name:user.name,
        email:user.email,
        lists:user.lists,
        validated:user.validated
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
	User.findOne({mail: req.params.mail}, function (err, user) {
		if(err){res.json({success: false, error: 'User not found', code:201});}

        let tmp = {
            _id:user._id,
            name:user.name,
            email:user.email,
            lists:user.lists,
            validated:user.validated
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
  User.findOne({_id : req.params.id}, function(err, user) {
	  if(err)res.json({success:false, error:err, code:202}); console.log(err);

	  let lists = [];

	  if (user.lists){

		  // first off, make an Array from the Users "list" Object
		  lists = user.lists;

		  console.log("Lists");

		  // then use that Array to get all Lists in it
		  List.find({ _id: { $in: lists }}).exec()
			  .then(function(gotLists) {
                console.info("Lists: " + gotLists);
                if(gotLists.length === 0) res.json({success: false, error:"No lists found, create one!", code:203});
                else res.json({lists: gotLists, success: true});
			  });
	  }
	  else res.json({success:false, error:101});

	  
  });
});

// get all lists per user that contain :query
app.get('/api/users/:id/lists/:query', (req, res) => {
    User.findOne({_id : req.params.id}, function(err, user) {
        if(err)res.json({success:false, error:err, code:202}); console.log(err);

        let lists = [];

        if (user.lists){

            // first off, make an Array from the Users "list" Object
            lists = user.lists;

            console.log("Lists matching");


            // then use that Array to get all Lists in it
            List.find({ _id: { $in: lists }}).exec()
                .then(function(gotLists) {
                    let matching = [];
                    gotLists.forEach(l => {
                        if (l.name.indexOf(req.params.query) !== -1) {
                            matching.push(l);
                        }
                    });
                    if(matching.length === 0) res.json({success: false, error:"No List found matching " + req.params.query, code:208});
                    else res.json({lists: matching, success: true});


                });
        }
        else res.json({success:false, error:101});


    });
});

// create user
app.post('/api/users', (req, res) => {
  let hash = bCrypt.hashSync(req.body.password);
	User.find({email:req.body.email}, function (err, user) {
		if (user) res.json({success:false, error:"User already Exists!", code:204});
	});
  User.create({
    name: req.body.name,
    email: req.body.email,
    password: hash,
    lists: req.body.lists
  }, function(err, user) {
    if(err){res.json({success: false, error: 'User not created', code:205});}
    res.json({success:true, data:user});
  });
});

// remove a user
app.delete('/api/users/:id', (req, res) => {
  User.remove({_id : req.params.id}, function(err, user) {
    if(err){res.json({success: false, error: 'User not removed', code:206});}
    res.json(user);
  });
});


// update a user adding new lists
app.post('/api/users/:id/newList', (req, res) => {
  User.findOneAndUpdate( { _id:req.params.id },{ $push: { "lists": {$each : req.body.lists} } }, function (err, user){
    if (err) res.json({success:false, error: 'Lists not added to User', code:207});
    else res.json({success:true, id:user._id});
  });
});


// add a list to multiple users
app.post("/api/users/addListBulk", (req, res) => {
    let {emails, list} = req.body;
    let a = [];
    emails.forEach(e => {
        User.findOneAndUpdate({email: e}, {$push: {"lists": list}}, (err, user) => {
           if (err) res.json({success:false, error: 'Lists not added to User', code:207});
           else a.push(e);
        });
    });
    res.json({success:true, users:a});
});

/**
 * Invitations API: Control Invitations
 * /api/invitations
 */


// get all invitations
app.get('/api/invitations', (req, res) => {
	if (req.app.get('env') === 'development') {
		Invitation.find(function (err, invitations) {
			if(err){res.json({success: false, error: 'No Invitation found'});}
			res.json(invitations);
		});
	}
});

// get single invitation
app.get('/api/invitations/:id', (req, res) => {
  Invitation.find({_id : req.params.id}, function (err, invitation) {
    if(err){res.json({success: false, error: 'Invitation not found'});}
    res.json(invitation);
  });
});

// create invitation from array
app.post('/api/invitations/array', (req, res) => {
  let inv = [] // invitation
      , l = req.body.list;
  if (req.body.invs.constructor === Array){
    req.body.invs.forEach(i => {
        createInvite(i, l, inv);
        console.log("INV: "+inv);
    });
  }
  else {
    createInvite(req.body.email, l, inv);
  }
	res.json({invs: inv, success: true});

});

// create a single invitation
app.post("/api/invitations", (req, res) => {
    createInvite(req.body.email, req.body.list, []);
});

function userExists(id, mail) {
    if (id === null) byMail(mail);
    if (mail === null) byId(id);
    function byId(id) {
        User.find({_id: id}, function (err, user) {
            return !Boolean(err);
        });
    }
    function byMail(mail) {
        User.find({email:mail}, function (err, user) {
            return !Boolean(err);
        });
    }
}


function createInvite(email, list, arr) {
    if (!userExists(null, email)) {

        Invitation.create({
            email: email,
            list: list
        }, function (err, invitation) {
            arr.push(invitation.email);
            List.findById(list, (err, l) => {

                let msg = {
                    to: email,
                    subject: `ListX - New Invitation to List ${l.name}!`,
                    body: `Howdy! \n 
                    The ListX User ${l.admin} has invited you to join the List ${l.name}! \n 
                    Please follow this link to join ListX and accept the Invitation: \n \n 
                    https://listx.io/list/${l._id}/invitations/${invitation._id} \n \n 
                    The ListX.io Team`,
					send:true
                };

                console.log("Sending Invitation Email:");
                mail(msg);

                l.invitations.push(invitation._id);
                List.findOneAndUpdate({_id: list},{$set:{invitations: l.invitations}}, (err, l2) => {
                    if (err) return {k:0, l:l2};
                    return {l:l2};
                });
            });
        });

    }
}

// Delete an invitation
app.delete('/api/invitations/:id', (req, res) => {
  Invitation.remove({_id : req.params.id}, function (err, invitation) {
    if(err){res.json({success: false, error: 'Invitation not deleted'});}
    res.json({success: true, invitation: invitation});
  });
});

// Delete all invitations per list
app.delete('/api/invitations/list/:id', (req, res) => {
  let inv = {}, i=0;
  // first grab the Invitations from the list of :id
  List.find({_id : req.params.id}, function (err, list) {
    if(err){res.json({success: false, error: 'List not found'});}
    // bind the invitations
    let invites = list.invitations;
    invites.forEach(e => {
        // remove the invitation bound to e
        Invitation.remove({_id : e._id}, function (err, invite) {
            if(err){res.json({success: false, error: 'Invitation not deleted'});}
            inv[i] = invite;
            i++;
        });
    });
  });
  res.json(inv);
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

		let msg = {
			from: 'ListX <noreply@listx.io>',
			to: to,
			subject: sub,
			text: body
		};

		msg.html = html ? html : undefined;

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
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({ email: req.session.user.email }, function(err, user) {
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

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.render('error');
});


/**
 * requireLogin for User Specific areas
 * @param req Request send by $User to the server
 * @param res Response to be send by the server
 * @param next The next handler
 */
function requireLogin (req, res, next) {
  if (!req.session.user) {
    // redirect to login page
    res.redirect('/login');
  } else {
    next();
  }
}

module.exports = app;
