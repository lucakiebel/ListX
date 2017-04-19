var express = require('express');
var router = express.Router();

/**
 * UI Controller
 * These routes are all appended to the domain root
 */


router.get('/:fam_id/:user_id', function(req, res) {
  List.find({_id : req.params.fam_id}, function(err, family) {
    if (err) res.send(err);
    res.render('list', { fam_id : family._id, fam_name : family.name, user_id : req.params.user_id });
  });
});

router.get('/:fam_id/invitations', function (req, res) {
  List.find({_id : req.params.fam_id}, function(err, family) {
    
  });
});

router.get('', function (req, res) {
  // Later on this will send the welcome page and ability to sign up
  res.render('index');
});

module.exports = router;
