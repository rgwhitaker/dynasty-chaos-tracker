const fs = require('fs');
const path = require('path');
const db = require('./database');

/**
 * Migration runner that automatically applies pending database migrations
 */
class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, '../../database/migrations');
  }

  /**
   * Initialize the migrations tracking table
   */
  async initMigrationsTable() {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Migrations table initialized');
    } catch (error) {
      console.error('Error initializing migrations table:', error);
      throw error;
    }
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    try {
      const result = await db.query('SELECT name FROM migrations ORDER BY applied_at');
      return result.rows.map(row => row.name);
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      throw error;
    }
  }

  /**
   * Get list of migration files
   */
  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsDir)) {
      console.log('No migrations directory found');
      return [];
    }

    return fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  /**
   * Apply a single migration
   */
  async applyMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      // Run the migration SQL
      await db.query(sql);
      
      // Record that this migration has been applied
      await db.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [filename]
      );

      console.log(`✓ Applied migration: ${filename}`);
    } catch (error) {
      console.error(`✗ Error applying migration ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      console.log('Starting database migrations...');
      
      // Initialize migrations table
      await this.initMigrationsTable();

      // Get applied migrations and available migration files
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = this.getMigrationFiles();

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        file => !appliedMigrations.includes(file)
      );

      if (pendingMigrations.length === 0) {
        console.log('✓ All migrations are up to date');
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migration(s)`);

      // Apply each pending migration
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration);
      }

      console.log('✓ All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

module.exports = new MigrationRunner();
