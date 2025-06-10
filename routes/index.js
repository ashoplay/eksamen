const express = require('express');
const router = express.Router();
const Fox = require('../models/Fox');
const axios = require('axios');

// Helper function to get random fox image
async function getRandomFox() {
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
}

// Home page - show two random foxes
router.get('/', async (req, res) => {
    try {
        // Get two different random foxes
        const fox1 = await getRandomFox();
        let fox2;
        do {
            fox2 = await getRandomFox();
        } while (fox2.imageId === fox1.imageId);

        // Get top rated foxes
        const topFoxes = await Fox.find()
            .sort({ votes: -1 })
            .limit(10);

        res.render('index', {
            fox1,
            fox2,
            topFoxes
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).render('error', {
            message: 'Error loading foxes',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

module.exports = router; 