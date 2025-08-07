const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireRole, requireOwnership, requireClassEnrollment } = require('../middleware/auth');

const router = express.Router();

// Get all assignments for current user
router.get('/', authenticateToken, async (req, res) => {
  console.log(`📋 [ASSIGNMENTS] GET / - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  
  try {
    let query;
    let params = [];

    if (req.user.role === 'teacher') {
      // Teachers see assignments they created
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
      params = [req.user.id];
    } else {
      // Students see assignments from classes they're enrolled in
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
      params = [req.user.id];
    }

    const result = await pool.query(query, params);
    
    const assignments = result.rows.map(row => ({
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
    }));

    console.log(`✅ [ASSIGNMENTS] GET / - Success: Found ${assignments.length} assignments`);
    res.json({ assignments });
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] GET / - Error:', error.message);
    res.status(500).json({ 
      error: 'Assignments fetch failed',
      message: 'An error occurred while fetching assignments'
    });
  }
});

// Get assignments for a specific class
router.get('/class/:classId', authenticateToken, requireClassEnrollment(), async (req, res) => {
  console.log(`📋 [ASSIGNMENTS] GET /class/${req.params.classId} - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  
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
          ass.id as submission_id, ass.submitted_at, ass.grade, ass.feedback
        FROM assignments a
        LEFT JOIN assignment_submissions ass ON a.id = ass.assignment_id AND ass.student_id = $2
        WHERE a.class_id = $1
        ORDER BY a.due_date ASC
      `;
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);
    
    const assignments = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
      priority: row.priority,
      topic: row.topic,
      submissionCount: row.submission_count,
      submissionId: row.submission_id,
      submittedAt: row.submitted_at,
      grade: row.grade,
      feedback: row.feedback,
      createdAt: row.created_at
    }));

    console.log(`✅ [ASSIGNMENTS] GET /class/${classId} - Success: Found ${assignments.length} assignments`);
    res.json({ assignments });
  } catch (error) {
    console.error('❌ [ASSIGNMENTS] GET /class/${classId} - Error:', error.message);
    res.status(500).json({ 
      error: 'Class assignments fetch failed',
      message: 'An error occurred while fetching class assignments'
    });
  }
});

// Get single assignment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  console.log(`📋 [ASSIGNMENTS] GET /${req.params.id} - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  
  try {
    const { id } = req.params;

    // Get assignment details
    const assignmentResult = await pool.query(`
      SELECT 
        a.id, a.title, a.description, a.due_date, a.priority, a.topic, a.created_at,
        c.name as class_name, c.id as class_id,
        u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
      console.log(`❌ [ASSIGNMENTS] GET /${id} - Assignment not found`);
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    const assignment = assignmentResult.rows[0];

    // Check if user has access to this assignment
    if (req.user.role === 'student') {
      const enrollmentResult = await pool.query(
        'SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
        [assignment.class_id, req.user.id]
      );

      if (enrollmentResult.rows.length === 0) {
        console.log(`❌ [ASSIGNMENTS] GET /${id} - Access denied: Student not enrolled in class`);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this assignment'
        });
      }
    } else if (req.user.role === 'teacher' && assignment.created_by !== req.user.id) {
      console.log(`❌ [ASSIGNMENTS] GET /${id} - Access denied: Teacher doesn't own assignment`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this assignment'
      });
    }

    // Get submissions
    let submissionsQuery;
    let submissionsParams = [id];

    if (req.user.role === 'teacher') {
      submissionsQuery = `
        SELECT 
          as.id, as.submission_text, as.file_url, as.submitted_at, as.grade, as.feedback,
          u.first_name, u.last_name, u.email
        FROM assignment_submissions as
        LEFT JOIN users u ON as.student_id = u.id
        WHERE as.assignment_id = $1
        ORDER BY as.submitted_at DESC
      `;
    } else {
      submissionsQuery = `
        SELECT 
          id, submission_text, file_url, submitted_at, grade, feedback
        FROM assignment_submissions
        WHERE assignment_id = $1 AND student_id = $2
      `;
      submissionsParams.push(req.user.id);
    }

    const submissionsResult = await pool.query(submissionsQuery, submissionsParams);

    // Get attachments for this assignment
    const attachmentsResult = await pool.query(`
      SELECT id, file_name, file_url, file_size, file_type, uploaded_at
      FROM assignment_attachments
      WHERE assignment_id = $1
      ORDER BY uploaded_at ASC
    `, [id]);

    // Get assigned students for this assignment
    const assignedStudentsResult = await pool.query(`
      SELECT student_id
      FROM assignment_student_assignments
      WHERE assignment_id = $1
    `, [id]);

    const responseData = {
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.due_date ? new Date(assignment.due_date).toISOString() : null,
        priority: assignment.priority,
        topic: assignment.topic,
        className: assignment.class_name,
        classId: assignment.class_id,
        createdBy: {
          firstName: assignment.created_by_first_name,
          lastName: assignment.created_by_last_name
        },
        attachments: attachmentsResult.rows.map(attachment => ({
          id: attachment.id,
          name: attachment.file_name,
          url: attachment.file_url,
          size: attachment.file_size,
          type: attachment.file_type,
          uploadedAt: attachment.uploaded_at
        })),
        assignedStudents: assignedStudentsResult.rows.map(row => row.student_id),
        submissions: submissionsResult.rows.map(submission => ({
          id: submission.id,
          submissionText: submission.submission_text,
          fileUrl: submission.file_url,
          submittedAt: submission.submitted_at,
          grade: submission.grade,
          feedback: submission.feedback,
          student: submission.first_name ? {
            firstName: submission.first_name,
            lastName: submission.last_name,
            email: submission.email
          } : null
        })),
        createdAt: assignment.created_at
      }
    };

    console.log(`✅ [ASSIGNMENTS] GET /${id} - Success: Assignment "${assignment.title}" with ${attachmentsResult.rows.length} attachments, ${assignedStudentsResult.rows.length} assigned students, ${submissionsResult.rows.length} submissions`);
    res.json(responseData);
  } catch (error) {
    console.error(`❌ [ASSIGNMENTS] GET /${req.params.id} - Error:`, error.message);
    res.status(500).json({ 
      error: 'Assignment fetch failed',
      message: 'An error occurred while fetching assignment details'
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
  console.log(`📝 [ASSIGNMENTS] POST / - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  console.log(`📝 [ASSIGNMENTS] POST / - Request body:`, {
    title: req.body.title,
    classId: req.body.classId,
    dueDate: req.body.dueDate,
    dueDateType: typeof req.body.dueDate,
    priority: req.body.priority,
    topic: req.body.topic,
    assignedStudentsCount: req.body.assignedStudents?.length || 0
  });
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`❌ [ASSIGNMENTS] POST / - Validation failed:`, errors.array());
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
      console.log(`❌ [ASSIGNMENTS] POST / - Access denied: Teacher doesn't own class ${classId}`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only create assignments for classes you teach'
      });
    }

    // Start a transaction
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

      // Assign students if provided
      if (assignedStudents && assignedStudents.length > 0) {
        console.log(`📝 [ASSIGNMENTS] POST / - Assigning ${assignedStudents.length} students to assignment`);
        
        // Verify all students are enrolled in the class
        const enrolledStudents = await client.query(
          `SELECT student_id FROM class_enrollments WHERE class_id = $1 AND student_id = ANY($2)`,
          [classId, assignedStudents]
        );

        if (enrolledStudents.rows.length !== assignedStudents.length) {
          console.log(`❌ [ASSIGNMENTS] POST / - Error: Some students are not enrolled in class ${classId}`);
          throw new Error('Some students are not enrolled in this class');
        }

        // Insert student assignments
        for (const studentId of assignedStudents) {
          await client.query(
            `INSERT INTO assignment_student_assignments (assignment_id, student_id)
             VALUES ($1, $2)`,
            [newAssignment.id, studentId]
          );
        }
        console.log(`✅ [ASSIGNMENTS] POST / - Successfully assigned ${assignedStudents.length} students`);
      }

      await client.query('COMMIT');

      console.log(`✅ [ASSIGNMENTS] POST / - Success: Created assignment "${newAssignment.title}" (ID: ${newAssignment.id})`);
      
      res.status(201).json({
        message: 'Assignment created successfully',
        assignment: {
          id: newAssignment.id,
          title: newAssignment.title,
          description: newAssignment.description,
          dueDate: newAssignment.due_date,
          priority: newAssignment.priority,
          topic: newAssignment.topic,
          createdAt: newAssignment.created_at
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ [ASSIGNMENTS] POST / - Error:`, error.message);
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
  console.log(`📝 [ASSIGNMENTS] PUT /${req.params.id} - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  console.log(`📝 [ASSIGNMENTS] PUT /${req.params.id} - Request body:`, {
    ...req.body,
    dueDateType: typeof req.body.dueDate
  });
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

    if (updateFields.length === 0) {
      console.log(`❌ [ASSIGNMENTS] PUT /${req.params.id} - No updates provided`);
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update the assignment
      const result = await client.query(
        `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = $${paramCount}
         RETURNING id, title, description, due_date, priority, topic, updated_at`,
        updateValues
      );

      if (result.rows.length === 0) {
        console.log(`❌ [ASSIGNMENTS] PUT /${req.params.id} - Assignment not found`);
        throw new Error('Assignment not found');
      }

      const updatedAssignment = result.rows[0];

      // Update student assignments if provided
      if (assignedStudents !== undefined) {
        console.log(`📝 [ASSIGNMENTS] PUT /${req.params.id} - Updating student assignments: ${assignedStudents.length} students`);
        
        // Remove existing assignments
        await client.query(
          'DELETE FROM assignment_student_assignments WHERE assignment_id = $1',
          [id]
        );

        // Add new assignments
        if (assignedStudents.length > 0) {
          // Verify all students are enrolled in the class
          const classResult = await client.query(
            'SELECT class_id FROM assignments WHERE id = $1',
            [id]
          );
          
          if (classResult.rows.length > 0) {
            const classId = classResult.rows[0].class_id;
            const enrolledStudents = await client.query(
              `SELECT student_id FROM class_enrollments WHERE class_id = $1 AND student_id = ANY($2)`,
              [classId, assignedStudents]
            );

            if (enrolledStudents.rows.length !== assignedStudents.length) {
              console.log(`❌ [ASSIGNMENTS] PUT /${req.params.id} - Error: Some students are not enrolled in class ${classId}`);
              throw new Error('Some students are not enrolled in this class');
            }

            // Insert new student assignments
            for (const studentId of assignedStudents) {
              await client.query(
                `INSERT INTO assignment_student_assignments (assignment_id, student_id)
                 VALUES ($1, $2)`,
                [id, studentId]
              );
            }
            console.log(`✅ [ASSIGNMENTS] PUT /${req.params.id} - Successfully updated student assignments`);
          }
        }
      }

      await client.query('COMMIT');

      console.log(`✅ [ASSIGNMENTS] PUT /${req.params.id} - Success: Updated assignment "${updatedAssignment.title}"`);
      
      res.json({
        message: 'Assignment updated successfully',
        assignment: {
          id: updatedAssignment.id,
          title: updatedAssignment.title,
          description: updatedAssignment.description,
          dueDate: updatedAssignment.due_date ? new Date(updatedAssignment.due_date).toISOString() : null,
          priority: updatedAssignment.priority,
          topic: updatedAssignment.topic,
          updatedAt: updatedAssignment.updated_at
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Assignment update error:', error);
    res.status(500).json({ 
      error: 'Assignment update failed',
      message: 'An error occurred while updating the assignment'
    });
  }
});

// Delete assignment (teacher who created it)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), async (req, res) => {
  console.log(`🗑️ [ASSIGNMENTS] DELETE /${req.params.id} - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM assignments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`❌ [ASSIGNMENTS] DELETE /${id} - Assignment not found`);
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    console.log(`✅ [ASSIGNMENTS] DELETE /${id} - Success: Assignment deleted`);
    res.json({
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error(`❌ [ASSIGNMENTS] DELETE /${req.params.id} - Error:`, error.message);
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

    const { id: assignmentId } = req.params;
    const { submissionText, fileUrl } = req.body;

    if (!submissionText && !fileUrl) {
      return res.status(400).json({ 
        error: 'Submission content required',
        message: 'Please provide either submission text or a file'
      });
    }

    // Check if student is enrolled in the class
    const enrollmentResult = await pool.query(`
      SELECT ce.id FROM class_enrollments ce
      INNER JOIN assignments a ON ce.class_id = a.class_id
      WHERE a.id = $1 AND ce.student_id = $2
    `, [assignmentId, req.user.id]);

    if (enrollmentResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You are not enrolled in the class for this assignment'
      });
    }

    // Check if already submitted
    const existingSubmission = await pool.query(
      'SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, req.user.id]
    );

    if (existingSubmission.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Already submitted',
        message: 'You have already submitted this assignment'
      });
    }

    // Create submission
    const result = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, submission_text, file_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, submitted_at`,
      [assignmentId, req.user.id, submissionText, fileUrl]
    );

    const submission = result.rows[0];

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission: {
        id: submission.id,
        submittedAt: submission.submitted_at
      }
    });
  } catch (error) {
    console.error('Assignment submission error:', error);
    res.status(500).json({ 
      error: 'Assignment submission failed',
      message: 'An error occurred while submitting the assignment'
    });
  }
});

