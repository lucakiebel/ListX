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
      tmp = user;
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

UserSchema.validate = function (id, ) {
    
}

UserSchema.statics.actuallyRemoveCreate = function (id, callback) {
  mongoose.model("UserDeletionToken").create({userId: id}, function (err, token) {
    err && callback(err);
    token = token._id;
    this.findOne({_id: id}, function (err, user) {
      err && callback(err);
      if (user) {
          let URL = `https://${config.domain}/user/delete/${token}`;
          let mailData = {
              to: user.email,
              subject: "ListX Account Deletion",
              body: `Hey ${user.name}, \nYou (or someone else) just requested deletion for this ListX account. \n\nIf it was you and you are trying to delete your account, please follow this link in order to do so: \n\t${URL} \n\nIf you did not request account deletion, please immediately change your password, it might be known to someone else. \n\nListX Support`,
              send: true
          };
          callback(false, mailData);
      }
    })
  })
};

UserSchema.statics.actuallyRemoveDo = function (id, callback) {
    mongoose.model("UserDeletionToken").findOne({_id: id}, function (err, token) {
        err && callback(err);
        this.remove({_id: token.userId}, function (err, user) {
            err && callback(err);
            callback(false, user, {success: true});
        });
    });
};

module.exports = mongoose.model('User', UserSchema);