const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireRole, requireOwnership, requireClassEnrollment } = require('../middleware/auth');

const router = express.Router();

// Get all assignments for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query;
    let params = [];

    if (req.user.role === 'teacher') {
      // Teachers see assignments they created
      query = `
        SELECT 
          a.id, a.title, a.description, a.due_date, a.is_urgent, a.created_at,
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
          a.id, a.title, a.description, a.due_date, a.is_urgent, a.created_at,
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
      dueDate: row.due_date,
      isUrgent: row.is_urgent,
      className: row.class_name,
      classId: row.class_id,
      submissionCount: row.submission_count,
      submissionId: row.submission_id,
      submittedAt: row.submitted_at,
      grade: row.grade,
      createdAt: row.created_at
    }));

    res.json({ assignments });
  } catch (error) {
    console.error('Assignments fetch error:', error);
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
          a.id, a.title, a.description, a.due_date, a.is_urgent, a.created_at,
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
          a.id, a.title, a.description, a.due_date, a.is_urgent, a.created_at,
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
      dueDate: row.due_date,
      isUrgent: row.is_urgent,
      submissionCount: row.submission_count,
      submissionId: row.submission_id,
      submittedAt: row.submitted_at,
      grade: row.grade,
      feedback: row.feedback,
      createdAt: row.created_at
    }));

    res.json({ assignments });
  } catch (error) {
    console.error('Class assignments fetch error:', error);
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

    // Get assignment details
    const assignmentResult = await pool.query(`
      SELECT 
        a.id, a.title, a.description, a.due_date, a.is_urgent, a.created_at,
        c.name as class_name, c.id as class_id,
        u.first_name as created_by_first_name, u.last_name as created_by_last_name
      FROM assignments a
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = $1
    `, [id]);

    if (assignmentResult.rows.length === 0) {
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
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this assignment'
        });
      }
    } else if (req.user.role === 'teacher' && assignment.created_by !== req.user.id) {
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

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.due_date,
        isUrgent: assignment.is_urgent,
        className: assignment.class_name,
        classId: assignment.class_id,
        createdBy: {
          firstName: assignment.created_by_first_name,
          lastName: assignment.created_by_last_name
        },
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
    });
  } catch (error) {
    console.error('Assignment fetch error:', error);
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
  body('isUrgent').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, classId, dueDate, isUrgent } = req.body;

    // Check if teacher owns the class
    const classResult = await pool.query(
      'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
      [classId, req.user.id]
    );

    if (classResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only create assignments for classes you teach'
      });
    }

    const result = await pool.query(
      `INSERT INTO assignments (title, description, class_id, due_date, is_urgent, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, due_date, is_urgent, created_at`,
      [title, description, classId, dueDate, isUrgent || false, req.user.id]
    );

    const newAssignment = result.rows[0];

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: {
        id: newAssignment.id,
        title: newAssignment.title,
        description: newAssignment.description,
        dueDate: newAssignment.due_date,
        isUrgent: newAssignment.is_urgent,
        createdAt: newAssignment.created_at
      }
    });
  } catch (error) {
    console.error('Assignment creation error:', error);
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
  body('isUrgent').optional().isBoolean()
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
    const { title, description, dueDate, isUrgent } = req.body;

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

    if (isUrgent !== undefined) {
      updateFields.push(`is_urgent = $${paramCount++}`);
      updateValues.push(isUrgent);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided',
        message: 'Please provide at least one field to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await pool.query(
      `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, title, description, due_date, is_urgent, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    const updatedAssignment = result.rows[0];

    res.json({
      message: 'Assignment updated successfully',
      assignment: {
        id: updatedAssignment.id,
        title: updatedAssignment.title,
        description: updatedAssignment.description,
        dueDate: updatedAssignment.due_date,
        isUrgent: updatedAssignment.is_urgent,
        updatedAt: updatedAssignment.updated_at
      }
    });
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
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM assignments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    res.json({
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Assignment deletion error:', error);
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

module.exports = router; 