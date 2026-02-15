# Dynasty Chaos Tracker

A web application for managing College Football 25 dynasty mode rosters. Import player data via screenshot OCR, track player attributes and development potential, manage depth charts, and analyze recruiting needs.

> **Note:** This is an independent fan-made tool to help manage your dynasty mode experience. It is not affiliated with or endorsed by EA Sports or College Football 25.

## What Does This App Do?

Dynasty Chaos Tracker helps you manage your College Football dynasty by:

1. **Importing Rosters** - Upload screenshots of in-game roster screens and the app automatically extracts player data using OCR (Optical Character Recognition)
2. **Managing Players** - View and edit all player information including 55 in-game ratings, physical stats (height/weight), development traits, and archetype
3. **Tracking Development** - Monitor player potential with the stat cap tracking system that shows which attributes can still be upgraded
4. **Building Depth Charts** - Automatically generate depth charts based on player ratings, or manually organize your lineup
5. **Analyzing Recruiting Needs** - Get insights on which positions need recruits based on graduation, transfer risk, and draft declarations
6. **Managing Recruits** - Track recruiting targets with dealbreaker preferences and commitment predictions

## Key Features

### Roster Management
- **AI-Powered OCR Import**: Upload roster screenshots and let AI extract player data automatically
  - Supports multiple OCR providers (Tesseract, AWS Textract, Google Vision, OpenAI GPT-4o-mini)
  - Batch upload multiple screenshots at once
  - AI post-processing corrects common OCR errors
  - Manual correction interface for validation
- **Manual Entry**: Add and edit players manually with comprehensive forms
- **Complete Player Tracking**: Track all 55 in-game ratings plus physical attributes and development traits
  - All position-specific ratings (speed, strength, awareness, catching, blocking, tackling, etc.)
  - Physical stats: Height and weight
  - Development trait: Normal, Impact, Star, or Elite
- **Player Archetypes**: Track player archetype (e.g., Pocket Passer, Dual Threat, Pure Power)

### Player Development Tracking
- **Stat Cap System**: Visual tracking of upgrade potential for each player
  - 20-block upgrade system per stat group
  - Color-coded display: purchased blocks, available blocks, capped blocks
  - Potential Score (0-100%) shows remaining development capacity
  - Adjusted Stud Score combines current ratings with future potential
- **Position-Specific Groups**: Each position has 6-7 stat groups (e.g., QB has Accuracy, Power, Mobility)
- **Transfer Intent Flags**: Track which players are unhappy and may transfer

### Depth Charts
- **Auto-Generation**: Generate depth charts automatically using player ratings
- **Custom Weighting**: Define your own rating weights per position (e.g., prioritize speed for WRs)
- **Manual Override**: Drag and drop to reorder the depth chart manually
- **Export**: Download as PDF or CSV
- **Shareable Links**: Generate public links to share your depth chart

### Recruiter Hub
- **Attrition Analysis**: Identifies players at risk of leaving
  - Draft risk (upperclassmen with OVR >= 87)
  - Graduation tracking (seniors and grad students)
  - Transfer risk (players with dealbreaker flags)
- **Position Needs**: Recommends which positions need recruits
- **Drilldown Views**: See specific players in each risk category

### Recruiting Management
- **Recruit Tracking**: Manage your recruiting board with stars, ratings, and physical attributes
- **Dealbreaker Matching**: Track recruit preferences and see how they fit your dynasty
- **Priority Scoring**: AI-powered ranking of recruits based on need and quality
- **Commitment Predictions**: Probability calculations for landing recruits

### Multi-Dynasty Support
- **Multiple Saves**: Manage multiple dynasty saves in one account
- **Season Tracking**: Track season year and current week
- **Roster Versions**: Save roster snapshots as seasons progress

### User Management
- **Email/Password**: Standard account creation
- **Google OAuth**: Sign in with your Google account
- **Twitter OAuth**: Sign in with your Twitter account

## Technology Stack

### Backend
- Node.js + Express.js
- PostgreSQL 15 (with JSONB for flexible player attributes)
- JWT + Passport.js authentication (local, Google OAuth, Twitter OAuth)
- OCR: Tesseract.js, AWS Textract, Google Cloud Vision, OpenAI GPT-4o-mini
- Image processing with Sharp
- PDF/CSV export with PDFKit and CSV-Writer

### Frontend
- React 18 with Material-UI (MUI) v5
- Redux Toolkit for state management
- React Router v6
- Chart.js for visualizations
- Formik + Yup for forms and validation
- React-Dropzone for file uploads

### Deployment
- Docker + Docker Compose for containerization
- Nginx web server
- Ready for cloud deployment (AWS, GCP, Azure)

