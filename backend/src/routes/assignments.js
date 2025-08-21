const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireRole, requireOwnership, requireClassEnrollment } = require('../middleware/auth');

const router = express.Router();

// Test endpoint to verify database connection
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('Database connection test successful:', result.rows[0]);
    
    // Check if assignments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'assignments'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log('Assignments table exists:', tableExists);
    
    if (tableExists) {
      // Check table structure
      const structureCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'assignments' 
        ORDER BY ordinal_position
      `);
      console.log('Table structure:', structureCheck.rows);
    }
    
    res.json({ 
      message: 'Database test successful',
      currentTime: result.rows[0].current_time,
      assignmentsTableExists: tableExists
    });
  } catch (error) {
    console.error('Database test failed:', error);
    res.status(500).json({ 
      error: 'Database test failed',
      message: error.message
    });
  }
});

// Helper function to map database row to assignment object
const mapAssignmentRow = (row) => {
  console.log('Mapping database row:', row);
  
  const mapped = {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    priority: row.priority,
    topic: row.topic,
    className: row.class_name,
    classId: row.class_id,
    submissionCount: row.submission_count,
    submissionId: row.submission_id,
    submittedAt: row.submitted_at,
    grade: row.grade,
    createdAt: row.created_at
  };
  
  console.log('Mapped result:', mapped);
  return mapped;
};

// Helper function to create calendar event for assignment
const createCalendarEvent = async (client, assignment, classId, userId) => {
  try {
    console.log('Creating calendar event for assignment:', { assignment, classId, userId });
    
    const result = await client.query(
      `INSERT INTO calendar_events (title, description, start_time, end_time, event_type, class_id, is_all_day, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        assignment.title,
        assignment.description || `Assignment due for ${assignment.title}`,
        assignment.due_date, // Use the database column name
        new Date(new Date(assignment.due_date).getTime() + 24 * 60 * 60 * 1000),
        'assignment',
        classId,
        true,
        userId
      ]
    );
    console.log('Calendar event created successfully:', result.rows[0]);
    return result.rows[0].id;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    // Don't throw error, just return null to indicate failure
    return null;
  }
};

