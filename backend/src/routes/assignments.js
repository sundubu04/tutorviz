const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint to verify database connection
router.get('/test', async (req, res) => {
  try {
    // Test database connection
    const result = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        topic: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      where: {
        createdBy: req.user.id,
      },
              orderBy: {
          dueDate: 'asc',
        },
    });
    console.log('Database connection test successful:', result);
    
    // Check if assignments table exists
    const tableCheck = await prisma.assignment.findMany({
      select: {
        id: true,
      },
      where: {
        classId: req.user.id, // Assuming classId is the teacher's ID for this test
      },
    });
    
    const tableExists = tableCheck.length > 0;
    console.log('Assignments table exists:', tableExists);
    
    if (tableExists) {
      // Check table structure
      const structureCheck = await prisma.assignment.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          topic: true,
          createdAt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });
      console.log('Table structure:', structureCheck);
    }
    
    res.json({ 
      message: 'Database test successful',
      currentTime: new Date().toISOString(),
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
    
    const result = await client.calendarEvent.create({
      data: {
        title: assignment.title,
        description: assignment.description || `Assignment due for ${assignment.title}`,
        startTime: assignment.dueDate, // Use the database column name
        endTime: new Date(new Date(assignment.dueDate).getTime() + 24 * 60 * 60 * 1000),
        eventType: 'assignment',
        classId: classId,
        createdBy: userId,
      },
    });
    console.log('Calendar event created successfully:', result);
    return result.id;
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
    
    await client.calendarEvent.update({
      where: {
        id: eventId,
      },
      data: {
        title: assignment.title,
        description: assignment.description || `Assignment due for ${assignment.title}`,
        startTime: assignment.dueDate, // Use the database column name
        endTime: new Date(new Date(assignment.dueDate).getTime() + 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });
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
  const enrolledStudents = await client.classEnrollment.findMany({
    where: {
      classId: classId,
      studentId: {
        in: assignedStudents,
      },
    },
  });

  if (enrolledStudents.length !== assignedStudents.length) {
    throw new Error('Some students are not enrolled in this class');
  }

  // Remove existing assignments
  await client.assignmentStudentAssignment.deleteMany({
    where: {
      assignmentId: assignmentId,
    },
  });

  // Insert new assignments
  for (const studentId of assignedStudents) {
    await client.assignmentStudentAssignment.create({
      data: {
        assignmentId: assignmentId,
        studentId: studentId,
      },
    });
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

    const result = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        topic: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      where: {
        createdBy: req.user.id,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
    const assignments = result.map(mapAssignmentRow);
    
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
router.get('/class/:classId', authenticateToken, requireRole(['teacher']), async (req, res) => {
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

    const result = await prisma.assignment.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        topic: true,
        createdAt: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      where: {
        classId: classId,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
    const assignments = result.map(mapAssignmentRow);
    
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

    const result = await prisma.assignment.findFirst({
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        topic: true,
        createdAt: true,
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
      where: {
        id: id,
      },
    });
    
    if (!result) {
      return res.status(404).json({ 
        error: 'Assignment not found',
        message: 'The requested assignment does not exist'
      });
    }

    const assignment = mapAssignmentRow(result);
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
    const classResult = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: req.user.id,
      },
    });

    if (!classResult) {
      console.log('Access denied: Teacher does not own class');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only create assignments for classes you teach'
      });
    }

    const client = prisma;
    try {
      await client.$transaction(async (tx) => {

      // Create the assignment
      const result = await client.assignment.create({
        data: {
          title: title,
          description: description,
          classId: classId,
          dueDate: dueDate,
          priority: priority || 'normal',
          topic: topic,
          createdBy: req.user.id,
        },
      });

      const newAssignment = result;
      console.log('Assignment created:', newAssignment);

      // Handle student assignments
      await handleStudentAssignments(client, newAssignment.id, classId, assignedStudents);

      // Create calendar event
      const calendarEventId = await createCalendarEvent(client, newAssignment, classId, req.user.id);
      console.log('Calendar event created with ID:', calendarEventId);

      });

      const responseAssignment = mapAssignmentRow(newAssignment);
      console.log('Sending response:', responseAssignment);

      res.status(201).json({
        message: 'Assignment created successfully',
        assignment: responseAssignment
      });
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    } finally {
      // No explicit client.release() needed for Prisma
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

    const client = prisma;
    try {
      await client.$transaction(async (tx) => {

      // Get the current assignment values before update
      const currentAssignment = await tx.assignment.findFirst({
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          topic: true,
        },
        where: {
          id: id,
        },
      });
      
      if (!currentAssignment) {
        throw new Error('Assignment not found');
      }
      
      console.log('Current assignment values:', currentAssignment);

      // Update the assignment
      const updateQuery = `UPDATE assignments SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, title, description, due_date, priority, topic, updated_at`;
      console.log('Update query:', updateQuery);
      console.log('Update parameters:', updateValues);
      
      const result = await tx.assignment.update({
        where: {
          id: id,
        },
        data: {
          title: title,
          description: description,
          dueDate: dueDate,
          priority: priority,
          topic: topic,
          updatedAt: new Date(),
        },
      });

      if (!result) {
        console.log('Assignment not found for update');
        throw new Error('Assignment not found');
      }

      const updatedAssignment = result;
      console.log('Assignment updated successfully:', updatedAssignment);
      console.log('Changes made:');
      console.log('  Title:', currentAssignment.title, '->', updatedAssignment.title);
      console.log('  Description:', currentAssignment.description, '->', updatedAssignment.description);
      console.log('  Due Date:', currentAssignment.dueDate, '->', updatedAssignment.dueDate);
      console.log('  Priority:', currentAssignment.priority, '->', updatedAssignment.priority);
      console.log('  Topic:', currentAssignment.topic, '->', updatedAssignment.topic);

      // Handle student assignments
      if (assignedStudents !== undefined) {
        const classResult = await tx.assignment.findFirst({
          select: {
            classId: true,
          },
          where: {
            id: id,
          },
        });
        
        if (classResult) {
          const classId = classResult.classId;
          await handleStudentAssignments(client, id, classId, assignedStudents);
        }
      }

      // Update calendar event
      console.log('Looking for existing calendar event...');
      const existingEvent = await tx.calendarEvent.findFirst({
        where: {
          eventType: 'assignment',
          classId: (await tx.assignment.findFirst({
            select: {
              classId: true,
            },
            where: {
              id: id,
            },
          })).classId,
        },
      });
      
      console.log('Existing calendar event found:', existingEvent);

      if (existingEvent) {
        console.log('Updating existing calendar event...');
        await updateCalendarEvent(client, updatedAssignment, null, existingEvent.id);
      } else {
        console.log('Creating new calendar event...');
        const classResult = await tx.assignment.findFirst({
          select: {
            class_id: true,
          },
          where: {
            id: id,
          },
        });
        
        if (classResult) {
          const classId = classResult.classId;
          await createCalendarEvent(client, updatedAssignment, classId, req.user.id);
        }
      }

      });

      // Verify the update was actually committed to the database
      const verificationResult = await prisma.assignment.findFirst({
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          priority: true,
          topic: true,
          updatedAt: true,
        },
        where: {
          id: id,
        },
      });
      
      if (verificationResult) {
        console.log('Database verification - Final assignment values:', verificationResult);
      }

      const responseAssignment = mapAssignmentRow(updatedAssignment);
      console.log('Sending update response:', responseAssignment);

      res.json({
        message: 'Assignment updated successfully',
        assignment: responseAssignment
      });
    } catch (error) {
      throw error;
    } finally {
      // No explicit client.release() needed for Prisma
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

    const client = prisma;
    try {
      await client.$transaction(async (tx) => {

      // Get assignment info before deletion
      const assignmentResult = await tx.assignment.findFirst({
        select: {
          id: true,
          title: true,
          classId: true,
        },
        where: {
          id: id,
        },
      });

      if (!assignmentResult) {
        return res.status(404).json({ 
          error: 'Assignment not found',
          message: 'The requested assignment does not exist'
        });
      }

      const assignment = assignmentResult;

      // Delete the assignment
      await tx.assignment.delete({
        where: {
          id: id,
        },
      });

      // Delete corresponding calendar event
      await tx.calendarEvent.deleteMany({
        where: {
          eventType: 'assignment',
          title: assignment.title,
          classId: assignment.classId,
        },
      });

      });

      res.json({
        message: 'Assignment deleted successfully'
      });
    } catch (error) {
      throw error;
    } finally {
      // No explicit client.release() needed for Prisma
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
    const enrollmentCheck = await prisma.classEnrollment.findFirst({
      where: {
        classId: id,
        studentId: req.user.id,
      },
    });

    if (!enrollmentCheck) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only submit assignments for classes you are enrolled in'
      });
    }

    // Check if already submitted
    const existingSubmission = await prisma.assignmentSubmission.findFirst({
      where: {
        assignment_id: id,
        student_id: req.user.id,
      },
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        error: 'Already submitted',
        message: 'You have already submitted this assignment'
      });
    }

    // Create submission
    const result = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: id,
        studentId: req.user.id,
        content: submissionText,
        filePath: fileUrl,
      },
    });

    res.status(201).json({
      message: 'Assignment submitted successfully',
      submission: {
        id: result.id,
        submittedAt: result.submittedAt
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

    const result = await prisma.assignmentSubmission.findMany({
      select: {
        id: true,
        content: true,
        filePath: true,
        submittedAt: true,
        grade: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      where: {
        assignmentId: id,
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    const submissions = result.map(row => ({
      id: row.id,
      submissionText: row.content,
      fileUrl: row.filePath,
      submittedAt: row.submittedAt,
      grade: row.grade,
      student: {
        firstName: row.student.firstName,
        lastName: row.student.lastName,
        email: row.student.email
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
    const submissionCheck = await prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId: id,
      },
    });

    if (!submissionCheck) {
      return res.status(404).json({ 
        error: 'Submission not found',
        message: 'The requested submission does not exist'
      });
    }

    // Update grade
    const result = await prisma.assignmentSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        grade: grade,
        feedback: feedback,
      },
    });

    res.json({
      message: 'Grade updated successfully',
      submission: {
        id: result.id,
        grade: result.grade,
        feedback: result.feedback,
        updatedAt: result.updatedAt
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

    const result = await prisma.assignmentAttachment.create({
      data: {
        assignmentId: id,
        name: name,
        url: url,
        size: size,
        type: type,
      },
    });

    res.status(201).json({
      message: 'Attachment uploaded successfully',
      attachment: {
        id: result.id,
        name: result.name,
        url: result.url,
        size: result.size,
        type: result.type,
        uploadedAt: result.uploadedAt
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
