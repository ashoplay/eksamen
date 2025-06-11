const express = require('express');
const router = express.Router();
const Fox = require('../models/Fox');
const Vote = require('../models/Vote');
const UserFavorite = require('../models/UserFavorite');
const axios = require('axios');

// Helper function to get random fox
async function getRandomFox() {
    try {
        const response = await axios.get('https://randomfox.ca/floof/');
        const imageUrl = response.data.image;
        const imageId = parseInt(imageUrl.split('/').pop().split('.')[0]);
        
        // Check if fox already exists in database
        let fox = await Fox.findOne({ imageId });
        if (!fox) {
            fox = await Fox.create({
                imageId,
                imageUrl,
                votes: 0
            });
        }
        return fox;
    } catch (error) {
        console.error('Error getting random fox:', error);
        throw error;
    }
}

// Helper function to update user favorites based on their votes
async function updateUserFavorites(userId) {
    try {
        if (!userId) return null;
        
        // Get user's top 3 most voted foxes
        const topVotedFoxes = await Vote.aggregate([
            { $match: { userId } },
            { $group: { 
                _id: '$foxId',
                count: { $sum: 1 },
                lastVoteAt: { $max: '$createdAt' }
            }},
            { $sort: { count: -1, lastVoteAt: -1 } },
            { $limit: 3 }
        ]);

        if (topVotedFoxes.length === 0) return null;

        // Find or create user favorites
        let userFavorites = await UserFavorite.findOne({ userId });
        if (!userFavorites) {
            userFavorites = new UserFavorite({ userId, favorites: [] });
        }

        // Remove old favorites
        for (const oldFav of userFavorites.favorites) {
            await Fox.findByIdAndUpdate(oldFav.fox, { $inc: { favoriteCount: -1 } });
        }

        // Clear existing favorites
        userFavorites.favorites = [];

        // Add new favorites based on personal vote count
        for (let i = 0; i < topVotedFoxes.length; i++) {
            const foxId = topVotedFoxes[i]._id;
            const fox = await Fox.findOne({ imageId: parseInt(foxId) });
            if (fox) {
                await Fox.findByIdAndUpdate(fox._id, { $inc: { favoriteCount: 1 } });
                userFavorites.favorites.push({
                    fox: fox._id,
                    rank: i + 1,
                    voteCount: topVotedFoxes[i].count,
                    addedAt: new Date()
                });
            }
        }

        await userFavorites.save();
        return await UserFavorite.findOne({ userId }).populate('favorites.fox');
    } catch (error) {
        console.error('Error updating favorites:', error);
        throw error;
    }
}

// Vote for a fox
router.post('/vote', async (req, res) => {
    try {
        const { imageId } = req.body;
        const ipAddress = req.ip;
        const userId = req.session.userId;

        if (!imageId) {
            return res.status(400).json({ error: 'Mangler bilde-ID' });
        }

        // Find or create the fox in the database
        let fox = await Fox.findOne({ imageId: parseInt(imageId) });
        if (!fox) {
            // If fox doesn't exist, get it from the API
            const response = await axios.get(`https://randomfox.ca/images/${imageId}.jpg`);
            if (response.status === 200) {
                fox = await Fox.create({
                    imageId: parseInt(imageId),
                    imageUrl: `https://randomfox.ca/images/${imageId}.jpg`,
                    votes: 0
                });
            } else {
                return res.status(404).json({ error: 'Fant ikke reven' });
            }
        }

        // Create vote record
        await Vote.create({ 
            foxId: imageId.toString(),
            ipAddress, 
            userId 
        });

        // Increment fox votes
        const updatedFox = await Fox.findByIdAndUpdate(
            fox._id,
            { $inc: { votes: 1 } },
            { new: true }
        );

        // Update user's favorites based on their voting history
        const updatedFavorites = await updateUserFavorites(userId);

        // Get updated top foxes
        const topFoxes = await Fox.find()
            .sort({ votes: -1 })
            .limit(10);

        // Get two new random foxes
        const newFox1 = await getRandomFox();
        let newFox2;
        do {
            newFox2 = await getRandomFox();
        } while (newFox2.imageId === newFox1.imageId);

        // Emit single update with all new data
        const io = req.app.get('io');
        io.emit('votesUpdated', {
            topFoxes,
            mostVoted: topFoxes[0],
            userFavorites: updatedFavorites ? updatedFavorites.favorites : [],
            newFoxes: [newFox1, newFox2],
            votedFox: {
                id: fox._id,
                votes: updatedFox.votes
            }
        });

        res.json({ 
            success: true, 
            fox: updatedFox,
            newFoxes: [newFox1, newFox2]
        });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Kunne ikke registrere stemmen' });
    }
});

// Get user's favorite foxes
router.get('/favorites', async (req, res) => {
    try {
        const userId = req.session.userId;
        const userFavorites = await UserFavorite.findOne({ userId })
            .populate('favorites.fox');
        res.json(userFavorites ? userFavorites.favorites : []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get top rated foxes
router.get('/top-foxes', async (req, res) => {
    try {
        const topFoxes = await Fox.find()
            .sort({ votes: -1 })
            .limit(10);
        res.json(topFoxes);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 