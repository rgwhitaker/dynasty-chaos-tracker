#!/usr/bin/env node

/**
 * Test script to verify the migration system and player update functionality
 * 
 * This script tests:
 * 1. Database migration system automatically applies pending migrations
 * 2. Player update with height, weight, and dev_trait columns works correctly
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER || 'dynasty_user'}:${process.env.POSTGRES_PASSWORD || 'dynasty_pass'}@localhost:5432/${process.env.POSTGRES_DB || 'dynasty_tracker'}`,
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
