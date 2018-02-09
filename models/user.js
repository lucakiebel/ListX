const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const config       = require("../config.json");

let UserSchema = new Schema({
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
  country: String
});

UserSchema.statics.findByMail = function(mail, safe, callback) {
  this.findOne({email:mail}, (err, user) => {
    let tmp;
    tmp = { // do not include password and user status
      _id: user._id,
      name: user.name,
      email: user.email,
      lists: user.lists,
      validated: user.validated
    };
    if (!safe) {
      tmp.password = user.password;
      user.premium && (tmp.premium = true);
      user.alphaTester && (tmp.alphaTester = true);
      user.betaTester && (tmp.betaTester = true);
    }
    callback(err, tmp)
  });
};

UserSchema.statics.getLists = function(id, callback) {
  this.findById(id, (err, user) => {
    if(user.lists) {
      mongoose.model("List").find({_id: {$in: user.lists}}).exec()
          .then(lists => {
            callback(err, lists);
          });
    }
  });
};

UserSchema.statics.getListsByQuery = function (id, query, callback) {
  let matchingLists = [];
  this.findById(id, (err, user) => {
    if(user.lists) {
      mongoose.model("List").find({_id: {$in: user.lists}}).exec()
          .then(lists => {
            lists.forEach(list => {
              if(list.name.toLowerCase().indexOf(query.toLowerCase()) !== -1)
                matchingLists.push(list);
            });
            callback(err, matchingLists);
          });
    }
  });
};

UserSchema.statics.actuallyRemove = function (id, callback) {
  mongoose.model("UserDeletionToken").create({userId: id}, function (err, token) {
    token = token._id;
    this.findOne({_id: id}, function (err, user) {

    })
  })
};

module.exports = mongoose.model('User', UserSchema);