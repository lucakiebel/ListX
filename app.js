var   express = require('express')                        // Express as a Webserver
    , path = require('path')                              // path used for local file access
    , favicon = require('serve-favicon')                  // Serve favicons for every request
    , logger = require('morgan')                          // Morgan to log requests to the console
    , cookieParser = require('cookie-parser')             // Cookie parser to, well, parse cookies
    , bodyParser = require('body-parser')                 // Again, the name stands for the concept, parse HTTP POST bodies
    , mongoose = require('mongoose')                      // Mongoose is used to connect to the mongoDB server
    , methodOverride = require('method-override')         // Method Override to use delete method for elemets
    , i18n = require('i18n')                              // i18n for translations (German/English)
    , session = require('client-sessions')                // Client-Sessions to be able to access the session variables
    , bcrypt = require('bcrypt-nodejs')                   // bcrypt for secure Password hashing (on the server side)
    , app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.png')));
app.use(logger('dev'));
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
  httpOnly: true // prevent cookies from being intercepted
}));

i18n.configure({

//define how many languages we would support in our application
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

// database setup
mongoose.connect('mongodb://localhost:27070');

var Item = mongoose.model('Item', {
  list:mongoose.Schema.Types.ObjectId,
  name:String,
  amount:String,
  count:Number,
  art:String,
  date:{type:Date, default:Date.now}
});

var User = mongoose.model('User', {
  name:String,
  email:String,
  password:String,
  lists: [] // 1 User => 1+ Lists
});

var List = mongoose.model('List', {
  name:String,
  country:String,
  language:String,
  admin:mongoose.Schema.Types.ObjectId,
  invitations: [] // 1 List => 0+ Invitations
});

var Invitation = mongoose.model('Invitation', {
  name:String,
  email:String,
  list:mongoose.Schema.Types.ObjectId
});


var DemoList = mongoose.model('DemoList', {
  name:String,
  language:String,
  expiry:{type:Date, default:Date.now()+8*60*60*1000}
});

var ShortDomain = mongoose.model('ShortDomain', {
  short:String,
  long:String
});

/**
 * UI CONTROLLER
 */

// signup page for users + family creator
app.get('/signup', function(req, res) {
  res.render('signup');
});


app.post('/login', function(req, res) {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (!user) {
      console.error("No User with Email \"" + req.body.email + "\" found.");
      res.json({"correct":false});
    } else {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        // sets a cookie with the user's info
        req.session.user = user;
        console.info("User "+ user.email + " successfully logged in!");
        res.json({"correct":true, "username":user.name});
      } else {
        console.error("Wrong Password for " + user.name);
        res.json({"correct":false});
      }
    }
  });
});

app.get('/login', function (req, res) {
  if(req.session.user){
    res.redirect("/dashboard");
  }
  res.render("login");
});

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.redirect("/");
});

/**
 * Nav Element Routes
 */


// Demo Page
app.get("/demo", function (req, res) {
  res.render("demo");
});

// Demo List


// Developer Page
app.get("/dev", function (req, res) {
  res.render("index-dev");
});

/**
 * Stuff which needs authentication
 */
// List index per List if $user is part of it TODO Users now authenticates via Session
app.get('/list/:id', requireLogin, function(req, res) {
  List.findOne({_id : req.params.id}, function(err, list) {
    var user = req.session.user;
    if(err){res.render('index', { error: 'List not found!'});}
    if (user.lists.indexOf(list._id)){
      res.render('list', {
        famId:list._id,
        famName:list.name,
        userId:user._id,
        userName:user.name
      });
    }
    else {
      console.log("User "+user.name+" is not member of List "+list.name);
      res.render('index', { error: 'User not part of List!'});
    }
  });
});


app.get('/dashboard', requireLogin, function(req, res) {
  if(req.session.user){
    res.render('dashboard', {user: req.session.user});
  }
  res.render('dashboard', {user:false});
});



