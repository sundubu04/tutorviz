const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

// Get all classes (public access - for calendar event creation)
router.get('/', async (req, res) => {
  try {
    // If no authentication, return all classes (for calendar event creation)
    if (!req.headers.authorization) {
      const query = `
        SELECT 
          c.id, c.name, c.description, c.icon_name, c.icon_color, c.created_at,
          u.first_name as teacher_first_name, u.last_name as teacher_last_name,
          COUNT(DISTINCT ce.student_id) as student_count,
          COUNT(DISTINCT a.id) as assignment_count,
          'public' as type
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignments a ON c.id = a.class_id
        GROUP BY c.id, u.first_name, u.last_name
        ORDER BY c.name ASC
      `;
      
      const result = await pool.query(query);
      
      const classes = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        iconName: row.icon_name,
        iconColor: row.icon_color,
        teacherName: row.teacher_first_name && row.teacher_last_name 
          ? `${row.teacher_first_name} ${row.teacher_last_name}` 
          : 'No teacher assigned',
        studentCount: parseInt(row.student_count),
        assignmentCount: parseInt(row.assignment_count),
        type: row.type,
        createdAt: row.created_at
      }));

      return res.json({ classes });
    }

    // If authenticated, use the existing logic
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    

    
    let query;
    let params = [];

    // Extract userId and role from the decoded token
    const userId = req.user.userId;
    const userRole = req.user.role;
    

    
    if (userRole === 'teacher') {
      // Teachers see classes they teach
      query = `
        SELECT 
          c.id, c.name, c.description, c.icon_name, c.icon_color, c.created_at,
          u.first_name as teacher_first_name, u.last_name as teacher_last_name,
          COUNT(DISTINCT ce.student_id) as student_count,
          COUNT(DISTINCT a.id) as assignment_count,
          'teaching' as type
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignments a ON c.id = a.class_id
        WHERE c.teacher_id = $1
        GROUP BY c.id, c.name, c.description, c.icon_name, c.icon_color, c.created_at, u.first_name, u.last_name
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    } else {
      // Students see classes they're enrolled in
      query = `
        SELECT 
          c.id, c.name, c.description, c.icon_name, c.icon_color, c.created_at,
          u.first_name as teacher_first_name, u.last_name as teacher_last_name,
          COUNT(DISTINCT ce2.student_id) as student_count,
          COUNT(DISTINCT a.id) as assignment_count,
          'enrolled' as type
        FROM classes c
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN class_enrollments ce2 ON c.id = ce2.class_id
        LEFT JOIN assignments a ON c.id = a.class_id
        WHERE ce.student_id = $1
        GROUP BY c.id, u.first_name, u.last_name
        ORDER BY c.created_at DESC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    

    
    const classes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      iconName: row.icon_name,
      iconColor: row.icon_color,
      teacherName: `${row.teacher_first_name} ${row.teacher_last_name}`,
      studentCount: parseInt(row.student_count),
      assignmentCount: parseInt(row.assignment_count),
      type: row.type,
      createdAt: row.created_at
    }));

    res.json({ classes });
  } catch (error) {
    console.error('Classes fetch error:', error);
    res.status(500).json({ 
      error: 'Classes fetch failed',
      message: 'An error occurred while fetching classes'
    });
  }
});

// Get single class by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has access to this class
    let accessQuery;
    let accessParams = [id];

    if (req.user.role === 'teacher') {
      accessQuery = 'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2';
      accessParams.push(req.user.id);
    } else {
      accessQuery = `
        SELECT c.id FROM classes c
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        WHERE c.id = $1 AND ce.student_id = $2
      `;
      accessParams.push(req.user.id);
    }

    const accessResult = await pool.query(accessQuery, accessParams);
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this class'
      });
    }

    // Get class details
    const classResult = await pool.query(`
      SELECT 
        c.id, c.name, c.description, c.icon_name, c.icon_color, c.created_at,
        u.first_name as teacher_first_name, u.last_name as teacher_last_name,
        u.email as teacher_email
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Class not found',
        message: 'The requested class does not exist'
      });
    }

    const classData = classResult.rows[0];

    // Get enrolled students
    const studentsResult = await pool.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.avatar_url,
        ce.enrolled_at
      FROM class_enrollments ce
      INNER JOIN users u ON ce.student_id = u.id
      WHERE ce.class_id = $1
      ORDER BY u.first_name, u.last_name
    `, [id]);

    // Get assignments
    const assignmentsResult = await pool.query(`
      SELECT 
        id, title, description, due_date, is_urgent, created_at
      FROM assignments
      WHERE class_id = $1
      ORDER BY due_date ASC
    `, [id]);

    res.json({
      class: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        iconName: classData.icon_name,
        iconColor: classData.icon_color,
        teacher: {
          firstName: classData.teacher_first_name,
          lastName: classData.teacher_last_name,
          email: classData.teacher_email
        },
        students: studentsResult.rows.map(student => ({
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          email: student.email,
          avatarUrl: student.avatar_url,
          enrolledAt: student.enrolled_at
        })),
        assignments: assignmentsResult.rows.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.due_date,
          isUrgent: assignment.is_urgent,
          createdAt: assignment.created_at
        })),
        createdAt: classData.created_at
      }
    });
  } catch (error) {
    console.error('Class fetch error:', error);
    res.status(500).json({ 
      error: 'Class fetch failed',
      message: 'An error occurred while fetching class details'
    });
  }
});

