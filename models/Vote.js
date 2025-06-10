const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    foxId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for counting user votes per fox
voteSchema.index({ userId: 1, foxId: 1 });

module.exports = mongoose.model('Vote', voteSchema); 