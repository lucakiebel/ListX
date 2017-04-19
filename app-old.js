var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var methodOverride = require('method-override');
var session = require('client-sessions');

//var controller = require('./routes/controller');
//var api = require('./routes/api');
var app = express();

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
  secret: 'a1yON9OMzD@SRIQ964eEqau#LS1qz@cP8XlXzMt&',
  duration: 28 * 86400000, // 28 days
  activeDuration: 30 * 60 * 1000,
  httpOnly: true
}));


// database setup
mongoose.connect('mongodb://localhost:27070');

var Item = mongoose.model('Item', {
  family:mongoose.Schema.Types.ObjectId,
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
  family:mongoose.Schema.Types.ObjectId
});

var Family = mongoose.model('List', {
  name:String,
  country:String,
  language:String,
  invitations: []
});

// server setup
//app.use('/', controller);
//app.use('/api', api);


/**
 * UI CONTROLLER
 */

// List index per List if $user is part of it TODO: user language by IP loc: https://ipapi.co/{ip}/country
app.get('/family/:fam_id/:user_id', function(req, res) {
  Family.find({_id : req.params.fam_id}, function(err, family) {
    if (err){ res.redirect("/") }
    if (family[0] == undefined){res.redirect("/")}
    User.find({_id : req.params.user_id}, function (err, user) {
      if (err){ res.redirect("/") }
      if (user[0] == undefined){res.redirect("/")}
      if (String(user[0].family) == String(family[0]._id)){
        console.log("User "+user[0].name+" is in List "+family[0].name);
        res.render('list', {
          lang:res.session.lang,
          famId:family[0]._id,
          famName:family[0].name,
          userId:user[0]._id,
          userName:user[0].name });
      }
      else {
        console.log("User "+user[0].name+" is not in List "+family[0].name);
        res.redirect("/");
      }
    });
  });
});

// signup page for users + family creator
app.get('/signup', function(req, res) {
  res.render('signup');
});

// Invitations page for invited users to join a family and "sign up"
app.get('/family/:fam_id/invitations', function (req, res) {
  Family.find({_id : req.params.fam_id}, function(err, family) {
    if (err){res.redirect("/")}
    if (family[0] == undefined){res.redirect("/")}

  });
});

// Settings page for the family's admin
app.get('/family/:fam_id/settings', function (req, res) {
  Family.find({_id: req.params.fam_id}, function (err, family) {
    if (err){res.redirect("/")}
    if (family[0] == undefined){res.redirect("/")}

  });
});

// page for family members to invite new ppl
app.get('/family/:fam_id/invite', function (req, res) {
  Family.find({_id: req.params.fam_id}, function (err, family) {
    if (err){res.redirect("/")}
    if (family[0] == undefined){res.redirect("/")}

  });
});



app.get('', function (req, res) {
  // Later on this will send the welcome page and ability to sign up
  res.render('index');
});



/**
 * API CONTROLLER
 */

// ==================================================
// GETters
// ==================================================

app.post('/api/test', function(req, res) {
  res.json(req.body);
  res.json(req.params);
});

// get all items per family
app.get('/api/items/:fam_id', function(req, res) {
  // use mongoose to get all todos in the database
  Item.find({family : req.params.fam_id}, function(err, items) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if (err){ res.redirect("/") }


    res.json(items); // return all items in JSON format
    console.log(items);
  });
});

// get all users
app.get('/api/users', function(req, res) {
  // use mongoose to get all users in the database
  User.find(function(err, users) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if (err){ res.redirect("/") }


    res.json(users); // return all users in JSON format
    console.log(users);
  });
});

// get all families
app.get('/api/families', function(req, res) {
  // use mongoose to get all families in the database
  Family.find(function(err, fam) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if (err){ res.redirect("/") }


    res.json(fam); // return all families in JSON format
    console.log(fam);
  });
});

// get single user
app.get('/api/users/:id', function(req, res) {
  User.find({_id : req.params.id}, function(err, user) {

    // if there is an error retrieving, send the error. nothing after res.send(err) will execute
    if (err){ res.redirect("/") }


    res.json(user[0]); // return the user in JSON format
    console.log(user[0]);
  });
});

// get single family
app.get('/api/families/:id', function(req, res) {
  Family.find({_id : req.params.id}, function(err, family) {

    // if there is an error retrieving, send the error, nothing after res.send(err) will execute
    if (err){ res.redirect("/") }


    res.json(family); // return the family in JSON format
    console.log(family);
  });
});

// ==================================================
// SETters
// ==================================================

// create item
app.post('/api/items/:fam_id', function(req, res) {
  Item.create({
    family: req.params.fam_id || req.body.family,
    name: req.body.name,
    amount: req.body.amount,
    count: req.body.count,
    art: req.body.art
  }, function(err, item) {
    if (err){ res.redirect("/") }
    res.json(item);
  });
});


// create user
app.post('/api/users', function(req, res) {
  User.create({
    name: req.body.name,
    email: req.body.email,
    family: req.body.family
  }, function(err, user) {
    if (err){ res.redirect("/") }
    res.json(user);
  });
});


// create family
app.post('/api/families', function(req, res) {
  Family.create({
    name: req.body.name,
    country: req.body.country,
    language: req.body.language,
    invitations: req.body.invitations
  }, function(err, family) {
    if (err){ res.redirect("/") }
    res.json(family);
  });
});

// ==================================================
// Removers
// ==================================================

// remove an item
app.delete('/api/items/:id', function(req, res) {
  Item.remove({_id : req.params.id}, function(err, item) {
    if (err){ res.redirect("/") }
    res.json(item);
  });
});


// remove a user
app.delete('/api/users/:id', function(req, res) {
  User.remove({_id : req.params.id}, function(err, user) {
    if (err){ res.redirect("/") }
    res.json(user);
  });
});


// remove a family
app.delete('/api/families/:id', function(req, res) {
  Family.remove({_id : req.params.id}, function(err, family) {
    if (err){ res.redirect("/") }
    res.json(family);
  })
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
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});





module.exports = app;
