#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function createDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  };

  const targetDatabase = process.env.DB_NAME || 'tutoriai_db';

  const adminPool = new Pool({
    ...config,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  });

  try {
    logInfo('Connecting to PostgreSQL...');
    
    // Test connection
    await adminPool.query('SELECT 1');
    logSuccess('Connected to PostgreSQL');

    // Check if database exists
    logInfo(`Checking if database '${targetDatabase}' exists...`);
    const result = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase]
    );

    if (result.rows.length === 0) {
      logInfo(`Creating database '${targetDatabase}'...`);
      await adminPool.query(`CREATE DATABASE ${targetDatabase}`);
      logSuccess(`Database '${targetDatabase}' created successfully`);
    } else {
      logInfo(`Database '${targetDatabase}' already exists`);
    }

  } catch (error) {
    logError(`Failed to create database: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      logError('Cannot connect to PostgreSQL. Make sure it is running.');
    } else if (error.code === '28P01') {
      logError('Authentication failed. Check your database credentials.');
    } else if (error.code === '42501') {
      logError('Permission denied. Make sure your user has CREATE DATABASE privileges.');
    }
    
    process.exit(1);
  } finally {
    await adminPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  log(`${colors.bright}${colors.blue}🗄️  Database Creation Script${colors.reset}`);
  log(`${colors.cyan}This script creates the database for TutoriAI${colors.reset}\n`);

  createDatabase()
    .then(() => {
      logSuccess('Database creation completed');
      process.exit(0);
    })
    .catch((error) => {
      logError(`Database creation failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = createDatabase; 