const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all classes (requires authentication)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Extract userId and role from the decoded token
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let classes = [];

    if (userRole === 'teacher') {
      // Teachers see classes they teach
      classes = await prisma.class.findMany({
        where: {
          teacherId: userId
        },
        include: {
          teacher: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          enrollments: {
            select: {
              studentId: true
            }
          },
          assignments: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      classes = classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        description: cls.description,
        iconName: cls.iconName,
        iconColor: cls.iconColor,
        teacherName: `${cls.teacher.firstName} ${cls.teacher.lastName}`,
        studentCount: cls.enrollments.length,
        assignmentCount: cls.assignments.length,
        type: 'teaching',
        createdAt: cls.createdAt
      }));
    } else {
      // Students see classes they're enrolled in
      const enrollments = await prisma.classEnrollment.findMany({
        where: {
          studentId: userId
        },
        include: {
          class: {
            include: {
              teacher: {
                select: {
                  firstName: true,
                  lastName: true
                }
              },
              enrollments: {
                select: {
                  studentId: true
                }
              },
              assignments: {
                select: {
                  id: true
                }
              }
            }
          }
        },
        orderBy: {
          class: {
            createdAt: 'desc'
          }
        }
      });

      classes = enrollments.map(enrollment => ({
        id: enrollment.class.id,
        name: enrollment.class.name,
        description: enrollment.class.description,
        iconName: enrollment.class.iconName,
        iconColor: enrollment.class.iconColor,
        teacherName: `${enrollment.class.teacher.firstName} ${enrollment.class.teacher.lastName}`,
        studentCount: enrollment.class.enrollments.length,
        assignmentCount: enrollment.class.assignments.length,
        type: 'enrolled',
        createdAt: enrollment.class.createdAt
      }));
    }

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
    let hasAccess = false;

    if (req.user.role === 'teacher') {
      const teacherClass = await prisma.class.findFirst({
        where: {
          id: id,
          teacherId: req.user.id
        }
      });
      hasAccess = !!teacherClass;
    } else {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId: id,
          studentId: req.user.id
        }
      });
      hasAccess = !!enrollment;
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this class'
      });
    }

    // Get class details with teacher info
    const classData = await prisma.class.findUnique({
      where: { id: id },
      include: {
        teacher: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!classData) {
      return res.status(404).json({ 
        error: 'Class not found',
        message: 'The requested class does not exist'
      });
    }

    // Get enrolled students
    const students = await prisma.classEnrollment.findMany({
      where: { classId: id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        student: {
          firstName: 'asc'
        }
      }
    });

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: { classId: id },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        createdAt: true
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    res.json({
      class: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        iconName: classData.iconName,
        iconColor: classData.iconColor,
        teacher: {
          firstName: classData.teacher.firstName,
          lastName: classData.teacher.lastName,
          email: classData.teacher.email
        },
        students: students.map(enrollment => ({
          id: enrollment.student.id,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
          avatarUrl: enrollment.student.avatarUrl,
          enrolledAt: enrollment.enrolledAt
        })),
        assignments: assignments.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          isUrgent: assignment.priority === 'urgent',
          createdAt: assignment.createdAt
        })),
        createdAt: classData.createdAt
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
    console.log('🔍 [CLASS CREATION] Starting class creation...');
    console.log('🔍 [CLASS CREATION] User:', req.user);
    console.log('🔍 [CLASS CREATION] Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [CLASS CREATION] Validation failed:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, iconName, iconColor } = req.body;
    console.log('🔍 [CLASS CREATION] Extracted data:', { name, description, iconName, iconColor });
    console.log('🔍 [CLASS CREATION] User ID to use:', req.user.id);

    console.log('🔍 [CLASS CREATION] Executing database query...');
    const result = await pool.query(
      `INSERT INTO classes (name, description, icon_name, icon_color, teacher_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, icon_name, icon_color, created_at`,
      [name, description, iconName, iconColor, req.user.id]
    );
    console.log('✅ [CLASS CREATION] Database query successful, result:', result.rows[0]);

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
    console.error('❌ [CLASS CREATION] Class creation error:', error);
    console.error('❌ [CLASS CREATION] Error name:', error.name);
    console.error('❌ [CLASS CREATION] Error code:', error.code);
    console.error('❌ [CLASS CREATION] Error message:', error.message);
    console.error('❌ [CLASS CREATION] Error stack:', error.stack);
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

// Get students for a class (teachers only)
router.get('/:id/students', authenticateToken, requireRole(['teacher']), requireOwnership('classes', 'id', 'teacher_id'), async (req, res) => {
  console.log(`👥 [CLASSES] GET /${req.params.id}/students - User: ${req.user.firstName} ${req.user.lastName} (${req.user.role})`);
  
  try {
    const { id: classId } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.avatar_url,
        ce.enrolled_at
      FROM users u
      INNER JOIN class_enrollments ce ON u.id = ce.student_id
      WHERE ce.class_id = $1 AND u.role = 'student'
      ORDER BY u.first_name, u.last_name
    `, [classId]);

    const students = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      enrolledAt: row.enrolled_at
    }));

    console.log(`✅ [CLASSES] GET /${classId}/students - Success: Found ${students.length} students`);
    res.json({ students });
  } catch (error) {
    console.error(`❌ [CLASSES] GET /${req.params.id}/students - Error:`, error.message);
    res.status(500).json({ 
      error: 'Students fetch failed',
      message: 'An error occurred while fetching students'
    });
  }
});

module.exports = router; 