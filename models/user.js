const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

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
  country: String,
  additionalFields: []
});

UserSchema.statics.findByMail = function(mail, safe, callback) {
  this.findOne({email:mail}, (err, user) => {
    let tmp;
    if (safe) {
      tmp = { // do not include password and user status
        _id: user._id,
        name: user.name,
        email: user.email,
        lists: user.lists,
        validated: user.validated
      };
    } else {
      tmp = {
        _id: user._id,
        name: user.name,
        email: user.email,
        password: user.password,
        lists: user.lists,
        validated: user.validated
      };
      if (user.premium) {
        tmp.premium = true;
      }
      if (user.alphaTester) {
        tmp.alphaTester = true;
      }
      if (user.betaTester) {
        tmp.betaTester = true;
      }
    }
    callback(err, tmp)
  });
};

UserSchema.statics.getLists = function(id, callback) {
  this.findById(id, (err, user) => {
    let userLists = [];

    callback(err, userLists);
  })
};

module.exports = mongoose.model('User', UserSchema);
