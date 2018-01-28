const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

let ItemSchema   = new Schema({
    list: Schema.Types.ObjectId,
    name: String,
    amount: String,
    count: Number,
    art: String,
    date: {type: Number, default: () => {
        return (new Date(Date.now()).getTime());
    }} // 45 Minutes
});

ItemSchema.statics.findByList = function(id, callback) {
    return this.find({list: id}, callback);
};

module.exports = mongoose.model('Item', ItemSchema);
