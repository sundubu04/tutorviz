#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const { Pool } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bright}${colors.blue}=== ${step} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Check if PostgreSQL is running
function checkPostgreSQL() {
  try {
    execSync('pg_isready', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Test database connection
async function testDatabaseConnection(config) {
  const testPool = new Pool({
    host: config.host,
    port: config.port,
    database: 'postgres', // Connect to default postgres database first
    user: config.user,
    password: config.password,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });

  try {
    await testPool.query('SELECT 1');
    await testPool.end();
    return true;
  } catch (error) {
    await testPool.end();
    return false;
  }
}

// Create database if it doesn't exist
async function createDatabase(config) {
  const adminPool = new Pool({
    host: config.host,
    port: config.port,
    database: 'postgres', // Connect to default postgres database
    user: config.user,
    password: config.password,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Check if database exists
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [config.database]
    );

    if (result.rows.length === 0) {
      logInfo(`Creating database '${config.database}'...`);
      await adminPool.query(`CREATE DATABASE ${config.database}`);
      logSuccess(`Database '${config.database}' created successfully`);
    } else {
      logInfo(`Database '${config.database}' already exists`);
    }
  } catch (error) {
    logError(`Failed to create database: ${error.message}`);
    throw error;
  } finally {
    await adminPool.end();
  }
}

// Create .env file from template
function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, 'env.example');
  
  if (fs.existsSync(envPath)) {
    logInfo('.env file already exists');
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    logError('env.example file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  fs.writeFileSync(envPath, envContent);
  logSuccess('Created .env file from template');
}

// Get user input
function getUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Update .env file with user input
async function configureEnvironment() {
  logStep('Environment Configuration');
  
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  logInfo('Please provide the following configuration values:');
  logInfo('(Press Enter to use default values)');

  // Database configuration
  const dbPassword = await getUserInput('Database password (default: postgres): ') || 'postgres';
  const dbName = await getUserInput('Database name (default: tutoriai_db): ') || 'tutoriai_db';
  const dbUser = await getUserInput('Database user (default: postgres): ') || 'postgres';
  const dbHost = await getUserInput('Database host (default: localhost): ') || 'localhost';
  const dbPort = await getUserInput('Database port (default: 5432): ') || '5432';

  // Server configuration
  const port = await getUserInput('Server port (default: 3001): ') || '3001';
  const jwtSecret = await getUserInput('JWT secret (default: tutoriai_jwt_secret_2024): ') || 'tutoriai_jwt_secret_2024';

  // Update env content
  envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPassword}`);
  envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${dbName}`);
  envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${dbUser}`);
  envContent = envContent.replace(/DB_HOST=.*/, `DB_HOST=${dbHost}`);
  envContent = envContent.replace(/DB_PORT=.*/, `DB_PORT=${dbPort}`);
  envContent = envContent.replace(/PORT=.*/, `PORT=${port}`);
  envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);

  fs.writeFileSync(envPath, envContent);
  logSuccess('Environment configuration updated');

  return {
    host: dbHost,
    port: parseInt(dbPort),
    database: dbName,
    user: dbUser,
    password: dbPassword
  };
}

// Install dependencies
function installDependencies() {
  logStep('Installing Dependencies');
  
  try {
    logInfo('Installing npm dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    logSuccess('Dependencies installed successfully');
  } catch (error) {
    logError('Failed to install dependencies');
    process.exit(1);
  }
}

// Setup database
async function setupDatabase(config) {
  logStep('Database Setup');
  
  try {
    // Test connection to PostgreSQL
    logInfo('Testing PostgreSQL connection...');
    const canConnect = await testDatabaseConnection(config);
    
    if (!canConnect) {
      logError('Cannot connect to PostgreSQL with provided credentials');
      logWarning('Please check:');
      logWarning('1. PostgreSQL is running');
      logWarning('2. User credentials are correct');
      logWarning('3. PostgreSQL is accepting connections');
      process.exit(1);
    }
    
    logSuccess('PostgreSQL connection successful');

    // Create database if it doesn't exist
    await createDatabase(config);

    // Initialize database schema and sample data
    logInfo('Initializing database schema...');
    execSync('npm run init-db', { stdio: 'inherit', cwd: __dirname });
    logSuccess('Database initialized successfully');
    
  } catch (error) {
    logError(`Database setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
function runTests() {
  logStep('Running Tests');
  
  try {
    logInfo('Running test suite...');
    execSync('npm test', { stdio: 'inherit', cwd: __dirname });
    logSuccess('All tests passed');
  } catch (error) {
    logError('Some tests failed');
    logWarning('Continuing with setup...');
  }
}

// Verify setup
function verifySetup() {
  logStep('Verifying Setup');
  
  // Check if .env exists
  if (!fs.existsSync(path.join(__dirname, '.env'))) {
    logError('.env file not found');
    return false;
  }

  // Check if node_modules exists
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    logError('node_modules not found - dependencies not installed');
    return false;
  }

  // Check if package.json exists
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    logError('package.json not found');
    return false;
  }

  // Check if server.js exists
  if (!fs.existsSync(path.join(__dirname, 'server.js'))) {
    logError('server.js not found');
    return false;
  }

  logSuccess('Setup verification completed');
  return true;
}