// Helper function to update calendar event for assignment
const updateCalendarEvent = async (client, assignment, classId, eventId) => {
  try {
    console.log('Updating calendar event with data:', { assignment, classId, eventId });
    
    await client.query(
      `UPDATE calendar_events 
       SET title = $1, description = $2, start_time = $3, end_time = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        assignment.title,
        assignment.description || `Assignment due for ${assignment.title}`,
        assignment.due_date, // Use the database column name
        new Date(new Date(assignment.due_date).getTime() + 24 * 60 * 60 * 1000),
        eventId
      ]
    );
    console.log('Calendar event updated successfully');
    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return false;
  }
};

// Helper function to handle student assignments
const handleStudentAssignments = async (client, assignmentId, classId, assignedStudents) => {
  if (!assignedStudents || assignedStudents.length === 0) return;

  // Verify all students are enrolled in the class
  const enrolledStudents = await client.query(
    `SELECT student_id FROM class_enrollments WHERE class_id = $1 AND student_id = ANY($2)`,
    [classId, assignedStudents]
  );

  if (enrolledStudents.rows.length !== assignedStudents.length) {
    throw new Error('Some students are not enrolled in this class');
  }

  // Remove existing assignments
  await client.query(
    'DELETE FROM assignment_student_assignments WHERE assignment_id = $1',
    [assignmentId]
  );

  // Insert new assignments
  for (const studentId of assignedStudents) {
    await client.query(
      `INSERT INTO assignment_student_assignments (assignment_id, student_id)
       VALUES ($1, $2)`,
      [assignmentId, studentId]
    );
  }
};

// Get all assignments for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [req.user.id];

    if (req.user.role === 'teacher') {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          c.name as class_name, c.id as class_id,
          COUNT(ass.id) as submission_count
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id
        WHERE a.created_by = $1
        GROUP BY a.id, c.name, c.id
        ORDER BY a.due_date ASC
      `;
    } else {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          c.name as class_name, c.id as class_id,
          ass.id as submission_id, ass.submitted_at, ass.grade
        FROM assignments a
        INNER JOIN classes c ON a.class_id = c.id
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id AND ass.student_id = $1
        WHERE ce.student_id = $1
        ORDER BY a.due_date ASC
      `;
    }

    const result = await pool.query(query, params);
    const assignments = result.rows.map(mapAssignmentRow);
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      error: 'Assignments fetch failed',
      message: 'An error occurred while fetching assignments'
    });
  }
});

// Get assignments for a specific class
router.get('/class/:classId', authenticateToken, requireClassEnrollment(), async (req, res) => {
  try {
    const { classId } = req.params;
    let query;
    let params = [classId];

    if (req.user.role === 'teacher') {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          COUNT(ass.id) as submission_count
        FROM assignments a
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id
        WHERE a.class_id = $1
        GROUP BY a.id
        ORDER BY a.due_date ASC
      `;
    } else {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          ass.id as submission_id, ass.submitted_at, ass.grade
        FROM assignments a
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id AND ass.student_id = $1
        INNER JOIN class_enrollments ce ON a.class_id = ce.class_id
        WHERE a.class_id = $1 AND ce.student_id = $1
        ORDER BY a.due_date ASC
      `;
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    const assignments = result.rows.map(mapAssignmentRow);
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching class assignments:', error);
    res.status(500).json({ 
      error: 'Class assignments fetch failed',
      message: 'An error occurred while fetching class assignments'
    });
  }
});

// Get single assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let query;
    let params = [id];

    if (req.user.role === 'teacher') {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          c.name as class_name, c.id as class_id,
          COUNT(ass.id) as submission_count
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id
        WHERE a.id = $1
        GROUP BY a.id, c.name, c.id
      `;
    } else {
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
          c.name as class_name, c.id as class_id,
          ass.id as submission_id, ass.submitted_at, ass.grade
        FROM assignments a
        INNER JOIN classes c ON a.class_id = c.id
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id AND ass.student_id = $1
        WHERE a.id = $1 AND ce.student_id = $1
      `;
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    const assignment = mapAssignmentRow(result.rows[0]);
    res.json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ 
      error: 'Assignment fetch failed',
      message: 'An error occurred while fetching the assignment'
    });
  }
});

// Create new assignment (teachers only)
router.post('/', authenticateToken, requireRole(['teacher']), [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('classId').isUUID(),
  body('dueDate').isISO8601(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('topic').optional().trim().isLength({ max: 255 }),
  body('assignedStudents').optional().isArray(),
  body('assignedStudents.*').optional().isUUID()
], async (req, res) => {
  try {
    console.log('Creating assignment with data:', req.body);
    console.log('User making request:', { 
      id: req.user.id, 
      role: req.user.role, 
      firstName: req.user.first_name,
      lastName: req.user.last_name
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, classId, dueDate, priority, topic, assignedStudents } = req.body;

    // Check if teacher owns the class
    const classResult = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [classId, req.user.id]
    );

    if (classResult.rows.length === 0) {
      console.log('Access denied: Teacher does not own class');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only create assignments for classes you teach'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the assignment
      const result = await client.query(
        `INSERT INTO assignments (title, description, class_id, due_date, priority, topic, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, title, description, due_date, priority, topic, created_at`,
        [title, description, classId, dueDate, priority || 'normal', topic, req.user.id]
      );

      const newAssignment = result.rows[0];
      console.log('Assignment created:', newAssignment);

      // Handle student assignments
      await handleStudentAssignments(client, newAssignment.id, classId, assignedStudents);

      // Create calendar event
      const calendarEventId = await createCalendarEvent(client, newAssignment, classId, req.user.id);
      console.log('Calendar event created with ID:', calendarEventId);

      await client.query('COMMIT');

      const responseAssignment = mapAssignmentRow(newAssignment);
      console.log('Sending response:', responseAssignment);

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment: responseAssignment
      });
    } catch (error) {
      console.error('Error in transaction:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ 
      error: 'Assignment creation failed',
      message: 'An error occurred while creating the assignment'
    });
  }
});

// Update assignment (teacher who created it)
router.put('/:id', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), [
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('topic').optional().trim().isLength({ max: 255 }),
  body('assignedStudents').optional().isArray(),
  body('assignedStudents.*').optional().isUUID()
], async (req, res) => {
  try {
    console.log('Updating assignment with data:', req.body);
    console.log('Assignment ID:', req.params.id);
    console.log('User making request:', { 
      id: req.user.id, 
      role: req.user.role, 
      firstName: req.user.first_name,
      lastName: req.user.last_name
    });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, dueDate, priority, topic, assignedStudents } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (title) {
      updateFields.push(`title = $${paramCount++}`);
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    if (dueDate) {
      updateFields.push(`due_date = $${paramCount++}`);
      updateValues.push(dueDate);
    }
    if (priority !== undefined) {
      updateFields.push(`priority = $${paramCount++}`);
      updateValues.push(priority);
    }
    if (topic !== undefined) {
      updateFields.push(`topic = $${paramCount++}`);
      updateValues.push(topic);
    }

    console.log('Update fields:', updateFields);
    console.log('Update values:', updateValues);
    console.log('Param count:', paramCount);

    if (updateFields.length === 0) {
      console.log('No updates provided');
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    // Add updated_at field
    updateFields.push(`updated_at = $${paramCount++}`);
    updateValues.push(new Date().toISOString());
    
    // Add the WHERE clause parameter (assignment ID)
    updateValues.push(id);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get the current assignment values before update
      const currentAssignment = await client.query(
        'SELECT id, title, description, due_date, priority, topic FROM assignments WHERE id = $1',
        [id]
      );
      
      if (currentAssignment.rows.length === 0) {
        throw new Error('Assignment not found');
      }
      
      console.log('Current assignment values:', currentAssignment.rows[0]);

      // Update the assignment
      const updateQuery = `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, title, description, due_date, priority, topic, updated_at`;
      console.log('Update query:', updateQuery);
      console.log('Update parameters:', updateValues);
      
      const result = await client.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        console.log('Assignment not found for update');
        throw new Error('Assignment not found');
      }

      const updatedAssignment = result.rows[0];
      console.log('Assignment updated successfully:', updatedAssignment);
      console.log('Changes made:');
      console.log('  Title:', currentAssignment.rows[0].title, '->', updatedAssignment.title);
      console.log('  Description:', currentAssignment.rows[0].description, '->', updatedAssignment.description);
      console.log('  Due Date:', currentAssignment.rows[0].due_date, '->', updatedAssignment.due_date);
      console.log('  Priority:', currentAssignment.rows[0].priority, '->', updatedAssignment.priority);
      console.log('  Topic:', currentAssignment.rows[0].topic, '->', updatedAssignment.topic);

      // Handle student assignments
      if (assignedStudents !== undefined) {
        const classResult = await client.query(
          'SELECT class_id FROM assignments WHERE id = $1',
          [id]
        );
        
        if (classResult.rows.length > 0) {
          const classId = classResult.rows[0].class_id;
          await handleStudentAssignments(client, id, classId, assignedStudents);
        }
      }

      // Update calendar event
      console.log('Looking for existing calendar event...');
      const existingEvent = await client.query(
        `SELECT id FROM calendar_events WHERE event_type = 'assignment' AND class_id = (
          SELECT class_id FROM assignments WHERE id = $1
        )`,
        [id]
      );
      
      console.log('Existing calendar event found:', existingEvent.rows);

      if (existingEvent.rows.length > 0) {
        console.log('Updating existing calendar event...');
        await updateCalendarEvent(client, updatedAssignment, null, existingEvent.rows[0].id);
      } else {
        console.log('Creating new calendar event...');
        const classResult = await client.query(
          'SELECT class_id FROM assignments WHERE id = $1',
          [id]
        );
        
        if (classResult.rows.length > 0) {
          const classId = classResult.rows[0].class_id;
          await createCalendarEvent(client, updatedAssignment, classId, req.user.id);
        }
      }

      await client.query('COMMIT');

      // Verify the update was actually committed to the database
      const verificationResult = await client.query(
        'SELECT id, title, description, due_date, priority, topic, updated_at FROM assignments WHERE id = $1',
        [id]
      );
      
      if (verificationResult.rows.length > 0) {
        console.log('Database verification - Final assignment values:', verificationResult.rows[0]);
      }

      const responseAssignment = mapAssignmentRow(updatedAssignment);
      console.log('Sending update response:', responseAssignment);

      res.json({
        message: 'Assignment updated successfully',
        assignment: responseAssignment
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ 
      error: 'Assignment update failed',
      message: 'An error occurred while updating the assignment'
    });
  }
});

// Delete assignment (teacher who created it)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get assignment info before deletion
      const assignmentResult = await client.query(
        'SELECT id, title, class_id FROM assignments WHERE id = $1',
        [id]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Assignment not found',
          message: 'The requested assignment does not exist'
        });
      }

      const assignment = assignmentResult.rows[0];

      // Delete the assignment
      await client.query('DELETE FROM assignments WHERE id = $1', [id]);

      // Delete corresponding calendar event
      await client.query(
        `DELETE FROM calendar_events 
         WHERE event_type = 'assignment' 
         AND title = $1 
         AND class_id = $2`,
        [assignment.title, assignment.class_id]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ 
      error: 'Assignment deletion failed',
      message: 'An error occurred while deleting the assignment'
    });
  }
});

// Submit assignment (students only)
router.post('/:id/submit', authenticateToken, requireRole(['student']), [
  body('submissionText').optional().trim(),
  body('fileUrl').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { submissionText, fileUrl } = req.body;

    // Check if student is enrolled in the class
    const enrollmentCheck = await pool.query(
      `SELECT 1 FROM class_enrollments ce
       INNER JOIN assignments a ON ce.class_id = a.class_id
       WHERE a.id = $1 AND ce.student_id = $2`,
      [id, req.user.id]
    );

    if (enrollmentCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only submit assignments for classes you are enrolled in'
      });
    }

    // Check if already submitted
    const existingSubmission = await pool.query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [id, req.user.id]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Already submitted',
        message: 'You have already submitted this assignment'
      });
    }

    // Create submission
    const result = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, submitted_at`,
      [id, req.user.id, submissionText, fileUrl]
    );

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission: {
        id: result.rows[0].id,
        submittedAt: result.rows[0].submitted_at
      }
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ 
      error: 'Assignment submission failed',
      message: 'An error occurred while submitting the assignment'
    });
  }
});

