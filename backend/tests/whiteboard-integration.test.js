const request = require('supertest');
const app = require('../server');
const pool = require('../config/database');

describe('Whiteboard Integration Tests', () => {
    let testUserId;
    let testWhiteboardId;
    let authToken;

    beforeAll(async () => {
        // Clean test database
        await testUtils.cleanDatabase(pool);
        
        // Create test user
        const userData = testUtils.createTestUser();
        const registerResponse = await request(app)
            .post('/api/users/register')
            .send(userData);
        
        testUserId = registerResponse.body.data.user.id;
        authToken = registerResponse.body.data.token;
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('Complete Whiteboard Workflow', () => {
        test('should create, edit, and save whiteboard content', async () => {
            // Step 1: Create a new whiteboard
            const whiteboardData = {
                title: 'Integration Test Whiteboard',
                description: 'Testing complete workflow',
                ownerId: testUserId
            };

            const createResponse = await request(app)
                .post('/api/whiteboards')
                .send(whiteboardData);

            expect(createResponse.status).toBe(201);
            expect(createResponse.body.success).toBe(true);
            testWhiteboardId = createResponse.body.data.id;

            // Step 2: Load the whiteboard
            const loadResponse = await request(app)
                .get(`/api/whiteboards/${testWhiteboardId}`)
                .query({ userId: testUserId });

            expect(loadResponse.status).toBe(200);
            expect(loadResponse.body.data.id).toBe(testWhiteboardId);
            expect(loadResponse.body.data.title).toBe(whiteboardData.title);

            // Step 3: Update whiteboard content with various elements
            const contentData = {
                content: {
                    elements: [
                        {
                            id: '1',
                            type: 'sticky',
                            content: 'Test sticky note',
                            position: { x: 100, y: 100 },
                            color: 'yellow'
                        },
                        {
                            id: '2',
                            type: 'text',
                            content: 'Test text element',
                            position: { x: 200, y: 150 }
                        },
                        {
                            id: '3',
                            type: 'shape',
                            position: { x: 300, y: 200 }
                        }
                    ]
                },
                userId: testUserId
            };

            const updateResponse = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(contentData);

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.success).toBe(true);
            expect(updateResponse.body.data.content.elements).toHaveLength(3);

            // Step 4: Verify content was saved correctly
            const verifyResponse = await request(app)
                .get(`/api/whiteboards/${testWhiteboardId}`)
                .query({ userId: testUserId });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.data.content.elements).toHaveLength(3);
            expect(verifyResponse.body.data.content.elements[0].type).toBe('sticky');
            expect(verifyResponse.body.data.content.elements[1].type).toBe('text');
            expect(verifyResponse.body.data.content.elements[2].type).toBe('shape');
        });

        test('should handle multiple content updates', async () => {
            // First update
            const content1 = {
                content: {
                    elements: [
                        {
                            id: '1',
                            type: 'sticky',
                            content: 'First update',
                            position: { x: 50, y: 50 },
                            color: 'blue'
                        }
                    ]
                },
                userId: testUserId
            };

            await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(content1);

            // Second update
            const content2 = {
                content: {
                    elements: [
                        {
                            id: '1',
                            type: 'sticky',
                            content: 'Second update',
                            position: { x: 100, y: 100 },
                            color: 'green'
                        },
                        {
                            id: '2',
                            type: 'text',
                            content: 'New text element',
                            position: { x: 200, y: 200 }
                        }
                    ]
                },
                userId: testUserId
            };

            const response = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(content2);

            expect(response.status).toBe(200);
            expect(response.body.data.content.elements).toHaveLength(2);
            expect(response.body.data.content.elements[0].content).toBe('Second update');
            expect(response.body.data.content.elements[1].type).toBe('text');
        });

        test('should handle whiteboard sharing', async () => {
            // Create another user
            const collaboratorData = testUtils.createTestUser();
            const collaboratorResponse = await request(app)
                .post('/api/users/register')
                .send(collaboratorData);

            const collaboratorId = collaboratorResponse.body.data.user.id;

            // Share whiteboard
            const shareData = {
                email: collaboratorData.email,
                permissionLevel: 'edit',
                userId: testUserId
            };

            const shareResponse = await request(app)
                .post(`/api/whiteboards/${testWhiteboardId}/share`)
                .send(shareData);

            expect(shareResponse.status).toBe(200);
            expect(shareResponse.body.success).toBe(true);

            // Verify collaborator can access whiteboard
            const accessResponse = await request(app)
                .get(`/api/whiteboards/${testWhiteboardId}`)
                .query({ userId: collaboratorId });

            expect(accessResponse.status).toBe(200);
            expect(accessResponse.body.success).toBe(true);

            // Verify collaborator can update content
            const updateData = {
                content: {
                    elements: [
                        {
                            id: '1',
                            type: 'sticky',
                            content: 'Collaborator update',
                            position: { x: 150, y: 150 },
                            color: 'red'
                        }
                    ]
                },
                userId: collaboratorId
            };

            const updateResponse = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(updateData);

            expect(updateResponse.status).toBe(200);
            expect(updateResponse.body.success).toBe(true);
        });

        test('should handle concurrent updates', async () => {
            // Simulate concurrent updates
            const updatePromises = [];
            
            for (let i = 0; i < 3; i++) {
                const content = {
                    content: {
                        elements: [
                            {
                                id: '1',
                                type: 'sticky',
                                content: `Concurrent update ${i + 1}`,
                                position: { x: 100 + i * 50, y: 100 + i * 50 },
                                color: 'yellow'
                            }
                        ]
                    },
                    userId: testUserId
                };

                updatePromises.push(
                    request(app)
                        .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                        .send(content)
                );
            }

            const responses = await Promise.all(updatePromises);
            
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            // Verify final state
            const finalResponse = await request(app)
                .get(`/api/whiteboards/${testWhiteboardId}`)
                .query({ userId: testUserId });

            expect(finalResponse.status).toBe(200);
            expect(finalResponse.body.data.content.elements).toHaveLength(1);
        });

        test('should handle large content updates', async () => {
            // Create large content with many elements
            const largeContent = {
                content: {
                    elements: []
                },
                userId: testUserId
            };

            // Add 50 elements
            for (let i = 0; i < 50; i++) {
                largeContent.content.elements.push({
                    id: `element_${i}`,
                    type: i % 3 === 0 ? 'sticky' : i % 3 === 1 ? 'text' : 'shape',
                    content: i % 3 === 0 ? `Sticky note ${i}` : i % 3 === 1 ? `Text ${i}` : '',
                    position: { x: (i * 20) % 1000, y: Math.floor(i / 10) * 100 },
                    color: i % 3 === 0 ? ['yellow', 'blue', 'green', 'red', 'purple'][i % 5] : undefined
                });
            }

            const response = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(largeContent);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content.elements).toHaveLength(50);

            // Verify all elements are saved correctly
            const verifyResponse = await request(app)
                .get(`/api/whiteboards/${testWhiteboardId}`)
                .query({ userId: testUserId });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.body.data.content.elements).toHaveLength(50);
            
            // Check that elements have correct types
            const stickyCount = verifyResponse.body.data.content.elements.filter(e => e.type === 'sticky').length;
            const textCount = verifyResponse.body.data.content.elements.filter(e => e.type === 'text').length;
            const shapeCount = verifyResponse.body.data.content.elements.filter(e => e.type === 'shape').length;
            
            expect(stickyCount).toBeGreaterThan(0);
            expect(textCount).toBeGreaterThan(0);
            expect(shapeCount).toBeGreaterThan(0);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid whiteboard ID', async () => {
            const response = await request(app)
                .get('/api/whiteboards/99999')
                .query({ userId: testUserId });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Whiteboard not found');
        });

        test('should handle invalid content format', async () => {
            const invalidContent = {
                content: 'invalid content format',
                userId: testUserId
            };

            const response = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(invalidContent);

            expect(response.status).toBe(200); // Should still accept but may not work as expected
        });

        test('should handle empty content updates', async () => {
            const emptyContent = {
                content: { elements: [] },
                userId: testUserId
            };

            const response = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(emptyContent);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content.elements).toHaveLength(0);
        });

        test('should handle malformed element data', async () => {
            const malformedContent = {
                content: {
                    elements: [
                        {
                            id: '1',
                            type: 'sticky',
                            // Missing required fields
                        },
                        {
                            id: '2',
                            type: 'invalid_type',
                            content: 'test',
                            position: { x: 100, y: 100 }
                        }
                    ]
                },
                userId: testUserId
            };

            const response = await request(app)
                .patch(`/api/whiteboards/${testWhiteboardId}/content`)
                .send(malformedContent);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
}); 