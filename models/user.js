const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;
const config       = require("../config.json");

let UserSchema = new Schema({
  username: String,
  name: String,
  email: String,
  password: String,
  lists: [], // 1 User => * Lists
  premium: {type: Boolean, default: false},
  alphaTester: {type: Boolean, default: false},
  betaTester: {type: Boolean, default: false},
  validated: {type: Boolean, default: false},
  address: String,
  zipCode: String,
  country: String
});

/**
 * Find a User by their Email-Address
 * @param mail The Email to search for
 * @param safe Whether or not to return the !complete user
 * @param callback Function gets the err object and the User as parameters
 */
UserSchema.statics.findByMail = function(mail, safe, callback) {
  this.findOne({email:mail}, function (err, user) {
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

/**
 * Get all Lists a User has
 * @param id The ID of the User
 * @param callback Function gets the err and the lists as an Array as parameters
 */
UserSchema.statics.getLists = function(id, callback) {
  this.findById(id, function (err, user) {
    if(user.lists) {
      mongoose.model("List").find({_id: {$in: user.lists}}).exec()
          .then(lists => {
            callback(err, lists);
          });
    }
  });
};

/**
 * Get the Lists a User has that contain query
 * @param id The ID of the User
 * @param query The query/search parameter
 * @param callback Function gets the err and the matching Lists as an Array as parameters
 */
UserSchema.statics.getListsByQuery = function (id, query, callback) {
  let matchingLists = [];
  this.findById(id, function (err, user) {
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


//TODO: validation process, like deletion process

/**
 * Start the User removal process by sending the token per mail
 * @param id The ID of the User
 * @param callback Function gets err|false and the mailData as parameters
 */
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

/**
 * Finish the User removal process by removing the User and deleting all data of the User in the process
 * @param id The ID of the User
 * @param callback Function gets err|false, the deleted User (unsafe) and an Object containing more information on the deletion process
 * TODO: delete all data of the User
 */
UserSchema.statics.actuallyRemoveDo = function (id, callback) {
    mongoose.model("UserDeletionToken").findOneAndRemove({_id: id}, function (err, token) {
        err && callback(err);
        this.remove({_id: token.userId}, (err, user) => {
            err && callback(err);
            callback(false, user, {success: true});
        });
        mongoose.model("List").remove({admin:token.userId}, (err, lists) => { //this should also delete all the items of that list
            err && callback(err);
        });
    });
};

/**
 * Start the User Email change process by sending token per mail
 * @param id The ID of the User
 * @param newMail The new Email that should be set for the User
 * @param callback Function gets err|false, the Mail Data and the new Email as parameters
 */
UserSchema.statics.changeMailCreate = function (id, newMail, callback) {
    this.findById(id, (err, user) => {
        err && callback(err);
        mongoose.model("EmailReset").create({userId: user._id}, function (err, reset) {
            err && callback(err);
            let URL = `http://${config.domain}/user/change-email/${reset._id}?newEmail=${newMail}`;
            let resetLink = `http://${config.domain}/user/reset-password`;
            let mailData = {};
            mailData.to = user.email;
            mailData.subject = `ListX Email Change`;
            mailData.body = `Hey ${user.name}, \nTo change your ListX email address, follow the link below: \n${URL} (Voids in 45 minutes)\n\nIf you didn't request an email address change, please consider resetting your password (${resetLink}) \nListX Support`;
            mailData.send = true;
            callback(false, mailData, newMail);
        });
    })
};

module.exports = mongoose.model('User', UserSchema);