// Get assignment submissions (teachers only)
router.get('/:id/submissions', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        ass.id, ass.submission_text, ass.file_url, ass.submitted_at, ass.grade,
        u.first_name, u.last_name, u.email
       FROM assignment_submissions ass
       INNER JOIN users u ON ass.student_id = u.id
       WHERE ass.assignment_id = $1
       ORDER BY ass.submitted_at ASC`,
      [id]
    );

    const submissions = result.rows.map(row => ({
      id: row.id,
      submissionText: row.submission_text,
      fileUrl: row.file_url,
      submittedAt: row.submitted_at,
      grade: row.grade,
      student: {
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      }
    }));

    res.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ 
      error: 'Submissions fetch failed',
      message: 'An error occurred while fetching submissions'
    });
  }
});

// Grade assignment submission (teachers only)
router.put('/:id/grade/:submissionId', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), [
  body('grade').isFloat({ min: 0, max: 100 }).withMessage('Grade must be between 0 and 100'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id, submissionId } = req.params;
    const { grade, feedback } = req.body;

    // Verify submission belongs to this assignment
    const submissionCheck = await pool.query(
      'SELECT 1 FROM assignment_submissions WHERE id = $1 AND assignment_id = $2',
      [submissionId, id]
    );

    if (submissionCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Submission not found',
        message: 'The requested submission does not exist'
      });
    }

    // Update grade
    const result = await pool.query(
      `UPDATE assignment_submissions 
       SET grade = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, grade, feedback, updated_at`,
      [grade, feedback, submissionId]
    );

    res.json({
      message: 'Grade updated successfully',
      submission: {
        id: result.rows[0].id,
        grade: result.rows[0].grade,
        feedback: result.rows[0].feedback,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ 
      error: 'Grade update failed',
      message: 'An error occurred while updating the grade'
    });
  }
});

// Upload assignment attachment
router.post('/:id/attachments', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('url').isURL(),
  body('size').isInt({ min: 1 }),
  body('type').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { name, url, size, type } = req.body;

    const result = await pool.query(
      `INSERT INTO assignment_attachments (assignment_id, name, url, size, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, url, size, type, uploaded_at`,
      [id, name, url, size, type]
    );

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        url: result.rows[0].url,
        size: result.rows[0].size,
        type: result.rows[0].type,
        uploadedAt: result.rows[0].uploaded_at
      }
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ 
      error: 'Attachment upload failed',
      message: 'An error occurred while uploading the attachment'
    });
  }
});

module.exports = router;