// Grade assignment submission (teachers only)
router.put('/:id/grade/:submissionId', authenticateToken, requireRole(['teacher']), [
  body('grade').isFloat({ min: 0, max: 100 }),
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

    const { id: assignmentId, submissionId } = req.params;
    const { grade, feedback } = req.body;

    // Check if teacher owns the assignment
    const assignmentResult = await pool.query(
      'SELECT id FROM assignments WHERE id = $1 AND created_by = $2',
      [assignmentId, req.user.id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only grade assignments you created'
      });
    }

    // Update submission grade
    const result = await pool.query(
      `UPDATE assignment_submissions 
       SET grade = $1, feedback = $2, graded_by = $3, graded_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND assignment_id = $5
       RETURNING id, grade, feedback, graded_at`,
      [grade, feedback, req.user.id, submissionId, assignmentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Submission not found',
        message: 'The requested submission does not exist'
      });
    }

    const gradedSubmission = result.rows[0];

    res.json({
      message: 'Assignment graded successfully',
      submission: {
        id: gradedSubmission.id,
        grade: gradedSubmission.grade,
        feedback: gradedSubmission.feedback,
        gradedAt: gradedSubmission.graded_at
      }
    });
  } catch (error) {
    console.error('Assignment grading error:', error);
    res.status(500).json({ 
      error: 'Assignment grading failed',
      message: 'An error occurred while grading the assignment'
    });
  }
});

