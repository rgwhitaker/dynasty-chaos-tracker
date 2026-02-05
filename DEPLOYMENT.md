# Dynasty Chaos Tracker - Deployment Guide

## Quick Start (Docker Compose)

The fastest way to get the app running:

```bash
# 1. Clone the repository
git clone https://github.com/rgwhitaker/dynasty-chaos-tracker.git
cd dynasty-chaos-tracker

# 2. Copy environment file and configure
cp .env.example .env
# Edit .env with your settings (see Configuration section)

# 3. Start all services
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Database: localhost:5432
```

## Configuration

### Required Environment Variables

Edit `.env` with the following:

#### Database
```env
POSTGRES_USER=dynasty_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=dynasty_tracker
POSTGRES_PORT=5432
```

#### Backend
```env
NODE_ENV=production
BACKEND_PORT=3001
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
```

#### Frontend
```env
FRONTEND_PORT=3000
REACT_APP_API_URL=http://localhost:3001
```

### Optional Services

#### AWS Textract (for OCR)
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

#### Google Cloud Vision (for OCR)
```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

#### Google OAuth
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

#### Twitter OAuth
```env
TWITTER_CONSUMER_KEY=your_twitter_consumer_key
TWITTER_CONSUMER_SECRET=your_twitter_consumer_secret
```

#### Email Notifications
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@dynastytracker.com
```

## Local Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

The backend will run on port 3001 with hot-reload.

### Frontend Development

```bash
cd frontend
npm install
npm start
```

The frontend will run on port 3000 with hot-reload and proxy API requests to port 3001.

### Database Setup (Local)

```bash
# Create database
createdb dynasty_tracker

# Run initial schema
psql -d dynasty_tracker -f backend/database/init.sql

# Migrations are automatically applied when the backend starts
# Or run them manually:
psql -d dynasty_tracker -f backend/database/migrations/add_player_physical_attributes.sql
```

## Production Deployment

### AWS / Cloud Deployment

1. **Build and push Docker images:**

```bash
# Backend
cd backend
docker build -t your-registry/dynasty-backend:latest .
docker push your-registry/dynasty-backend:latest

# Frontend
cd ../frontend
docker build -t your-registry/dynasty-frontend:latest .
docker push your-registry/dynasty-frontend:latest
```

2. **Deploy to ECS/EKS/Cloud Run:**
   - Use the provided docker-compose.yml as reference
   - Set up RDS PostgreSQL instance
   - Configure environment variables in cloud service
   - Set up load balancer for frontend
   - Configure S3 for image uploads (optional)

3. **Database Migration:**

```bash
# On production database - run initial schema
psql $DATABASE_URL -f backend/database/init.sql

# Migrations are automatically applied when the backend starts
# The backend will run any pending migrations from backend/database/migrations/
# Check logs to verify migrations were applied successfully
```

### Environment-Specific Configuration

#### Production
- Set `NODE_ENV=production`
- Use strong JWT_SECRET and SESSION_SECRET
- Enable HTTPS
- Set up CDN for static assets
- Configure Redis for session storage
- Enable Sentry error tracking

#### Staging
- Set `NODE_ENV=staging`
- Use separate database
- Test OAuth redirects
- Verify email delivery

## Monitoring & Maintenance

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Check all containers
docker-compose ps
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U dynasty_user dynasty_tracker > backup.sql

# Restore backup
cat backup.sql | docker-compose exec -T postgres psql -U dynasty_user dynasty_tracker
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if postgres is running
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U dynasty_user -d dynasty_tracker -c "SELECT 1"
```

### Frontend Can't Reach Backend

- Verify `REACT_APP_API_URL` is set correctly
- Check nginx proxy configuration
- Ensure backend is running: `docker-compose logs backend`

### OCR Not Working

- For Tesseract: Installed automatically with dependencies
- For Textract: Verify AWS credentials
- For Google Vision: Verify service account JSON path

### OAuth Redirect Issues

- Ensure callback URLs match in OAuth provider settings
- Check `OAUTH_CALLBACK_URL` environment variable
- Verify frontend URL in backend OAuth response

## Performance Optimization

### Production Settings

1. **Enable Redis for sessions and caching:**
   - Add Redis service to docker-compose.yml
   - Configure session store in backend

2. **Enable S3 for file storage:**
   - Configure multer-s3 in backend
   - Set AWS credentials

3. **Database Optimization:**
   - Create indexes (already in init.sql)
   - Set up read replicas for scaling
   - Enable connection pooling (configured in backend)

4. **Frontend Optimization:**
   - Build is already optimized with production webpack
   - Enable gzip in nginx (add to nginx.conf)
   - Set up CDN for static assets

## Scaling

### Horizontal Scaling

- Backend: Deploy multiple instances behind load balancer
- Database: Use PostgreSQL read replicas
- File Storage: Move to S3 or cloud storage
- Session Storage: Use Redis cluster

### Resource Recommendations

**Minimum (Development):**
- 2 CPU cores
- 4 GB RAM
- 20 GB storage

**Recommended (Production < 1000 users):**
- 4 CPU cores
- 8 GB RAM
- 100 GB storage
- Separate database server

**High Traffic (10k+ users):**
- Multiple backend instances (2-4 CPUs each)
- Dedicated database (8+ CPUs, 32+ GB RAM)
- Redis cluster for caching
- CDN for static assets
- S3 for file storage

## Security Checklist

- [ ] Change default JWT_SECRET and SESSION_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure CORS properly for production domain
- [ ] Set up rate limiting on API endpoints
- [ ] Enable Helmet.js security headers (already configured)
- [ ] Regularly update dependencies
- [ ] Set up automated backups
- [ ] Configure Sentry for error monitoring
- [ ] Review and rotate OAuth credentials
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Enable database SSL connections

## Support

For issues and questions:
- GitHub Issues: https://github.com/rgwhitaker/dynasty-chaos-tracker/issues
- Documentation: See README.md

## License

MIT
