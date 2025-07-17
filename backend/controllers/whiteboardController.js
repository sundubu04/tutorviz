const pool = require('../config/database');

const whiteboardController = {
    // Get all whiteboards for a user
    getAllWhiteboards: async (req, res) => {
        try {
            console.log('getAllWhiteboards called');
            const userId = parseInt(req.query.userId) || 1; // Default to demo user for now
            console.log('userId:', userId);
            
            const query = `
                SELECT w.*, u.username as owner_name
                FROM whiteboards w
                LEFT JOIN users u ON w.owner_id = u.id
                WHERE w.owner_id = $1 OR w.is_public = true
                ORDER BY w.updated_at DESC
            `;
            
            console.log('About to execute query with params:', [userId]);
            const result = await pool.query(query, [userId]);
            console.log('Query executed successfully, rows:', result.rows.length);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error fetching whiteboards:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch whiteboards'
            });
        }
    },

    // Get a specific whiteboard by ID
    getWhiteboardById: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = parseInt(req.query.userId) || 1;
            
            const query = `
                SELECT w.*, u.username as owner_name
                FROM whiteboards w
                LEFT JOIN users u ON w.owner_id = u.id
                WHERE w.id = $1 AND (w.owner_id = $2 OR w.is_public = true)
            `;
            
            const result = await pool.query(query, [id, userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Whiteboard not found'
                });
            }
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error fetching whiteboard:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch whiteboard'
            });
        }
    },

    // Create a new whiteboard
    createWhiteboard: async (req, res) => {
        try {
            const { title, description, isPublic = false } = req.body;
            const ownerId = parseInt(req.body.ownerId) || 1; // Default to demo user
            
            if (!title) {
                return res.status(400).json({
                    success: false,
                    error: 'Title is required'
                });
            }
            
            const query = `
                INSERT INTO whiteboards (title, description, owner_id, is_public, content)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            
            const result = await pool.query(query, [
                title,
                description,
                ownerId,
                isPublic,
                JSON.stringify({ elements: [] })
            ]);
            
            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error creating whiteboard:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create whiteboard'
            });
        }
    },

    // Update a whiteboard
    updateWhiteboard: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, isPublic } = req.body;
            const userId = parseInt(req.body.userId) || 1;
            
            // Check if user owns the whiteboard
            const ownershipQuery = `
                SELECT owner_id FROM whiteboards WHERE id = $1
            `;
            const ownershipResult = await pool.query(ownershipQuery, [id]);
            
            if (ownershipResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Whiteboard not found'
                });
            }
            
            if (ownershipResult.rows[0].owner_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to update this whiteboard'
                });
            }
            
            const query = `
                UPDATE whiteboards 
                SET title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    is_public = COALESCE($3, is_public),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            
            const result = await pool.query(query, [title, description, isPublic, id]);
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error updating whiteboard:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update whiteboard'
            });
        }
    },

    // Delete a whiteboard
    deleteWhiteboard: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = parseInt(req.body.userId) || 1;
            
            // Check if user owns the whiteboard
            const ownershipQuery = `
                SELECT owner_id FROM whiteboards WHERE id = $1
            `;
            const ownershipResult = await pool.query(ownershipQuery, [id]);
            
            if (ownershipResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Whiteboard not found'
                });
            }
            
            if (ownershipResult.rows[0].owner_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to delete this whiteboard'
                });
            }
            
            await pool.query('DELETE FROM whiteboards WHERE id = $1', [id]);
            
            res.json({
                success: true,
                message: 'Whiteboard deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting whiteboard:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete whiteboard'
            });
        }
    },

    // Update whiteboard content
    updateWhiteboardContent: async (req, res) => {
        try {
            const { id } = req.params;
            const { content } = req.body;
            const userId = req.body.userId || 1;
            
            // Check if user has access to the whiteboard
            const accessQuery = `
                SELECT owner_id, is_public FROM whiteboards WHERE id = $1
            `;
            const accessResult = await pool.query(accessQuery, [id]);
            
            if (accessResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Whiteboard not found'
                });
            }
            
            const whiteboard = accessResult.rows[0];
            if (whiteboard.owner_id !== userId && !whiteboard.is_public) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to update this whiteboard'
                });
            }
            
            const query = `
                UPDATE whiteboards 
                SET content = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            
            const result = await pool.query(query, [JSON.stringify(content), id]);
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Error updating whiteboard content:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update whiteboard content'
            });
        }
    },

    // Share whiteboard
    shareWhiteboard: async (req, res) => {
        try {
            const { id } = req.params;
            const { email, permissionLevel = 'view' } = req.body;
            const userId = req.body.userId || 1;
            
            // Check if user owns the whiteboard
            const ownershipQuery = `
                SELECT owner_id FROM whiteboards WHERE id = $1
            `;
            const ownershipResult = await pool.query(ownershipQuery, [id]);
            
            if (ownershipResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Whiteboard not found'
                });
            }
            
            if (ownershipResult.rows[0].owner_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Not authorized to share this whiteboard'
                });
            }
            
            // Find user by email
            const userQuery = `SELECT id FROM users WHERE email = $1`;
            const userResult = await pool.query(userQuery, [email]);
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            const collaboratorId = userResult.rows[0].id;
            
            // Add collaborator
            const shareQuery = `
                INSERT INTO whiteboard_collaborators (whiteboard_id, user_id, permission_level)
                VALUES ($1, $2, $3)
                ON CONFLICT (whiteboard_id, user_id) 
                DO UPDATE SET permission_level = $3
            `;
            
            await pool.query(shareQuery, [id, collaboratorId, permissionLevel]);
            
            res.json({
                success: true,
                message: 'Whiteboard shared successfully'
            });
        } catch (error) {
            console.error('Error sharing whiteboard:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to share whiteboard'
            });
        }
    },

    // Get whiteboard collaborators
    getCollaborators: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT u.username, u.email, wc.permission_level
                FROM whiteboard_collaborators wc
                JOIN users u ON wc.user_id = u.id
                WHERE wc.whiteboard_id = $1
            `;
            
            const result = await pool.query(query, [id]);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Error fetching collaborators:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch collaborators'
            });
        }
    }
};

module.exports = whiteboardController; 