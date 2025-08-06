const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = `
      SELECT id, email, first_name, last_name, role, avatar_url, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount++}`;
      params.push(role);
    }

    if (search) {
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    
    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json({ users });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ 
      error: 'Users fetch failed',
      message: 'An error occurred while fetching users'
    });
  }
});

// Get single user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only view your own profile'
      });
    }

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, avatar_url, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    const user = result.rows[0];

    // Get user's classes
    let classesQuery;
    let classesParams = [id];

    if (user.role === 'teacher') {
      classesQuery = `
        SELECT c.id, c.name, c.description, c.icon_name, c.icon_color,
               COUNT(DISTINCT ce.student_id) as student_count
        FROM classes c
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `;
    } else {
      classesQuery = `
        SELECT c.id, c.name, c.description, c.icon_name, c.icon_color,
               u.first_name as teacher_first_name, u.last_name as teacher_last_name
        FROM classes c
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN users u ON c.teacher_id = u.id
        WHERE ce.student_id = $1
        ORDER BY c.created_at DESC
      `;
    }

    const classesResult = await pool.query(classesQuery, classesParams);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        classes: classesResult.rows.map(classRow => ({
          id: classRow.id,
          name: classRow.name,
          description: classRow.description,
          iconName: classRow.icon_name,
          iconColor: classRow.icon_color,
          studentCount: classRow.student_count,
          teacherName: classRow.teacher_first_name ? 
            `${classRow.teacher_first_name} ${classRow.teacher_last_name}` : null
        })),
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ 
      error: 'User fetch failed',
      message: 'An error occurred while fetching user details'
    });
  }
});

// Update user (admin or own profile)
router.put('/:id', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['student', 'teacher', 'admin']),
  body('avatarUrl').optional().isURL()
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
    const { firstName, lastName, role, avatarUrl } = req.body;

    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only update your own profile'
      });
    }

    // Only admins can change roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only administrators can change user roles'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(firstName);
    }

    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(lastName);
    }

    if (role && req.user.role === 'admin') {
      updateFields.push(`role = $${paramCount++}`);
      updateValues.push(role);
    }

    if (avatarUrl) {
      updateFields.push(`avatar_url = $${paramCount++}`);
      updateValues.push(avatarUrl);
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
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, role, avatar_url, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    const updatedUser = result.rows[0];

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatar_url,
        updatedAt: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ 
      error: 'User update failed',
      message: 'An error occurred while updating the user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ 
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ 
      error: 'User deletion failed',
      message: 'An error occurred while deleting the user'
    });
  }
});

// Get students for enrollment (teachers only)
router.get('/students/enrollable', authenticateToken, requireRole(['teacher']), async (req, res) => {
  try {
    const { classId, search } = req.query;
    
    let query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url
      FROM users u
      WHERE u.role = 'student'
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (classId) {
      // Exclude students already enrolled in this class
      query += ` AND u.id NOT IN (
        SELECT student_id FROM class_enrollments WHERE class_id = $${paramCount}
      )`;
      params.push(classId);
    }

    query += ' ORDER BY u.first_name, u.last_name';

    const result = await pool.query(query, params);
    
    const students = result.rows.map(student => ({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      email: student.email,
      avatarUrl: student.avatar_url
    }));

    res.json({ students });
  } catch (error) {
    console.error('Students fetch error:', error);
    res.status(500).json({ 
      error: 'Students fetch failed',
      message: 'An error occurred while fetching students'
    });
  }
});

// Get user statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own stats unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only view your own statistics'
      });
    }

    // Get user role
    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    const userRole = userResult.rows[0].role;
    let stats = {};

    if (userRole === 'teacher') {
      // Teacher statistics
      const classStats = await pool.query(`
        SELECT 
          COUNT(*) as total_classes,
          COUNT(DISTINCT ce.student_id) as total_students,
          COUNT(DISTINCT a.id) as total_assignments
        FROM classes c
        LEFT JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignments a ON c.id = a.class_id
        WHERE c.teacher_id = $1
      `, [id]);

      const recentAssignments = await pool.query(`
        SELECT a.id, a.title, a.due_date, c.name as class_name,
               COUNT(as.id) as submission_count
        FROM assignments a
        LEFT JOIN classes c ON a.class_id = c.id
        LEFT JOIN assignment_submissions as ON a.id = as.assignment_id
        WHERE a.created_by = $1
        GROUP BY a.id, c.name
        ORDER BY a.created_at DESC
        LIMIT 5
      `, [id]);

      stats = {
        totalClasses: parseInt(classStats.rows[0].total_classes),
        totalStudents: parseInt(classStats.rows[0].total_students),
        totalAssignments: parseInt(classStats.rows[0].total_assignments),
        recentAssignments: recentAssignments.rows.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          className: assignment.class_name,
          submissionCount: parseInt(assignment.submission_count)
        }))
      };
    } else {
      // Student statistics
      const enrollmentStats = await pool.query(`
        SELECT 
          COUNT(DISTINCT ce.class_id) as total_classes,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT as.id) as submitted_assignments,
          AVG(as.grade) as average_grade
        FROM class_enrollments ce
        LEFT JOIN assignments a ON ce.class_id = a.class_id
        LEFT JOIN assignment_submissions as ON a.id = as.assignment_id AND as.student_id = $1
        WHERE ce.student_id = $1
      `, [id]);

      const upcomingAssignments = await pool.query(`
        SELECT a.id, a.title, a.due_date, a.is_urgent, c.name as class_name
        FROM assignments a
        INNER JOIN classes c ON a.class_id = c.id
        INNER JOIN class_enrollments ce ON c.id = ce.class_id
        LEFT JOIN assignment_submissions as ON a.id = as.assignment_id AND as.student_id = $1
        WHERE ce.student_id = $1 AND as.id IS NULL AND a.due_date > NOW()
        ORDER BY a.due_date ASC
        LIMIT 5
      `, [id]);

      stats = {
        totalClasses: parseInt(enrollmentStats.rows[0].total_classes),
        totalAssignments: parseInt(enrollmentStats.rows[0].total_assignments),
        submittedAssignments: parseInt(enrollmentStats.rows[0].submitted_assignments),
        averageGrade: enrollmentStats.rows[0].average_grade ? 
          parseFloat(enrollmentStats.rows[0].average_grade) : null,
        upcomingAssignments: upcomingAssignments.rows.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          dueDate: assignment.due_date,
          isUrgent: assignment.is_urgent,
          className: assignment.class_name
        }))
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error('User stats fetch error:', error);
    res.status(500).json({ 
      error: 'User stats fetch failed',
      message: 'An error occurred while fetching user statistics'
    });
  }
});

module.exports = router; 