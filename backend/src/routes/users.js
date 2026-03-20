const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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

    const result = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        AND: [
          {
            id: {
              not: req.user.id, // Exclude the current user from the list
            },
          },
          ...(role ? [{ role: role }] : []),
          ...(search ? [
            {
              OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          ] : []),
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    
    const users = result.map(user => ({
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

// Get pending (unverified) users (admin only)
router.get('/pending', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        verified: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ users: result });
  } catch (error) {
    console.error('Pending users fetch error:', error);
    res.status(500).json({
      error: 'Pending users fetch failed',
      message: 'An error occurred while fetching pending users'
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

    const user = await prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        id: id,
      },
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

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

    const classesResult = await prisma.class.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        icon_name: true,
        icon_color: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        ...(user.role === 'teacher' ? { teacherId: id } : { id: { in: (await prisma.classEnrollment.findMany({
          select: { classId: true },
          where: { studentId: id },
        })).map(enrollment => enrollment.classId) } }),
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        classes: classesResult.map(classRow => ({
          id: classRow.id,
          name: classRow.name,
          description: classRow.description,
          iconName: classRow.icon_name,
          iconColor: classRow.icon_color,
          studentCount: parseInt(classRow.student_count),
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

    const updatedUser = await prisma.user.update({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        avatar_url: true,
        updated_at: true,
      },
      data: {
        [updateFields[0]]: updateValues[0],
        [updateFields[1]]: updateValues[1],
        ...(role && req.user.role === 'admin' ? { role: role } : {}),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        updated_at: new Date(),
      },
      where: {
        id: id,
      },
    });

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

// Admin: verify a user account
router.patch('/:id/verify', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await prisma.user.update({
      where: { id },
      data: { verified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        verified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'User verified successfully',
      user: updated
    });
  } catch (error) {
    console.error('User verify error:', error);
    res.status(500).json({
      error: 'User verification failed',
      message: 'An error occurred while verifying the user'
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

    const result = await prisma.user.delete({
      where: {
        id: id,
      },
    });

    if (!result) {
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

    const result = await prisma.user.findMany({
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        avatar_url: true,
      },
      where: {
        role: 'student',
        ...(search ? [
          {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        ] : []),
        ...(classId ? {
          id: {
            notIn: (await prisma.classEnrollment.findMany({
              select: { studentId: true },
              where: { classId: classId },
            })).map(enrollment => enrollment.studentId),
          },
        } : {}),
      },
      orderBy: {
        first_name: 'asc',
        last_name: 'asc',
      },
    });
    
    const students = result.map(student => ({
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
    const user = await prisma.user.findUnique({
      select: {
        role: true,
      },
      where: {
        id: id,
      },
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'The requested user does not exist'
      });
    }

    const userRole = user.role;
    let stats = {};

    if (userRole === 'teacher') {
      // Teacher statistics
      const classStats = await prisma.class.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          iconName: true,
          iconColor: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          teacherId: id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const recentAssignments = await prisma.assignment.findMany({
        select: {
          id: true,
          title: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          classId: {
            in: classStats.map(c => c.id),
          },
          createdBy: id,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 5,
      });

      stats = {
        totalClasses: parseInt(classStats.length),
                 totalStudents: parseInt((await prisma.classEnrollment.findMany({
           select: { studentId: true },
           where: { classId: { in: classStats.map(c => c.id) } },
         })).length),
         totalAssignments: parseInt((await prisma.assignment.findMany({
           select: { id: true },
           where: { classId: { in: classStats.map(c => c.id) } },
         })).length),
                 recentAssignments: await Promise.all(recentAssignments.map(async (assignment) => {
           const submissionCount = await prisma.assignmentSubmission.count({
             where: { assignmentId: assignment.id },
           });
           return {
             id: assignment.id,
             title: assignment.title,
             dueDate: assignment.dueDate,
             className: null, // No direct class name here, as it's not in the select
             submissionCount: submissionCount,
           };
         }))
      };
    } else {
      // Student statistics
      const enrollmentStats = await prisma.classEnrollment.findMany({
        select: {
          classId: true,
        },
        where: {
          studentId: id,
        },
      });

      const upcomingAssignments = await prisma.assignment.findMany({
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          createdAt: true,
          updatedAt: true,
        },
        where: {
          classId: {
            in: enrollmentStats.map(enrollment => enrollment.classId),
          },
          dueDate: {
            gt: new Date(),
          },
          priority: 'urgent',
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 5,
      });

      stats = {
        totalClasses: parseInt(enrollmentStats.length),
        totalAssignments: parseInt((await prisma.assignment.findMany({
          select: { id: true },
          where: { classId: { in: enrollmentStats.map(enrollment => enrollment.classId) } },
        })).length),
        submittedAssignments: parseInt((await prisma.assignmentSubmission.findMany({
          select: { id: true },
          where: { studentId: id },
        })).length),
        averageGrade: null, // No direct average grade here, as it's not in the select
                 upcomingAssignments: await Promise.all(upcomingAssignments.map(async (assignment) => {
           const classInfo = await prisma.class.findFirst({
             select: { name: true },
             where: { id: assignment.classId },
           });
           return {
             id: assignment.id,
             title: assignment.title,
             dueDate: assignment.dueDate,
             isUrgent: assignment.priority === 'urgent',
             className: classInfo?.name || null,
           };
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