// Display next steps
function displayNextSteps() {
  logStep('Setup Complete!');
  
  logSuccess('Backend setup completed successfully');
  logInfo('\nNext steps:');
  logInfo('1. Start the backend server: npm start');
  logInfo('2. Start the frontend server (from project root): cd ../frontend && python -m http.server 3000');
  logInfo('3. Open your browser to: http://localhost:3000');
  logInfo('\nDevelopment commands:');
  logInfo('- Backend dev mode: npm run dev');
  logInfo('- Run tests: npm test');
  logInfo('- Initialize database: npm run init-db');
  logInfo('\nAPI Documentation:');
  logInfo('- Base URL: http://localhost:3001');
  logInfo('- Health check: GET /api/health');
  logInfo('- Whiteboards: GET/POST /api/whiteboards');
  logInfo('- Users: GET/POST /api/users');
}

// Main setup function
async function main() {
  log(`${colors.bright}${colors.magenta}🚀 TutoriAI Backend Setup${colors.reset}`);
  log(`${colors.cyan}This script will set up the backend for TutoriAI${colors.reset}\n`);

  try {
    // Check prerequisites
    logStep('Checking Prerequisites');
    
    if (!commandExists('node')) {
      logError('Node.js is not installed. Please install Node.js first.');
      process.exit(1);
    }
    logSuccess('Node.js is installed');

    if (!commandExists('npm')) {
      logError('npm is not installed. Please install npm first.');
      process.exit(1);
    }
    logSuccess('npm is installed');

    if (!commandExists('psql')) {
      logWarning('PostgreSQL client (psql) not found. Make sure PostgreSQL is installed.');
    } else {
      logSuccess('PostgreSQL client found');
    }

    if (!checkPostgreSQL()) {
      logWarning('PostgreSQL is not running. Please start PostgreSQL before continuing.');
      logInfo('You can start PostgreSQL with: brew services start postgresql (macOS)');
      logInfo('Or: sudo systemctl start postgresql (Linux)');
      logInfo('Or: Start PostgreSQL service from Services (Windows)');
      
      const continueAnyway = await getUserInput('Continue anyway? (y/N): ');
      if (continueAnyway.toLowerCase() !== 'y' && continueAnyway.toLowerCase() !== 'yes') {
        logInfo('Setup cancelled. Please start PostgreSQL and run setup again.');
        process.exit(0);
      }
    } else {
      logSuccess('PostgreSQL is running');
    }

    // Create .env file
    createEnvFile();

    // Configure environment
    const dbConfig = await configureEnvironment();

    // Install dependencies
    installDependencies();

    // Setup database
    await setupDatabase(dbConfig);

    // Run tests
    runTests();

    // Verify setup
    if (!verifySetup()) {
      logError('Setup verification failed');
      process.exit(1);
    }

    // Display next steps
    displayNextSteps();

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createEnvFile,
  configureEnvironment,
  installDependencies,
  setupDatabase,
  runTests,
  verifySetup
}; 