// Invitations page for invited users to join a family and "sign up"
app.get('/list/:id/invitations/:invId/:email/:name', function (req, res) {
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

// Settings page for the family's admin
app.get('/list/:id/settings', requireLogin, function (req, res) {
  List.findOne({_id: req.params.id}, function (err, list) {
    if(err){res.render('index', { error: 'List not found!', translate : res });}
    res.render('settings-list', {list: list._id, translate : res});
  });
});

// page for family members to invite new ppl
app.get('/list/:id/invite', requireLogin, function (req, res) {
  List.findOne({_id: req.params.id}, function (err, list) {
    if(err){res.render('index', { error: 'List not found!', translate : res });}
    res.render('invite', {list: list._id, translate : res})
  });
});

/**
 * Basic Routes to change the used language
 */

app.get("/language/:lang", function (req, res) {
  res.cookie("preferredLang", req.params.lang, { maxAge: 900000, httpOnly: true });
  res.redirect('back');
});

/**
 * Standard User Route
 */

app.all('/', function (req, res) {
  if(req.session.user){
    res.render('index', {user: req.session.user});
  }
  res.render('index', {user:false});
});


/**
 * API Controller
 */

/**
 * Lists API: Control Lists
 * /api/lists
 */

// get all lists
app.get('/api/lists', function(req, res) {
  // use mongoose to get all families in the database
  List.find(function(err, fam) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({ error: 'No Lists Found!' })}


    res.json(fam); // return all families in JSON format
    console.log(fam);
  });
});

// get single list
app.get('/api/lists/:id', function(req, res) {
  List.findOne({_id : req.params.id}, function(err, list) {

    // if there is an error retrieving, send the error, nothing after res.send(err) will execute
    if(err){res.json({ error: 'List not found'})}


    res.json(list); // return the family in JSON format
    console.log(list);
  });
});

// create list
app.post('/api/lists', function(req, res) {
  List.create({
    name: req.body.name,
    country: req.body.country,
    language: req.body.language,
    invitations: req.body.invitations
  }, function(err, list) {
    if(err){res.json({ error: 'List not created'});}
    res.json(list);
  });
});

// remove a list
app.delete('/api/lists/:id', function(req, res) {
  List.remove({_id : req.params.id}, function(err, list) {
    if(err){res.json({ error: 'List not removed'});}
    res.json(list);
  })
});


// update a list
app.post('/api/lists/:id', function (req, res) {
  var update = req.body;
  Item.findOneAndUpdate({_id : req.params.id}, update, function (err, list) {
    if(err){res.json({ error: 'List not updated'});}
    res.json(list);
  });
});

/**
 * Items API: Control Items
 * /api/items
 */

// get all items per list
app.get('/api/items/:id', function(req, res) {
  // use mongoose to get all items in the database
  Item.find({list : req.params.id}, function(err, items) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({ error: 'Items not found'});}


    res.json(items); // return all items in JSON format
    console.log(items);
  });
});

// create item
app.post('/api/items', function(req, res) {
  Item.create({
    list: req.body.list,
    name: req.body.name,
    amount: req.body.amount,
    count: req.body.count,
    art: req.body.art
  }, function(err, item) {
    if(err){res.json({ error: 'Item not created'});}
    res.json(item);
  });
});

// remove an item
app.delete('/api/items/:id', function(req, res) {
  Item.remove({_id : req.params.id}, function(err, item) {
    if(err){res.json({ error: 'Item not removed'});}
    res.json(item);
  });
});

// update an item
app.post('/api/items/:id', function (req, res) {
  var update = req.body;
  Item.findOneAndUpdate({_id : req.params.id}, update, function (err, item) {
    if(err){res.json({ error: 'Item not updated'});}
    res.json(item);
  });
});



/**
 * Users API: Control Users
 * /api/users
 */

