var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.redirect("/");
});

/**
 * API Routes
 * These routes are all appended to /api/{version}
 */

// ==================================================
// GETters
// ==================================================

  // get all items per family
  router.get('/items/:fam_id', function(req, res) {
    // use mongoose to get all todos in the database
    Item.find({family : req.params.fam_id}, function(err, items) {

      // if there is an error retrieving, send the error. nothing after res.send(err) will execute
      if (err)
        res.send(err);

      res.json(items); // return all items in JSON format
      console.log(items);
    });
  });

  // get all users
  router.get('/users', function(req, res) {
    // use mongoose to get all users in the database
    User.find(function(err, users) {

      // if there is an error retrieving, send the error. nothing after res.send(err) will execute
      if (err)
        res.send(err);

      res.json(users); // return all users in JSON format
      console.log(users);
    });
  });

  // get all families
  router.get('/families', function(req, res) {
    // use mongoose to get all families in the database
    List.find(function(err, fam) {

      // if there is an error retrieving, send the error. nothing after res.send(err) will execute
      if (err)
        res.send(err);

      res.json(fam); // return all families in JSON format
      console.log(fam);
    });
  });

  // get single user
  router.get('/users/:id', function(req, res) {
    User.find({_id : req.params.id}, function(err, user) {

      // if there is an error retrieving, send the error. nothing after res.send(err) will execute
      if (err)
        res.send(err);

      res.json(user); // return the user in JSON format
      console.log(user);
    });
  });

  // get single family
  router.get('/families/:id', function(req, res) {
    List.find({_id : req.params.id}, function(err, family) {

      // if there is an error retrieving, send the error, nothing after res.send(err) will execute
      if (err)
          res.send(err);

      res.json(family); // return the family in JSON format
      console.log(family);
    });
  });

// ==================================================
// SETters
// ==================================================

  // create item
  router.post('/items/:fam_id', function(req, res) {
    Item.create({
      family: req.params.fam_id,
      name: req.body.name,
      amount: req.body.amount,
      count: req.body.count,
      art: req.body.art
    }, function(err, item) {
      if (err) res.send(err);
      res.json(item);
    });
  });


  // create user
  router.post('/users', function(req, res) {
    User.create({
      name: req.body.name,
      email: req.body.email,
      family: req.body.family
    }, function(err, user) {
      if (err) res.send(err);
      res.json(user);
    });
  });


  // create family
  router.post('/families', function(req, res) {
    List.create({
      name: req.body.name
    }, function(err, family) {
      if (err) res.send(err);
      res.json(family);
    });
  });

// ==================================================
// Removers
// ==================================================

  // remove an item
  router.post('/items/:id', function(req, res) {
    Item.remove({_id : req.params.id}, function(err, item) {
      if (err) res.send(err);
      res.json(item);
    });
  });
  
  
  // remove a user
  router.post('/users/:id', function(req, res) {
    User.remove({_id : req.params.id}, function(err, user) {
      if (err) res.send(err);
      res.json(user);
    });
  });
  
  
  // remove a family
  router.post('/families/:id', function(req, res) {
    List.remove({_id : req.params.id}, function(err, family) {
      if (err) res.send(err);
      res.json(family);
    })
  });

module.exports = router;