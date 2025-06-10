const mongoose = require('mongoose');

const userFavoriteSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    favorites: [{
        fox: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Fox'
        },
        rank: {
            type: Number,
            min: 1,
            max: 3
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
});

// Compound index for user and fox combinations
userFavoriteSchema.index({ userId: 1, 'favorites.fox': 1 });

module.exports = mongoose.model('UserFavorite', userFavoriteSchema); 