// Upload assignment attachment
router.post('/:id/attachments', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), [
  body('fileName').trim().isLength({ min: 1, max: 255 }),
  body('fileUrl').isURL(),
  body('fileSize').isInt({ min: 1 }),
  body('fileType').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  console.log(`📎 [ASSIGNMENTS] POST /${req.params.id}/attachments - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  console.log(`📎 [ASSIGNMENTS] POST /${req.params.id}/attachments - File: ${req.body.fileName} (${req.body.fileSize} bytes, ${req.body.fileType})`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: assignmentId } = req.params;
    const { fileName, fileUrl, fileSize, fileType } = req.body;

    const result = await pool.query(
      `INSERT INTO assignment_attachments (assignment_id, file_name, file_url, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, file_name, file_url, file_size, file_type, uploaded_at`,
      [assignmentId, fileName, fileUrl, fileSize, fileType]
    );

    const attachment = result.rows[0];

    console.log(`✅ [ASSIGNMENTS] POST /${req.params.id}/attachments - Success: Uploaded "${attachment.file_name}" (ID: ${attachment.id})`);
    
    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: {
        id: attachment.id,
        name: attachment.file_name,
        url: attachment.file_url,
        size: attachment.file_size,
        type: attachment.file_type,
        uploadedAt: attachment.uploaded_at
      }
    });
  } catch (error) {
    console.error(`❌ [ASSIGNMENTS] POST /${req.params.id}/attachments - Error:`, error.message);
    res.status(500).json({ 
      error: 'Attachment upload failed',
      message: 'An error occurred while uploading the attachment'
    });
  }
});

// Delete assignment attachment
router.delete('/:id/attachments/:attachmentId', authenticateToken, requireRole(['teacher']), requireOwnership('assignments', 'id', 'created_by'), async (req, res) => {
  console.log(`🗑️ [ASSIGNMENTS] DELETE /${req.params.id}/attachments/${req.params.attachmentId} - User: ${req.user.first_name} ${req.user.last_name} (${req.user.role})`);
  
  try {
    const { id: assignmentId, attachmentId } = req.params;

    const result = await pool.query(
      'DELETE FROM assignment_attachments WHERE id = $1 AND assignment_id = $2 RETURNING id',
      [attachmentId, assignmentId]
    );

    if (result.rows.length === 0) {
      console.log(`❌ [ASSIGNMENTS] DELETE /${assignmentId}/attachments/${attachmentId} - Attachment not found`);
      return res.status(404).json({ 
        error: 'Attachment not found',
        message: 'The requested attachment does not exist'
      });
    }

    console.log(`✅ [ASSIGNMENTS] DELETE /${assignmentId}/attachments/${attachmentId} - Success: Attachment deleted`);
    res.json({
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error(`❌ [ASSIGNMENTS] DELETE /${req.params.id}/attachments/${req.params.attachmentId} - Error:`, error.message);
    res.status(500).json({ 
      error: 'Attachment deletion failed',
      message: 'An error occurred while deleting the attachment'
    });
  }
});

module.exports = router; 