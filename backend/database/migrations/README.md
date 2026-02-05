# Database Migrations

This directory contains database migration files that are automatically applied when the backend server starts.

## How It Works

1. When the backend server starts, it checks for pending migrations in this directory
2. It tracks which migrations have been applied in the `migrations` table
3. Any new `.sql` files are automatically executed in alphabetical order
4. Migration status is logged to the console

## Migration Files

Migrations are executed in alphabetical order. Use a naming convention like:

```
YYYY_MM_DD_description.sql
```

or

```
001_description.sql
002_another_migration.sql
```

### Current Migrations

- `add_player_physical_attributes.sql` - Adds height, weight, and dev_trait columns to players and recruits tables

## Creating New Migrations

1. Create a new `.sql` file in this directory
2. Write your DDL statements (ALTER TABLE, CREATE INDEX, etc.)
3. Use `IF NOT EXISTS` or `IF EXISTS` where possible for idempotency
4. Test the migration on a development database first

Example:

```sql
-- Migration: Add new column
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS new_column VARCHAR(50);

-- Add index
CREATE INDEX IF NOT EXISTS idx_players_new_column 
ON players(new_column);
```

## Manual Migration

If you need to run migrations manually:

```bash
# For a specific migration
psql -U dynasty_user -d dynasty_tracker -f add_player_physical_attributes.sql

# For all migrations
for file in *.sql; do
  psql -U dynasty_user -d dynasty_tracker -f "$file"
done
```

## Docker Setup

Migrations are automatically run when using Docker Compose:
1. The backend container starts
2. The migration runner initializes the migrations table
3. Pending migrations are applied
4. The server starts normally

## Troubleshooting

### Migration Failed

If a migration fails:
1. Check the error message in the console
2. Fix the SQL in the migration file
3. If the migration partially applied, you may need to manually revert changes
4. Restart the backend to retry

### Force Re-run Migration

To force a migration to re-run:

```sql
-- Remove from migrations table
DELETE FROM migrations WHERE name = 'migration_filename.sql';
```

Then restart the backend.

### Check Migration Status

```sql
-- See which migrations have been applied
SELECT * FROM migrations ORDER BY applied_at;
```
