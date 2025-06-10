const mongoose = require('mongoose');

const foxSchema = new mongoose.Schema({
    imageId: {
        type: Number,
        required: true,
        unique: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    votes: {
        type: Number,
        default: 0
    },
    favoriteCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for sorting by votes and favorites
foxSchema.index({ votes: -1 });
foxSchema.index({ favoriteCount: -1 });

module.exports = mongoose.model('Fox', foxSchema); 