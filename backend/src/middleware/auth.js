const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// When running inside Docker, `localhost` refers to the container itself.
// If SUPABASE_URL is configured as `http://localhost:...`, rewrite it so
// the container can reach Supabase running on the host machine.
const isRunningInDocker = fs.existsSync('/.dockerenv');
const SUPABASE_URL_RAW = (process.env.SUPABASE_URL || '').trim();

const rewriteSupabaseUrlForDocker = (urlString) => {
  if (!isRunningInDocker || !urlString) return urlString;

  try {
    const url = new URL(urlString);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.hostname = 'host.docker.internal';
    }
    return url.toString();
  } catch {
    // Minimal fallback if the URL isn't parseable.
    return urlString.replace(/localhost|127\.0\.0\.1/, 'host.docker.internal');
  }
};

const SUPABASE_URL = rewriteSupabaseUrlForDocker(SUPABASE_URL_RAW);

// Your env file currently uses `SUPABASE_SECRET_KEY`, so support both names.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

const toCamelCase = (value) =>
  value.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

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

// Authenticate using Supabase access tokens.
// Client sends: `Authorization: Bearer <supabase_access_token>`
const authenticateToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json(
        createErrorResponse(
          401,
          'Access token required',
          'Please provide a valid authentication token in the Authorization header, x-access-token header, or as a query parameter'
        )
      );
    }

    // Basic format check: Supabase access tokens are JWTs.
    const tokenValidation = validateToken(token);
    if (!tokenValidation.valid) {
      return res
        .status(401)
        .json(createErrorResponse(401, 'Invalid token format', tokenValidation.error));
    }

    if (!supabaseAdmin) {
      console.error('Supabase auth config missing');
      return res.status(500).json(
        createErrorResponse(
          500,
          'Server configuration error',
          'Supabase auth is not properly configured (missing SUPABASE_URL or service role key)'
        )
      );
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json(
        createErrorResponse(401, 'Invalid token', 'Supabase token validation failed')
      );
    }

    const authUser = data.user;

    // Load your app profile data (role, names) from Prisma.
    // Ideally `public.users` is populated by a DB trigger; as a safety net, we create it if missing.
    let user = await prisma.user.findUnique({ where: { id: authUser.id } });

    if (!user) {
      const meta = authUser.user_metadata || {};
      const firstName =
        meta.firstName || meta.first_name || meta.given_name || 'User';
      const lastName =
        meta.lastName || meta.last_name || meta.family_name || 'Unknown';
      const role = meta.role || 'student';
      const verified = role === 'admin';

      user = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email,
          passwordHash: '', // legacy column; Supabase Auth is the source of truth for credentials
          firstName,
          lastName,
          role,
          verified
        }
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // If the user is not verified, only allow access to profile endpoints.
    // Admins are always allowed to pass this gate.
    const isProfileEndpoint =
      typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api/auth/profile');

    if (req.user.role !== 'admin' && req.user.verified === false && !isProfileEndpoint) {
      return res.status(403).json(
        createErrorResponse(
          403,
          'Account pending verification',
          'Please contact an administrator to verify your account'
        )
      );
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json(
      createErrorResponse(401, 'Invalid token', 'Supabase token verification failed')
    );
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

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json(createErrorResponse(400, 'Resource ID required', 
          'Resource ID is missing from request'));
      }

      const prismaModelKeyMap = {
        classes: 'class',
        assignments: 'assignment',
        calendar_events: 'calendarEvent'
      };
      const prismaModelKey = prismaModelKeyMap[resourceTable] || resourceTable;
      const model = prisma[prismaModelKey];

      if (!model || typeof model.findUnique !== 'function') {
        return res.status(500).json(
          createErrorResponse(500, 'Authorization error', `Invalid model: ${prismaModelKey}`)
        );
      }

      // Check if user owns the resource
      const where = {};
      where[resourceIdField] = resourceId;
      const resource = await model.findUnique({ where });

      if (!resource) {
        return res.status(404).json(createErrorResponse(404, 'Resource not found', 
          'The requested resource does not exist'));
      }

      const ownerFieldCamel = toCamelCase(ownerField);
      const ownerValue = resource[ownerField] ?? resource[ownerFieldCamel];

      if (ownerValue !== req.user.id) {
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

      // Teachers can access any class
      if (req.user.role === 'teacher') {
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

// Utility function to generate new token (legacy, kept for compatibility)
// When using Supabase Auth, the backend relies on Supabase tokens instead.
const generateNewToken = () => {
  throw new Error('Legacy JWT token generation is not supported with Supabase Auth');
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