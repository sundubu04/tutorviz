const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('User API Tests', () => {
    let testUserId;
    let authToken;

    beforeAll(async () => {
        // Clean up test data
        await pool.query('DELETE FROM users WHERE email LIKE \'%test%\'');
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('POST /api/users/register', () => {
        test('should register a new user', async () => {
            const userData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(userData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.username).toBe(userData.username);
            expect(response.body.data.user.email).toBe(userData.email);
            expect(response.body.data.token).toBeDefined();
            
            testUserId = response.body.data.user.id;
            authToken = response.body.data.token;
        });

        test('should reject registration with missing fields', async () => {
            const userData = {
                username: 'testuser2',
                email: 'test2@example.com'
                // Missing password
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Username, email, and password are required');
        });

        test('should reject duplicate email registration', async () => {
            const userData = {
                username: 'testuser3',
                email: 'test@example.com', // Already exists
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('User already exists');
        });

        test('should reject duplicate username registration', async () => {
            const userData = {
                username: 'testuser', // Already exists
                email: 'test3@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/register')
                .send(userData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('User already exists');
        });
    });

    describe('POST /api/users/login', () => {
        test('should login with valid credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe(loginData.email);
            expect(response.body.data.token).toBeDefined();
        });

        test('should reject login with invalid email', async () => {
            const loginData = {
                email: 'nonexistent@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });

        test('should reject login with invalid password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData);

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });

        test('should reject login with missing fields', async () => {
            const loginData = {
                email: 'test@example.com'
                // Missing password
            };

            const response = await request(app)
                .post('/api/users/login')
                .send(loginData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Email and password are required');
        });
    });

    describe('GET /api/users/profile', () => {
        test('should return user profile by userId query param', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .query({ userId: testUserId });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testUserId);
            expect(response.body.data.email).toBe('test@example.com');
        });

        test('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .query({ userId: 99999 });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('User not found');
        });
    });

    describe('PUT /api/users/profile', () => {
        test('should update user profile', async () => {
            const updateData = {
                username: 'updatedtestuser',
                email: 'updatedtest@example.com',
                userId: testUserId
            };

            const response = await request(app)
                .put('/api/users/profile')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe(updateData.username);
            expect(response.body.data.email).toBe(updateData.email);
        });

        test('should update only provided fields', async () => {
            const updateData = {
                username: 'partialupdate',
                userId: testUserId
                // Only updating username, not email
            };

            const response = await request(app)
                .put('/api/users/profile')
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.username).toBe(updateData.username);
            // Email should remain unchanged
            expect(response.body.data.email).toBe('updatedtest@example.com');
        });

        test('should return 404 for non-existent user', async () => {
            const updateData = {
                username: 'nonexistent',
                userId: 99999
            };

            const response = await request(app)
                .put('/api/users/profile')
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('User not found');
        });
    });

    describe('GET /api/users', () => {
        test('should return all users', async () => {
            const response = await request(app)
                .get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('should return users with correct structure', async () => {
            const response = await request(app)
                .get('/api/users');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            const users = response.body.data;
            users.forEach(user => {
                expect(user).toHaveProperty('id');
                expect(user).toHaveProperty('username');
                expect(user).toHaveProperty('email');
                expect(user).not.toHaveProperty('password_hash'); // Should not expose password
            });
        });
    });
}); 