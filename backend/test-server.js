const express = require('express');
const pool = require('./config/database');

const app = express();
const PORT = 3002;

app.use(express.json());

app.get('/test', async (req, res) => {
    try {
        console.log('Test endpoint called');
        
        const userId = 1;
        const query = `
            SELECT w.*, u.username as owner_name
            FROM whiteboards w
            LEFT JOIN users u ON w.owner_id = u.id
            WHERE w.owner_id = $1 OR w.is_public = true
            ORDER BY w.updated_at DESC
        `;
        
        console.log('About to execute query');
        const result = await pool.query(query, [userId]);
        console.log('Query successful, rows:', result.rows.length);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error in test endpoint:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
}); 