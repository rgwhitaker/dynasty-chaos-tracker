# Automatic Migration System - How It Works

## Question: Will the database migration run automatically when I start the backend?

**Answer: YES ✅**

The Dynasty Chaos Tracker has a built-in automatic migration system. Your stat caps migration (`20260208_0216_add_stat_caps.sql`) will run automatically the first time you start the backend after deploying this code.

## How the System Works

### 1. Backend Startup Sequence

When you run `npm start` or `docker-compose up`, the backend follows this sequence:

```javascript
// backend/src/server.js (lines 62-80)
async function startServer() {
  try {
    // 1. Ensure uploads directory exists
    const uploadsDir = path.resolve(__dirname, '../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    // 2. Run database migrations 🎯
    await migrationRunner.runMigrations();
    
    // 3. Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

### 2. Migration Runner Process

The migration runner (`backend/src/config/migrations.js`) automatically:

1. **Creates migrations tracking table** (if it doesn't exist):
   ```sql
   CREATE TABLE IF NOT EXISTS migrations (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) UNIQUE NOT NULL,
     applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )
   ```

2. **Scans for migration files** in `backend/database/migrations/`:
   - Finds all `.sql` files
   - Sorts them alphabetically
   - Example: `20240101_0000_*.sql`, `20260208_0216_*.sql`

3. **Identifies pending migrations**:
   - Queries `migrations` table for applied migrations
   - Filters out already-applied migrations
   - Returns list of pending migrations

4. **Applies each pending migration**:
   - Reads SQL file content
   - Starts database transaction (`BEGIN`)
   - Executes SQL statements
   - Records migration in tracking table
   - Commits transaction (`COMMIT`)
   - If error: rolls back transaction (`ROLLBACK`)

### 3. Console Output

When you start the backend, you'll see output like this:

```bash
Starting database migrations...
✓ Migrations table initialized
Found 1 pending migration(s)
✓ Applied migration: 20260208_0216_add_stat_caps.sql
✓ All migrations completed successfully
Server running on port 3001
Environment: development
```

Or if all migrations are already applied:

```bash
Starting database migrations...
✓ Migrations table initialized
✓ All migrations are up to date
Server running on port 3001
```

## Your Stat Caps Migration

### File Details
- **Location**: `backend/database/migrations/20260208_0216_add_stat_caps.sql`
- **Status**: Ready to run
- **When**: Automatically on next backend start

### What It Does
```sql
-- Add stat_caps JSONB column to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS stat_caps JSONB;

-- Add stat_caps JSONB column to recruits table
ALTER TABLE recruits 
ADD COLUMN IF NOT EXISTS stat_caps JSONB;

-- Create GIN indexes for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_players_stat_caps 
  ON players USING GIN (stat_caps);
CREATE INDEX IF NOT EXISTS idx_recruits_stat_caps 
  ON recruits USING GIN (stat_caps);

-- Add column comments
COMMENT ON COLUMN players.stat_caps IS 'JSONB structure: ...';
COMMENT ON COLUMN recruits.stat_caps IS 'JSONB structure: ...';
```

### Safety Features
- ✅ Uses `IF NOT EXISTS` - won't fail if columns already exist
- ✅ Runs in transaction - rolls back on error
- ✅ Tracked in `migrations` table - won't run twice
- ✅ Applied before server starts - ensures schema is ready

## Verification

### Check Migration Status

After starting the backend, you can verify the migration ran:

**Option 1: Console Output**
Look for this line in the startup logs:
```
✓ Applied migration: 20260208_0216_add_stat_caps.sql
```

**Option 2: Query Database**
```sql
-- Check if migration was applied
SELECT * FROM migrations 
WHERE name = '20260208_0216_add_stat_caps.sql';

-- Should return:
-- id | name                              | applied_at
-- ---|-----------------------------------|----------------------------
-- 2  | 20260208_0216_add_stat_caps.sql  | 2026-02-08 12:34:56.789
```

**Option 3: Check Table Structure**
```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players' 
  AND column_name = 'stat_caps';

-- Should return:
-- column_name | data_type
-- ------------|----------
-- stat_caps   | jsonb
```

## Manual Migration (If Needed)

While migrations run automatically, you can also run them manually:

### Using psql
```bash
cd backend/database/migrations
psql -U dynasty_user -d dynasty_tracker \
  -f 20260208_0216_add_stat_caps.sql
```

### Using npm script
```bash
cd backend
npm run migrate
```

Note: The npm script may not be configured yet, but the automatic system works.

## Troubleshooting

### Migration Failed to Apply

If you see an error like:
```
✗ Error applying migration 20260208_0216_add_stat_caps.sql: ...
Migration failed: ...
```

**Steps to fix:**
1. Check the error message for details
2. Fix the SQL syntax if needed
3. If migration partially applied, check database state
4. Remove from tracking table if needed:
   ```sql
   DELETE FROM migrations 
   WHERE name = '20260208_0216_add_stat_caps.sql';
   ```
5. Restart backend to retry

### Migration Already Applied

If the migration already ran and you see:
```
✓ All migrations are up to date
```

This is normal! The migration ran successfully on a previous startup.

### Force Re-run Migration

To force a migration to run again:

```sql
-- 1. Remove from tracking table
DELETE FROM migrations 
WHERE name = '20260208_0216_add_stat_caps.sql';

-- 2. Optional: Drop the columns if they exist
ALTER TABLE players DROP COLUMN IF EXISTS stat_caps;
ALTER TABLE recruits DROP COLUMN IF EXISTS stat_caps;

-- 3. Restart backend - migration will run again
```

### Check All Applied Migrations

```sql
SELECT id, name, applied_at 
FROM migrations 
ORDER BY applied_at;
```

Example output:
```
 id |                  name                    |        applied_at
----|------------------------------------------|----------------------------
  1 | 20240101_0000_add_player_physical_...   | 2024-01-15 10:23:45.123
  2 | 20260208_0216_add_stat_caps.sql         | 2026-02-08 12:34:56.789
```

## Development Workflow

### Adding New Migrations in the Future

1. **Create new SQL file**:
   ```bash
   cd backend/database/migrations
   touch $(date +%Y%m%d_%H%M)_your_migration_name.sql
   ```

2. **Write SQL**:
   ```sql
   -- Use IF NOT EXISTS for idempotency
   ALTER TABLE players 
   ADD COLUMN IF NOT EXISTS new_field VARCHAR(50);
   ```

3. **Test locally**:
   - Start backend
   - Check console for migration success
   - Verify database changes

4. **Commit and deploy**:
   - Migration runs automatically on production startup
   - No manual intervention needed

### Best Practices

✅ **Use `IF NOT EXISTS`** - Makes migrations idempotent
✅ **Include comments** - Document what the migration does
✅ **Test locally first** - Catch errors before production
✅ **Keep migrations small** - One logical change per file
✅ **Never modify applied migrations** - Create new ones instead
✅ **Use transactions** - The system does this automatically

## Docker Deployment

When using Docker Compose:

```bash
docker-compose up -d
```

The migration happens automatically:
1. PostgreSQL container starts
2. Backend container starts
3. Backend connects to database
4. Migrations run automatically
5. Server starts accepting requests

## Summary

- ✅ **Automatic**: Migrations run on backend startup
- ✅ **Safe**: Transactions ensure atomicity
- ✅ **Tracked**: `migrations` table prevents duplicates
- ✅ **Logged**: Console output shows progress
- ✅ **Idempotent**: `IF NOT EXISTS` prevents errors
- ✅ **Ready**: Your stat caps migration is queued

**No manual action required** - just start the backend and the migration will run automatically!
