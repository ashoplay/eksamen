const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const Fox = require('./models/Fox');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Helper function to get random fox
async function getRandomFox() {
    try {
        const response = await axios.get(`${process.env.RANDOMFOX_API_URL}/floof/`);
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// View engine
app.set('view engine', 'ejs');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Vennligst logg inn' });
    }
    next();
};

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api', requireAuth, require('./routes/api'));

// Main route
app.get('/', async (req, res) => {
    try {
        // Get two random foxes
        const [fox1, fox2] = await Promise.all([
            getRandomFox(),
            getRandomFox()
        ]);

        // Make sure we have two different foxes
        if (fox1.imageId === fox2.imageId) {
            fox2 = await getRandomFox();
        }

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
        res.status(500).send('Server error');
    }
});

// Socket.IO connection
io.on('connection', socket => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
});

// Make io accessible to routes
app.set('io', io);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Connected to MongoDB');
    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Noe gikk galt!');
}); 