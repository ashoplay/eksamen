const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Environment variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.NODE_ENV === 'production' 
    ? 'mongodb://10.12.90.11:27017/fox_rating'
    : 'mongodb://localhost:27017/fox_rating';

// Helper function to get random fox
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

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secure_session_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Models
const Fox = require('./models/Fox');
const Vote = require('./models/Vote');

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', async (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Handle requests for new foxes
    socket.on('requestNewFoxes', async () => {
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

            // Emit the new foxes and updated top list
            socket.emit('votesUpdated', {
                newFoxes: [fox1, fox2],
                topFoxes,
                mostVoted: topFoxes[0]
            });
        } catch (error) {
            console.error('Error getting new foxes:', error);
            socket.emit('error', { message: 'Could not get new foxes' });
        }
    });
});

// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 