const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper function to create consistent error responses
const createErrorResponse = (statusCode, error, message) => {
  return {
    status: 'error',
    error,
    message,
    timestamp: new Date().toISOString()
  };
};

// Enhanced token extraction with multiple fallback methods
const extractToken = (req) => {
  // Method 1: Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Method 2: x-access-token header
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'];
  }
  
  // Method 3: Query parameter (for certain use cases)
  if (req.query.token) {
    return req.query.token;
  }
  
  // Method 4: Cookie (if using cookie-based auth)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  
  return null;
};

// Enhanced JWT token validation
const validateToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token must be a non-empty string' };
  }
  
  // Check token format (basic validation)
  if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(token)) {
    return { valid: false, error: 'Token has invalid format' };
  }
  
  return { valid: true };
};

// Verify JWT token with enhanced security
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json(createErrorResponse(401, 'Access token required', 
        'Please provide a valid authentication token in the Authorization header, x-access-token header, or as a query parameter'));
    }

    // Validate token format before verification
    const tokenValidation = validateToken(token);
    if (!tokenValidation.valid) {
      return res.status(401).json(createErrorResponse(401, 'Invalid token format', tokenValidation.error));
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json(createErrorResponse(500, 'Server configuration error', 
        'Authentication is not properly configured'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'] // Only allow secure algorithms
    });
    
    if (!decoded.userId || !decoded.iat || !decoded.exp) {
      return res.status(401).json(createErrorResponse(401, 'Invalid token structure', 
        'The provided token has an invalid structure'));
    }
    
    // Check if token was issued before a certain date (for token revocation)
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    const minimumIssueDate = new Date('2024-01-01'); // Adjust as needed
    if (tokenIssuedAt < minimumIssueDate) {
      return res.status(401).json(createErrorResponse(401, 'Token revoked', 
        'This token has been revoked. Please log in again'));
    }
    
    // Enhanced user lookup with additional security checks
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId
      }
    });

    if (!user) {
      return res.status(401).json(createErrorResponse(401, 'Invalid token', 
        'User not found, account has been deleted, or account is inactive'));
    }

    // Add user info to request with additional metadata
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      tokenIssuedAt: tokenIssuedAt,
      tokenExpiresAt: new Date(decoded.exp * 1000),
      sessionId: decoded.sessionId || null
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(createErrorResponse(401, 'Invalid token', 
        'The provided token is invalid or malformed'));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(createErrorResponse(401, 'Token expired', 
        'The provided token has expired. Please log in again'));
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json(createErrorResponse(401, 'Token not active', 
        'The provided token is not yet active'));
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json(createErrorResponse(500, 'Authentication error', 
      'An error occurred during authentication. Please try again'));
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(createErrorResponse(401, 'Authentication required', 
        'Please authenticate first'));
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json(createErrorResponse(403, 'Insufficient permissions', 
        `Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
};

// Check if user owns the resource or is admin
const requireOwnership = (resourceTable, resourceIdField = 'id', ownerField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(createErrorResponse(401, 'Authentication required', 
          'Please authenticate first'));
      }

      // Admins can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json(createErrorResponse(400, 'Resource ID required', 
          'Resource ID is missing from request'));
      }

      // Check if user owns the resource
      const resource = await prisma[resourceTable].findUnique({
        where: {
          id: resourceId
        }
      });

      if (!resource) {
        return res.status(404).json(createErrorResponse(404, 'Resource not found', 
          'The requested resource does not exist'));
      }

      if (resource[ownerField] !== req.user.id) {
        return res.status(403).json(createErrorResponse(403, 'Access denied', 
          'You do not have permission to access this resource'));
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json(createErrorResponse(500, 'Authorization error', 
        'An error occurred during authorization'));
    }
  };
};

// Check if user is enrolled in class
const requireClassEnrollment = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(createErrorResponse(401, 'Authentication required', 
          'Please authenticate first'));
      }

      const classId = req.params.classId || req.body.classId;
      if (!classId) {
        return res.status(400).json(createErrorResponse(400, 'Class ID required', 
          'Class ID is missing from request'));
      }

      // Teachers and admins can access any class
      if (req.user.role === 'teacher' || req.user.role === 'admin') {
        return next();
      }

      // Check if student is enrolled in the class
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          classId: classId,
          studentId: req.user.id
        }
      });

      if (!enrollment) {
        return res.status(403).json(createErrorResponse(403, 'Not enrolled', 
          'You are not enrolled in this class'));
      }

      next();
    } catch (error) {
      console.error('Class enrollment check error:', error);
      res.status(500).json(createErrorResponse(500, 'Authorization error', 
        'An error occurred during authorization'));
    }
  };
};

// Handle database constraint violations
const handleDatabaseErrors = (error, req, res, next) => {
  console.error('Database error:', error);
  
  // Handle specific PostgreSQL error codes
  switch (error.code) {
    case 'P2002': // Unique violation
      if (error.meta?.target?.includes('class_name_per_teacher')) {
        return res.status(409).json(createErrorResponse(409, 'Duplicate resource', 
          'A class with this name already exists for this teacher'));
      }
      if (error.meta?.target?.includes('class_name_per_teacher')) {
        return res.status(409).json(createErrorResponse(409, 'Duplicate resource', 
          'This resource already exists'));
      }
      return res.status(409).json(createErrorResponse(409, 'Duplicate resource', 
        'A resource with these details already exists'));
      
    case 'P2025': // Foreign key violation
      return res.status(400).json(createErrorResponse(400, 'Invalid reference', 
        'The referenced resource does not exist'));
      
    case 'P2023': // Not null violation
      return res.status(400).json(createErrorResponse(400, 'Missing required field', 
        'A required field is missing'));
      
    case 'P2021': // Check violation
      return res.status(400).json(createErrorResponse(400, 'Invalid data', 
        'The provided data does not meet the requirements'));
      
    default:
      return res.status(500).json(createErrorResponse(500, 'Database error', 
        'An error occurred while processing your request'));
  }
};

// Utility function to check if token needs refresh
const shouldRefreshToken = (req) => {
  if (!req.user || !req.user.tokenExpiresAt) {
    return false;
  }
  
  const now = new Date();
  const expiresAt = new Date(req.user.tokenExpiresAt);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();
  const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return timeUntilExpiry < fiveMinutes;
};

// Utility function to generate new token
const generateNewToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: Math.random().toString(36).substring(2, 15), // Generate unique session ID
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    algorithm: 'HS256'
  });
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  requireClassEnrollment,
  handleDatabaseErrors,
  createErrorResponse,
  extractToken,
  validateToken,
  shouldRefreshToken,
  generateNewToken
}; 