## Getting Started

### Quick Start with Docker (Recommended)

1. **Clone and configure**
   ```bash
   git clone https://github.com/rgwhitaker/dynasty-chaos-tracker.git
   cd dynasty-chaos-tracker
   cp .env.example .env
   ```

2. **Edit `.env` file** with your settings:
   - Database credentials (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
   - JWT secrets (JWT_SECRET, SESSION_SECRET)
   - Optional: OAuth credentials for Google/Twitter login
   - Optional: OCR API keys (AWS, Google Cloud, OpenAI)

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the app**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Database: localhost:5432

### Local Development (Without Docker)

**Prerequisites:**
- Node.js 18+
- PostgreSQL 15+

**Backend:**
```bash
cd backend
npm install

# Set up database
createdb dynasty_tracker
psql -d dynasty_tracker -f database/init.sql

# Start dev server
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Environment Configuration

The application works out of the box with default settings. For full functionality, configure these optional services:

**OCR Services** (for screenshot imports):
- **Tesseract.js**: Built-in, no configuration needed
- **OpenAI GPT-4o-mini**: Add `OPENAI_API_KEY` for improved accuracy
- **AWS Textract**: Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- **Google Cloud Vision**: Add `GOOGLE_APPLICATION_CREDENTIALS` path

**OAuth Login** (optional):
- **Google**: Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- **Twitter**: Add `TWITTER_CONSUMER_KEY` and `TWITTER_CONSUMER_SECRET`

See `.env.example` for all configuration options.

## How to Use

### 1. Create Your Dynasty
- Sign up for an account (email/password or OAuth)
- Create a new dynasty with your team name, school, conference, and season info

### 2. Import Your Roster
- Navigate to Roster Management
- Upload screenshots of your in-game roster screens
- The app will automatically extract player data using OCR
- Review and correct any errors in the validation screen
- Players are imported with all attributes automatically

### 3. Track Player Development
- View your roster with all player ratings
- Edit player stat caps to track upgrade potential
- See which players have the most room to grow
- Monitor transfer intent flags for players who might leave

### 4. Manage Your Depth Chart
- View auto-generated depth charts based on ratings
- Customize rating weights for each position
- Manually reorder players as needed
- Export and share your depth chart

### 5. Plan Your Recruiting
- Use the Recruiter Hub to see which players are leaving
- Identify position needs based on graduation and transfers
- Add recruits to your board with ratings and preferences
- Track dealbreakers to find recruits that fit your dynasty

## Common Workflows

### Importing a Full Roster
1. Take screenshots of each position group in-game
2. Go to Roster Management → OCR Import
3. Upload all screenshots at once (batch upload)
4. Wait for processing (AI extracts player data)
5. Review validation results
6. Fix any incorrect data
7. Confirm import

### Building a Custom Depth Chart
1. Go to Stud Score Configuration
2. Create a new weight preset (e.g., "Speed Focused")
3. Adjust attribute weights for each position
4. Save the preset
5. Go to Depth Chart → Generate
6. Select your custom preset
7. Review and make manual adjustments if needed
8. Export as PDF or share via link

### Analyzing Recruiting Needs
1. Go to Recruiter Hub
2. Review players at risk of leaving:
   - Draft declarations (high-rated upperclassmen)
   - Transfers (dealbreaker issues)
   - Graduations (seniors)
3. Check position-by-position recommendations
4. Add priority recruits to your board
5. Track their commitment status

## Additional Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment guide for production environments
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Stat cap tracking system implementation details
- **[AI_OCR_SUMMARY.md](AI_OCR_SUMMARY.md)** - AI-powered OCR post-processing documentation
- **[MIGRATION_FLOW_DIAGRAM.md](MIGRATION_FLOW_DIAGRAM.md)** - Database migration workflow

## Screenshots & Demo

*Screenshots coming soon - this is an active development project*

## Contributing

This is a personal project for managing College Football dynasty mode. Feel free to fork and customize for your own needs!

## License

MIT

## Project Status

This application is actively being developed. Core features are functional:
- ✅ User authentication (email/password, Google OAuth, Twitter OAuth)
- ✅ Multi-dynasty management
- ✅ AI-powered OCR roster imports
- ✅ Comprehensive player tracking (55 in-game ratings + physical attributes + dev traits)
- ✅ Stat cap tracking system with visual editor
- ✅ Depth chart generation and customization
- ✅ Recruiter Hub with attrition analysis
- ✅ Recruiting management

Some features are still in development or planned for future releases. Check the issues page for current work and planned enhancements.

## Support

For bugs or feature requests, please [open an issue](https://github.com/rgwhitaker/dynasty-chaos-tracker/issues) on GitHub.

