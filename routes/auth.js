const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Brukernavn og passord er påkrevd' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Brukernavn må være minst 3 tegn' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Passord må være minst 6 tegn' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Brukernavn er allerede i bruk' });
        }

        // Create new user
        const user = new User({ username, password });
        await user.save();

        // Set user session
        req.session.userId = user._id;
        req.session.username = user.username;

        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Ugyldig brukerdata' });
        }
        res.status(500).json({ error: 'Kunne ikke registrere bruker' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({ error: 'Brukernavn og passord er påkrevd' });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Feil brukernavn eller passord' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Feil brukernavn eller passord' });
        }

        // Set user session
        req.session.userId = user._id;
        req.session.username = user.username;

        res.json({ success: true, username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Kunne ikke logge inn' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Kunne ikke logge ut' });
        }
        res.json({ success: true });
    });
});

// Get current user
router.get('/user', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            isAuthenticated: true, 
            username: req.session.username 
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

module.exports = router; 