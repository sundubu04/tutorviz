const pool = require('../config/database');

const initDatabase = async () => {
    let poolInstance = null;
    
    try {
        console.log('🔧 Initializing database...');

        // Test connection first
        poolInstance = pool;
        await poolInstance.query('SELECT 1');
        console.log('✅ Database connection successful');

        // Create users table
        console.log('📋 Creating users table...');
        await poolInstance.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');

        // Create whiteboards table
        console.log('📋 Creating whiteboards table...');
        await poolInstance.query(`
            CREATE TABLE IF NOT EXISTS whiteboards (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                content JSONB DEFAULT '{}',
                owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Whiteboards table ready');

        // Create whiteboard_collaborators table
        console.log('📋 Creating whiteboard_collaborators table...');
        await poolInstance.query(`
            CREATE TABLE IF NOT EXISTS whiteboard_collaborators (
                id SERIAL PRIMARY KEY,
                whiteboard_id INTEGER REFERENCES whiteboards(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                permission_level VARCHAR(20) DEFAULT 'view',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(whiteboard_id, user_id)
            )
        `);
        console.log('✅ Whiteboard collaborators table ready');

        // Check if sample user already exists
        const existingUser = await poolInstance.query(
            'SELECT id FROM users WHERE email = $1',
            ['demo@tutoriai.com']
        );

        let userId = 1; // Default user ID

        if (existingUser.rows.length === 0) {
            console.log('👤 Creating sample user...');
            const sampleUser = await poolInstance.query(`
                INSERT INTO users (username, email, password_hash) 
                VALUES ($1, $2, $3) 
                RETURNING id
            `, ['demo_user', 'demo@tutoriai.com', '$2a$10$dummy.hash.for.demo']);
            
            userId = sampleUser.rows[0].id;
            console.log('✅ Sample user created');
        } else {
            userId = existingUser.rows[0].id;
            console.log('✅ Sample user already exists');
        }

        // Check if sample whiteboards already exist
        const existingWhiteboards = await poolInstance.query(
            'SELECT COUNT(*) as count FROM whiteboards WHERE owner_id = $1',
            [userId]
        );

        if (existingWhiteboards.rows[0].count === '0') {
            console.log('📝 Creating sample whiteboards...');
            
            // Insert sample whiteboards
            const sampleWhiteboards = [
                {
                    title: 'Team Meeting',
                    description: 'Agenda and notes for team meeting',
                    content: JSON.stringify({
                        elements: [
                            {
                                id: '1',
                                type: 'sticky',
                                content: 'Review Q4 goals',
                                position: { x: 100, y: 100 },
                                color: 'yellow'
                            },
                            {
                                id: '2',
                                type: 'sticky',
                                content: 'Plan next sprint',
                                position: { x: 300, y: 100 },
                                color: 'blue'
                            }
                        ]
                    })
                },
                {
                    title: 'Project Planning',
                    description: 'Project roadmap and milestones',
                    content: JSON.stringify({
                        elements: [
                            {
                                id: '1',
                                type: 'sticky',
                                content: 'Phase 1: Research',
                                position: { x: 50, y: 50 },
                                color: 'green'
                            },
                            {
                                id: '2',
                                type: 'sticky',
                                content: 'Phase 2: Development',
                                position: { x: 250, y: 50 },
                                color: 'red'
                            }
                        ]
                    })
                }
            ];

            for (const whiteboard of sampleWhiteboards) {
                await poolInstance.query(`
                    INSERT INTO whiteboards (title, description, content, owner_id) 
                    VALUES ($1, $2, $3, $4)
                `, [whiteboard.title, whiteboard.description, whiteboard.content, userId]);
            }
            
            console.log('✅ Sample whiteboards created');
        } else {
            console.log('✅ Sample whiteboards already exist');
        }

        console.log('🎉 Database initialized successfully!');
        console.log('📊 Sample data inserted.');

    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Make sure PostgreSQL is running and accessible');
        } else if (error.code === '28P01') {
            console.error('💡 Check your database credentials in .env file');
        } else if (error.code === '3D000') {
            console.error('💡 Database does not exist. Run setup script first.');
        }
        
        throw error;
    } finally {
        if (poolInstance) {
            await poolInstance.end();
        }
    }
};

// Run if called directly
if (require.main === module) {
    initDatabase()
        .then(() => {
            console.log('✅ Database setup complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Database setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = initDatabase; 