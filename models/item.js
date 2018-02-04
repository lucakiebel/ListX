const mongoose     = require('mongoose');
const Schema       = mongoose.Schema;

let ItemSchema   = new Schema({
    list: Schema.Types.ObjectId,
    name: String,
    amount: String,
    count: Number,
    art: String,
    date: {type: String, default: () => {
        return (new Date(Date.now())).toString();
    }},
    remember: Boolean,
    bought: {type: Boolean, default:false}
});

ItemSchema.statics.findByList = function(id, callback) {
    return this.find({list: id}, callback);
};

module.exports = mongoose.model('Item', ItemSchema);
