const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userController = {
    // User registration
    register: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            
            if (!username || !email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Username, email, and password are required'
                });
            }
            
            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 OR username = $2',
                [email, username]
            );
            
            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists'
                });
            }
            
            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            
            // Create user
            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
                [username, email, passwordHash]
            );
            
            // Generate JWT token
            const token = jwt.sign(
                { userId: result.rows[0].id, email: result.rows[0].email },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );
            
            res.status(201).json({
                success: true,
                data: {
                    user: result.rows[0],
                    token
                }
            });
        } catch (error) {
            console.error('Error registering user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to register user'
            });
        }
    },

    // User login
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: 'Email and password are required'
                });
            }
            
            // Find user
            const result = await pool.query(
                'SELECT id, username, email, password_hash FROM users WHERE email = $1',
                [email]
            );
            
            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            const user = result.rows[0];
            
            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
            }
            
            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Error logging in user:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to log in'
            });
        }
    },

    // Get user profile
    getProfile: async (req, res) => {
        try {
            const userId = req.user?.userId || req.query.userId || 1;
            
            const result = await pool.query(
                'SELECT id, username, email, created_at FROM users WHERE id = $1',
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user profile'
            });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const userId = req.user?.userId || req.body.userId || 1;
            const { username, email } = req.body;
            
            const query = `
                UPDATE users 
                SET username = COALESCE($1, username),
                    email = COALESCE($2, email),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING id, username, email, created_at
            `;
            
            const result = await pool.query(query, [username, email, userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error updating user profile:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update user profile'
            });
        }
    },

    // Get all users (for collaboration)
    getAllUsers: async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT id, username, email FROM users ORDER BY username'
            );
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch users'
            });
        }
    }
};

module.exports = userController; 