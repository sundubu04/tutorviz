const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Helper function to create consistent error responses
const createErrorResponse = (statusCode, error, message) => {
  return {
    status: 'error',
    error,
    message,
    timestamp: new Date().toISOString()
  };
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please provide a valid authentication token in the Authorization header'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Authentication is not properly configured'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      return res.status(401).json({ 
        error: 'Invalid token structure',
        message: 'The provided token has an invalid structure'
      });
    }
    
    // Get user from database to ensure they still exist
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found or account has been deleted'
      });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'The provided token has expired. Please log in again'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication. Please try again'
    });
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin
const requireOwnership = (resourceTable, resourceIdField = 'id', ownerField = 'created_by') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please authenticate first'
        });
      }

      // Admins can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({ 
          error: 'Resource ID required',
          message: 'Resource ID is missing from request'
        });
      }

      // Check if user owns the resource
      const result = await pool.query(
        `SELECT ${ownerField} FROM ${resourceTable} WHERE id = $1`,
        [resourceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Resource not found',
          message: 'The requested resource does not exist'
        });
      }

      if (result.rows[0][ownerField] !== req.user.id) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred during authorization'
      });
    }
  };
};

// Check if user is enrolled in class
const requireClassEnrollment = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please authenticate first'
        });
      }

      const classId = req.params.classId || req.body.class_id;
      if (!classId) {
        return res.status(400).json({ 
          error: 'Class ID required',
          message: 'Class ID is missing from request'
        });
      }

      // Teachers and admins can access any class
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        return next();
      }

      // Check if student is enrolled in the class
      const result = await pool.query(
        'SELECT * FROM class_enrollments WHERE class_id = $1 AND student_id = $2',
        [classId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Not enrolled',
          message: 'You are not enrolled in this class'
        });
      }

      next();
    } catch (error) {
      console.error('Class enrollment check error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        message: 'An error occurred during authorization'
      });
    }
  };
};

// Handle database constraint violations
const handleDatabaseErrors = (error, req, res, next) => {
  console.error('Database error:', error);
  
  // Handle specific PostgreSQL error codes
  switch (error.code) {
    case '23505': // Unique violation
      if (error.constraint === 'unique_class_name_per_teacher') {
        return res.status(409).json({
          error: 'Duplicate resource',
          message: 'A class with this name already exists for this teacher'
        });
      }
      if (error.constraint === 'unique_class_name_per_teacher') {
        return res.status(409).json({
          error: 'Duplicate resource',
          message: 'This resource already exists'
        });
      }
      return res.status(409).json({
        error: 'Duplicate resource',
        message: 'A resource with these details already exists'
      });
      
    case '23503': // Foreign key violation
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'The referenced resource does not exist'
      });
      
    case '23502': // Not null violation
      return res.status(400).json({
        error: 'Missing required field',
        message: 'A required field is missing'
      });
      
    case '23514': // Check violation
      return res.status(400).json({
        error: 'Invalid data',
        message: 'The provided data does not meet the requirements'
      });
      
    default:
      return res.status(500).json({
        error: 'Database error',
        message: 'An error occurred while processing your request'
      });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  requireClassEnrollment,
  handleDatabaseErrors,
  createErrorResponse
}; 