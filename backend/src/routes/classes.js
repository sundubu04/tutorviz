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
router.post(
  '/',
  authenticateToken,
  requireRole(['teacher']),
  [
    body('name').trim().isLength({ min: 1, max: 255 }),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const { name, description } = req.body;
      const teacherId = req.user.id;

      // Guard unique constraints at the application layer so we can return a clean 409.
      const existing = await prisma.class.findFirst({
        where: { teacherId, name }
      });
      if (existing) {
        return res.status(409).json({
          error: 'Class name already exists',
          message: 'A class with this name already exists for this teacher'
        });
      }

      const created = await prisma.class.create({
        data: {
          name,
          description: description ?? null,
          // Standardize icons: always default blue "book" icon.
          iconName: 'book',
          iconColor: '#3B82F6',
          teacherId
        }
      });

      res.status(201).json({
        message: 'Class created successfully',
        class: {
          id: created.id,
          name: created.name,
          description: created.description ?? '',
          iconName: created.iconName,
          iconColor: created.iconColor,
          createdAt: created.createdAt
        }
      });
    } catch (error) {
      console.error('Class creation error:', error);
      res.status(500).json({
        error: 'Class creation failed',
        message: 'An error occurred while creating the class'
      });
    }
  }
);

// Update class (teacher who owns the class)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['teacher']),
  requireOwnership('classes', 'id', 'teacher_id'),
  [
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { name, description } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description ?? null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update'
        });
      }

      // If renaming, enforce "name unique per teacher" (if the DB also has this constraint).
      if (updateData.name) {
        const teacherId = req.user.id;
        const dupe = await prisma.class.findFirst({
          where: { teacherId, name: updateData.name, id: { not: id } }
        });
        if (dupe) {
          return res.status(409).json({
            error: 'Class name already exists',
            message: 'A class with this name already exists for this teacher'
          });
        }
      }

      const updated = await prisma.class.update({
        where: { id },
        data: {
          ...updateData,
          // Standardize icons regardless of client-provided values.
          iconName: 'book',
          iconColor: '#3B82F6',
          updatedAt: new Date()
        }
      });

      res.json({
        message: 'Class updated successfully',
        class: {
          id: updated.id,
          name: updated.name,
          description: updated.description ?? '',
          iconName: updated.iconName,
          iconColor: updated.iconColor,
          updatedAt: updated.updatedAt
        }
      });
    } catch (error) {
      console.error('Class update error:', error);

      // Prisma "record not found"
      if (error && error.code === 'P2025') {
        return res.status(404).json({
          error: 'Class not found',
          message: 'The requested class does not exist'
        });
      }

      res.status(500).json({
        error: 'Class update failed',
        message: 'An error occurred while updating the class'
      });
    }
  }
);

// Delete class (teacher who owns the class)
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['teacher']),
  requireOwnership('classes', 'id', 'teacher_id'),
  async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.class.delete({ where: { id } });

      res.json({
        message: 'Class deleted successfully'
      });
    } catch (error) {
      console.error('Class deletion error:', error);

      if (error && error.code === 'P2025') {
        return res.status(404).json({
          error: 'Class not found',
          message: 'The requested class does not exist'
        });
      }

      res.status(500).json({
        error: 'Class deletion failed',
        message: 'An error occurred while deleting the class'
      });
    }
  }
);

// Enroll student in class (teachers only)
router.post(
  '/:id/enroll',
  authenticateToken,
  requireRole(['teacher']),
  requireOwnership('classes', 'id', 'teacher_id'),
  [body('studentId').isUUID()],
  async (req, res) => {
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
      const student = await prisma.user.findFirst({
        where: { id: studentId, role: 'student' },
        select: { id: true, firstName: true, lastName: true }
      });

      if (!student) {
        return res.status(404).json({
          error: 'Student not found',
          message: 'The specified student does not exist'
        });
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.classEnrollment.findFirst({
        where: { classId, studentId },
        select: { id: true }
      });

      if (existingEnrollment) {
        return res.status(409).json({
          error: 'Already enrolled',
          message: 'Student is already enrolled in this class'
        });
      }

      await prisma.classEnrollment.create({
        data: { classId, studentId }
      });

      res.status(201).json({
        message: 'Student enrolled successfully',
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName
        }
      });
    } catch (error) {
      console.error('Student enrollment error:', error);
      res.status(500).json({
        error: 'Student enrollment failed',
        message: 'An error occurred while enrolling the student'
      });
    }
  }
);

// Remove student from class (teachers only)
router.delete(
  '/:id/enroll/:studentId',
  authenticateToken,
  requireRole(['teacher']),
  requireOwnership('classes', 'id', 'teacher_id'),
  async (req, res) => {
    try {
      const { id: classId, studentId } = req.params;

      const result = await prisma.classEnrollment.deleteMany({
        where: { classId, studentId }
      });

      if (result.count === 0) {
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
  }
);

// Get students for a class (teachers only)
router.get(
  '/:id/students',
  authenticateToken,
  requireRole(['teacher']),
  requireOwnership('classes', 'id', 'teacher_id'),
  async (req, res) => {
    try {
      const { id: classId } = req.params;

      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      const students = enrollments
        .map((e) => ({
          id: e.student.id,
          firstName: e.student.firstName,
          lastName: e.student.lastName,
          email: e.student.email
        }))
        .sort((a, b) => {
          const first = a.firstName.localeCompare(b.firstName);
          if (first !== 0) return first;
          return a.lastName.localeCompare(b.lastName);
        });

      res.json({ students });
    } catch (error) {
      console.error('Students fetch failed:', error);
      res.status(500).json({
        error: 'Students fetch failed',
        message: 'An error occurred while fetching students'
      });
    }
  }
);

module.exports = router; 