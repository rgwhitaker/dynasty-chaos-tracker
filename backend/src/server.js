const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const migrationRunner = require('./config/migrations');

// Validate required environment variables
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
const missingEnvVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]?.trim());

if (missingEnvVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please create a .env file in the root directory based on .env.example');
  console.error('   Example: cp .env.example .env\n');
  process.exit(1);
}

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dynasties', require('./routes/dynasties'));
app.use('/api/dynasties/:dynastyId/players', require('./routes/players'));
app.use('/api/dynasties/:dynastyId/ocr', require('./routes/ocr'));
app.use('/api/dynasties/:dynastyId/depth-chart', require('./routes/depthChart'));
app.use('/api/dynasties/:dynastyId/recruiting', require('./routes/recruiting'));
app.use('/api/stud-score', require('./routes/studScore'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Run migrations and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.resolve(__dirname, '../uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    
    // Run database migrations
    await migrationRunner.runMigrations();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