// Create new class (teachers only)
router.post('/', authenticateToken, requireRole(['teacher']), [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('iconName').optional().trim(),
  body('iconColor').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, iconName, iconColor } = req.body;

    const result = await pool.query(
      `INSERT INTO classes (name, description, icon_name, icon_color, teacher_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, icon_name, icon_color, created_at`,
      [name, description, iconName, iconColor, req.user.id]
    );

    const newClass = result.rows[0];

    res.status(201).json({
      message: 'Class created successfully',
      class: {
        id: newClass.id,
        name: newClass.name,
        description: newClass.description,
        iconName: newClass.icon_name,
        iconColor: newClass.icon_color,
        createdAt: newClass.created_at
      }
    });
  } catch (error) {
    console.error('Class creation error:', error);
    console.error('Error details:', {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message
    });
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      if (error.constraint === 'unique_class_name_per_teacher') {
        // Check if it's a global name conflict or teacher-specific conflict
        if (error.detail && error.detail.includes('name')) {
          return res.status(409).json({ 
            error: 'Class name already exists',
            message: 'A class with this name already exists in the system'
          });
        } else {
          return res.status(409).json({ 
            error: 'Class name already exists',
            message: 'A class with this name already exists for this teacher'
          });
        }
      }
    }
    
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        error: 'Invalid teacher',
        message: 'The specified teacher does not exist'
      });
    }
    
    res.status(500).json({ 
      error: 'Class creation failed',
      message: 'An error occurred while creating the class'
    });
  }
});

// Update class (teacher who owns the class)
router.put('/:id', authenticateToken, requireRole(['teacher']), requireOwnership('classes', 'id', 'teacher_id'), [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('iconName').optional().trim(),
  body('iconColor').optional().trim()
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
    const { name, description, iconName, iconColor } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (name) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }

    if (iconName !== undefined) {
      updateFields.push(`icon_name = $${paramCount++}`);
      updateValues.push(iconName);
    }

    if (iconColor !== undefined) {
      updateFields.push(`icon_color = $${paramCount++}`);
      updateValues.push(iconColor);
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
      `UPDATE classes SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, description, icon_name, icon_color, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Class not found',
        message: 'The requested class does not exist'
      });
    }

    const updatedClass = result.rows[0];

    res.json({
      message: 'Class updated successfully',
      class: {
        id: updatedClass.id,
        name: updatedClass.name,
        description: updatedClass.description,
        iconName: updatedClass.icon_name,
        iconColor: updatedClass.icon_color,
        updatedAt: updatedClass.updated_at
      }
    });
  } catch (error) {
    console.error('Class update error:', error);
    res.status(500).json({ 
      error: 'Class update failed',
      message: 'An error occurred while updating the class'
    });
  }
});

// Delete class (teacher who owns the class)
router.delete('/:id', authenticateToken, requireRole(['teacher']), requireOwnership('classes', 'id', 'teacher_id'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM classes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Class not found',
        message: 'The requested class does not exist'
      });
    }

    res.json({
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Class deletion error:', error);
    res.status(500).json({ 
      error: 'Class deletion failed',
      message: 'An error occurred while deleting the class'
    });
  }
});

// Enroll student in class (teachers only)
router.post('/:id/enroll', authenticateToken, requireRole(['teacher']), requireOwnership('classes', 'id', 'teacher_id'), [
  body('studentId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id: classId } = req.params;
    const { studentId } = req.body;

    // Check if student exists
    const studentResult = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = $2',
      [studentId, 'student']
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Student not found',
        message: 'The specified student does not exist'
      });
    }

    // Check if already enrolled
    const enrollmentResult = await pool.query(
      'SELECT id FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
      [classId, studentId]
    );

    if (enrollmentResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Already enrolled',
        message: 'Student is already enrolled in this class'
      });
    }

    // Enroll student
    await pool.query(
      'INSERT INTO class_enrollments (class_id, student_id) VALUES ($1, $2)',
      [classId, studentId]
    );

    const student = studentResult.rows[0];

    res.status(201).json({
      message: 'Student enrolled successfully',
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name
      }
    });
  } catch (error) {
    console.error('Student enrollment error:', error);
    res.status(500).json({ 
      error: 'Student enrollment failed',
      message: 'An error occurred while enrolling the student'
    });
  }
});

// Remove student from class (teachers only)
router.delete('/:id/enroll/:studentId', authenticateToken, requireRole(['teacher']), requireOwnership('classes', 'id', 'teacher_id'), async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const result = await pool.query(
      'DELETE FROM class_enrollments WHERE class_id = $1 AND student_id = $2 RETURNING id',
      [classId, studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Enrollment not found',
        message: 'Student is not enrolled in this class'
      });
    }

    res.json({
      message: 'Student removed from class successfully'
    });
  } catch (error) {
    console.error('Student removal error:', error);
    res.status(500).json({ 
      error: 'Student removal failed',
      message: 'An error occurred while removing the student'
    });
  }
});

module.exports = router; 