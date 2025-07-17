const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const db = require('./config/database');

// Routes
const whiteboardRoutes = require('./routes/whiteboards');
const userRoutes = require('./routes/users');
const navigationRoutes = require('./routes/navigation');

app.use('/api/whiteboards', whiteboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/navigation', navigationRoutes);

// Serve frontend routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/whiteboard/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/whiteboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app; 