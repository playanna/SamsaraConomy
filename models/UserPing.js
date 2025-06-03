const mongoose = require('mongoose');

const userPingSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    count: {
        type: Number,
        default: 0,
    },
}); 

module.exports = mongoose.model('UserPing', userPingSchema);