// get all users
app.get('/api/users', function(req, res) {
  // use mongoose to get all users in the database
  User.find(function(err, users) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({ error: 'No user found'});}


    res.json(users); // return all users in JSON format
    console.log(users);
  });
});

// get single user
app.get('/api/users/:id', function(req, res) {
  User.findOne({_id : req.params.id}, function(err, user) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if(err){res.json({ error: 'User not found'});}


    res.json(user); // return the user in JSON format
    console.log(user);
  });
});

// create user
app.post('/api/users', function(req, res) {
  var hash = bcrypt.hashSync(req.body.password);
  User.create({
    name: req.body.name,
    email: req.body.email,
    password: hash,
    lists: req.body.lists
  }, function(err, user) {
    if(err){res.json({ error: 'User not created'});}
    res.json(user);
  });
});

// remove a user
app.delete('/api/users/:id', function(req, res) {
  User.remove({_id : req.params.id}, function(err, user) {
    if(err){res.json({ error: 'User not removed'});}
    res.json(user);
  });
});


// update a user
app.post('/api/users/:id', function (req, res) {
  var hash = bcrypt.hashSync(req.body.password);
  var update = {
    name: req.body.name,
    email: req.body.email,
    password: hash,
    lists: req.body.lists
  };
  User.findOneAndUpdate({_id : req.params.id}, update, function (err, user) {
    if(err){res.json({ error: 'User not updated'});}
    res.json(user);
  });
});

/**
 * Invitations API: Control Invitations
 * /api/invitations
 */

// get all invitations
app.get('/api/invitations', function (req, res) {
  Invitation.find(function (err, invitations) {
    if(err){res.json({ error: 'No Invitation found'});}
    res.json(invitations);
  });
});

// get single invitation
app.get('/api/invitations/:id', function (req, res) {
  Invitation.find({_id : req.params.id}, function (err, invitation) {
    if(err){res.json({ error: 'Invitation not found'});}
    res.json(invitation);
  });
});

// create invitation
app.post('/api/invitations', function (req, res) {
  var inv = {} // invitation
      , e // element
      , i=0; // incrementer
  if (req.body.constructor === Array){
    for(e in req.body){
      if(req.body.hasOwnProperty(e)){
        createInvite(req.body[e].email, i);
        i++;
      }
    }
  }
  else {
    createInvite(req.body.email, i);
  }
  res.json(inv);

  function createInvite(email, no) {
    Invitation.create({
      email: email
    }, function (err, invitation) {
      res.json({ error: 'Invitation not created'});
      inv[no] = invitation;
    });
  }
});

// Delete an invitation
app.delete('/api/invitations/:id', function (req, res) {
  Invitation.remove({_id : req.params.id}, function (err, invitation) {
    if(err){res.json({ error: 'Invitation not deleted'});}
    res.json(invitation);
  });
});

// Delete all invitations per list
app.delete('/api/invitations/list/:id', function (req, res) {
  var inv = {}, i=0;
  // first grab the Invitations from the list of :id
  List.find({_id : req.params.id}, function (err, list) {
    if(err){res.json({ error: 'List not found'});}
    // bind the invitations
    var invites = list.invitations;
    for (var e in invites){
      if (invites.hasOwnProperty(e)){
        // remove the invitation bound to e
        Invitation.remove({_id : e._id}, function (err, invite) {
          if(err){res.json({ error: 'Invitation not deleted'});}
          inv[i] = invite;
          i++;
        });
      }
    }
  });
  res.json(inv);
});


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
        res.locals.user = user;
      }
      // finishing processing the middleware and run the route
      next();
    });
  } else {
    next();
  }
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  /*// set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  return res.render('error');*/
});


/**
 * requireLogin for User Specific areas
 * @param req Request send by $User to the server
 * @param res Response to be send by the server
 * @param next The next handler
 */
function requireLogin (req, res, next) {
  if (!req.session.user) {
    // redirect to homepage with login form
    res.redirect('/');
  } else {
    next();
  }
}

module.exports = app;
