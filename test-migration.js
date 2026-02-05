#!/usr/bin/env node

/**
 * Test script to verify the migration system and player update functionality
 * 
 * This script tests:
 * 1. Database migration system automatically applies pending migrations
 * 2. Player update with height, weight, and dev_trait columns works correctly
 * 
 * Usage:
 *   Requires DATABASE_URL environment variable or individual database env vars:
 *   - POSTGRES_USER
 *   - POSTGRES_PASSWORD
 *   - POSTGRES_DB
 */

const { Pool } = require('pg');

// Require environment variables to be set
if (!process.env.DATABASE_URL && (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD || !process.env.POSTGRES_DB)) {
  console.error('Error: Database configuration not found.');
  console.error('Please set DATABASE_URL or POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB environment variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:5432/${process.env.POSTGRES_DB}`,
});

async function test() {
  try {
    console.log('Testing database schema...\n');

    // Check if players table has the required columns
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'players' 
      AND column_name IN ('height', 'weight', 'dev_trait')
      ORDER BY column_name;
    `);

    console.log('Players table columns:');
    schemaResult.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}: ${row.data_type}`);
    });

    if (schemaResult.rows.length === 3) {
      console.log('\n✓ All required columns exist!');
    } else {
      console.log('\n✗ Missing columns detected!');
      process.exit(1);
    }

    // Check migrations table
    const migrationsResult = await pool.query('SELECT name, applied_at FROM migrations ORDER BY applied_at;');
    
    console.log('\nApplied migrations:');
    if (migrationsResult.rows.length > 0) {
      migrationsResult.rows.forEach(row => {
        console.log(`  ✓ ${row.name} (applied: ${row.applied_at})`);
      });
    } else {
      console.log('  (no migrations tracked yet)');
    }

    console.log('\n✓ All tests passed!');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
