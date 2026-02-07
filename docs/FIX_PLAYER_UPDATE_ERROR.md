# Fix: Player Update Error - Missing Height Column

## Problem

Users were encountering an error when updating players:

```
error: column "height" of relation "players" does not exist
```

This occurred when trying to update players through the API endpoint `PUT /api/dynasties/:id/players/:playerId`.

## Root Cause

The issue affected users with **existing databases** created before the `height`, `weight`, and `dev_trait` columns were added to the schema:

1. The initial `init.sql` schema now includes these columns
2. A migration file (`add_player_physical_attributes.sql`) exists to add these columns to existing databases
3. However, the migration was not automatically applied - users had to run it manually
4. Users with old databases would get errors when the code tried to update these non-existent columns

## Solution

Implemented an **automatic database migration system** that:

1. **Tracks Applied Migrations**: Creates a `migrations` table to record which migrations have been applied
2. **Auto-applies Pending Migrations**: On backend startup, checks for and applies any pending migrations from `backend/database/migrations/`
3. **Prevents Re-application**: Safely skips migrations that have already been applied
4. **Logs Migration Status**: Provides clear console output about migration status

### Files Changed

1. **backend/src/config/migrations.js** (new)
   - Migration runner implementation
   - Tracks migrations in database
   - Applies pending migrations automatically

2. **backend/src/server.js** (modified)
   - Runs migrations before starting the server
   - Ensures database schema is up-to-date before handling requests

3. **backend/database/migrations/README.md** (new)
   - Documentation for the migration system
   - Instructions for creating new migrations
   - Troubleshooting guide

4. **DEPLOYMENT.md** (updated)
   - Added information about automatic migrations
   - Updated deployment instructions

5. **CHANGELOG_PLAYER_ATTRIBUTES.md** (updated)
   - Added automatic migration instructions
   - Kept manual migration option for reference

## How It Works

### First Startup (New Installation)
```
Starting database migrations...
✓ Migrations table initialized
Found 1 pending migration(s)
✓ Applied migration: add_player_physical_attributes.sql
✓ All migrations completed successfully
Server running on port 3001
```

### Subsequent Startups
```
Starting database migrations...
✓ Migrations table initialized
✓ All migrations are up to date
Server running on port 3001
```

### Existing Database (First Time with New Code)
```
Starting database migrations...
✓ Migrations table initialized
Found 1 pending migration(s)
✓ Applied migration: add_player_physical_attributes.sql
✓ All migrations completed successfully
Server running on port 3001
```

## Benefits

1. **Zero Downtime**: Migrations apply automatically on deployment
2. **No Manual Steps**: Users don't need to remember to run migration scripts
3. **Idempotent**: Safe to restart the backend - migrations won't be reapplied
4. **Future-Proof**: New migrations can be added to `backend/database/migrations/` and they'll be automatically applied
5. **Trackable**: The `migrations` table provides a clear audit trail

## Testing

To verify the fix:

1. **With Docker Compose**:
   ```bash
   docker-compose up
   # Check logs for migration messages
   docker-compose logs backend
   ```

2. **Manual Test**:
   ```bash
   # Start the database
   docker-compose up -d postgres
   
   # Run test script
   cd backend
   npm install
   node ../test-migration.js
   ```

3. **Test Player Update**:
   ```bash
   # The player update endpoint now works correctly
   curl -X PUT http://localhost:3001/api/dynasties/1/players/1 \
     -H "Content-Type: application/json" \
     -d '{
       "first_name": "John",
       "last_name": "Doe",
       "height": "6'\''3\"",
       "weight": 225,
       "dev_trait": "Star"
     }'
   ```

## Migration Files

Current migrations in `backend/database/migrations/`:

- **20240101_0000_add_player_physical_attributes.sql** - Adds height, weight, and dev_trait columns to players and recruits tables

### Naming Convention

Migrations use the format `YYYYMMDD_HHMM_description.sql` to ensure chronological execution order.

## Creating New Migrations

To add a new migration in the future:

1. Create a new `.sql` file in `backend/database/migrations/`
2. Use a descriptive name (e.g., `add_injury_tracking.sql`)
3. Write idempotent SQL using `IF NOT EXISTS` clauses where possible
4. The migration will be automatically applied on the next backend startup

Example:
```sql
-- Migration: Add injury tracking
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS injury_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS weeks_injured INTEGER DEFAULT 0;
```

## Backward Compatibility

- Existing databases will have migrations applied automatically
- New installations get the full schema from `init.sql`
- The migration system is idempotent - safe to run multiple times
- No breaking changes to the API

## For Users Experiencing This Issue

If you encountered the "height column does not exist" error:

1. **With Docker**: Simply restart your backend container
   ```bash
   docker-compose restart backend
   ```

2. **Without Docker**: Pull the latest code and restart your backend
   ```bash
   git pull
   cd backend
   npm install
   npm run dev
   ```

The migration will be applied automatically and the error will be resolved.
