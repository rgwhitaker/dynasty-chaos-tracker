# Dynasty Chaos Tracker

Dynasty Chaos Tracker is a comprehensive web application for College Football 26 dynasty mode management. Upload in-game roster screenshots for automatic OCR import, track player attributes with custom weighting systems, generate automated depth charts, and manage recruiting with ML-powered predictions.

## Features

### Epic 1: User Authentication & Profile Management
- ✅ Email/password registration and login
- ✅ Google OAuth integration
- ✅ Twitter OAuth support (configured via environment variables)
- ✅ Multiple dynasties per user with full metadata tracking
- ✅ Season year and week tracking

### Epic 2: Roster Import & Data Entry
- ✅ **Multi-provider OCR**: Tesseract.js, AWS Textract, Google Cloud Vision
- ✅ **Batch Upload**: Process multiple screenshots at once
- ✅ **Image Preprocessing**: Automatic sharpening, normalization, and thresholding
- ✅ **Validation System**: Error detection with manual correction support
- ✅ **JSONB Attributes**: Flexible storage for all 55 CFB26 player ratings
- ✅ **Complete Player Attributes**: All 55 ratings (OVR, SPD, ACC, AGI, COD, STR, AWR, CAR, BCV, BTK, TRK, SFA, SPM, JKM, CTH, CIT, SPC, SRR, MRR, DRR, RLS, JMP, THP, SAC, MAC, DAC, RUN, TUP, BSK, PAC, PBK, PBP, PBF, RBK, RBP, RBF, LBK, IBL, PRC, TAK, POW, BSH, FMV, PMV, PUR, MCV, ZCV, PRS, RET, KPW, KAC, STA, TGH, INJ, LSP), Height, Weight, and Dev Trait (Normal/Impact/Star/Elite)
- ✅ **Manual CRUD**: Full forms with autocomplete for manual entry
- ✅ **Version Tracking**: Season progression with roster snapshots

### Epic 3: Attribute Tracking & Customization
- ✅ **Dynamic Attributes**: JSONB storage supports all 55 position-specific attributes
- ✅ **Custom Weighting**: User-defined weights (0-100%) per position
- ✅ **Stud Score Engine**: Weighted sum formula with preset management
- ✅ **Multiple Presets**: Save and load different schemes (e.g., "Run-Heavy Offense", "Air Raid")
- ✅ **Dealbreaker Tracking**: Player and recruit dealbreaker flags
- ✅ **Departure Predictions**: ML-powered analytics for identifying players likely to leave

### Epic 4: Depth Chart Management
- ✅ **Auto-Generation**: Depth charts based on calculated Stud Scores
- ✅ **Manual Overrides**: Drag-to-reorder with override flags
- ✅ **Export Options**: PDF and CSV export
- ✅ **Shareable Links**: Generate time-limited public links
- 🔄 D3.js visual depth chart (frontend visualization in progress)

### Epic 5: Recruiting & Predictions
- ✅ **Recruiter Hub**: Comprehensive dashboard analyzing roster retention risks and recruiting needs
  - Dealbreaker risk tracking (players with dissatisfaction flags)
  - Draft risk identification (OVR >= 87 upperclassmen)
  - Graduation tracking (seniors and grad students)
  - Position-by-position recruiting recommendations
  - Drilldown views with specific player details
- ✅ **Gap Analysis**: Automatic recruiting needs based on roster composition
- ✅ **Dealbreaker Forecasting**: Match recruit preferences to your dynasty
- ✅ **Priority Scoring**: ML-based recruit ranking
- ✅ **Commitment Predictions**: Probability calculations
- ✅ **Email Notifications**: Reminders and alerts for recruiting season

### Epic 6: Analytics & Visualizations
- ✅ **Backend Analytics**: Full data aggregation and calculations
- 🔄 Chart.js dashboards (frontend components in progress)
- 🔄 Position strength heatmaps (frontend visualization in progress)
- ✅ **Season Tracking**: Full backend support for progression
- ✅ **Community Features**: Share dynasties with public/private links

### Epic 7: Admin & Maintenance
- ✅ **Data Export**: Full roster dumps and backups
- 🔄 Admin panel (frontend interface in progress)

## Tech Stack

### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Database**: PostgreSQL 15 with JSONB support
- **Authentication**: JWT + Passport.js (Local, Google OAuth, Twitter OAuth)
- **OCR**: Tesseract.js, AWS Textract, Google Cloud Vision
- **Image Processing**: Sharp for preprocessing
- **File Upload**: Multer with optional S3 support
- **Notifications**: Nodemailer for email alerts
- **Export**: PDFKit and CSV-Writer
- **Caching**: Redis-ready (Bull queue integration)
- **Monitoring**: Sentry error tracking

### Frontend
- **Framework**: React 18 with functional components and hooks
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **Charts**: Chart.js with react-chartjs-2
- **Visualizations**: D3.js for depth charts
- **Forms**: Formik with Yup validation
- **File Upload**: React-Dropzone

### DevOps
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Web Server**: Nginx (production frontend)
- **Deployment**: Ready for AWS/GCP/Azure
- **CI/CD**: Docker-ready for automated pipelines

## Project Structure

```
dynasty-chaos-tracker/
├── backend/
│   ├── database/
│   │   └── init.sql                 # PostgreSQL schema
│   ├── src/
│   │   ├── config/                  # DB and auth configuration
│   │   │   ├── database.js
│   │   │   └── passport.js
│   │   ├── controllers/             # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── playerController.js
│   │   │   ├── depthChartController.js
│   │   │   ├── ocrController.js
│   │   │   ├── recruitingController.js
│   │   │   └── studScoreController.js
│   │   ├── middleware/              # Auth and error handling
│   │   ├── models/                  # Data models (optional)
│   │   ├── routes/                  # API routes
│   │   │   ├── auth.js
│   │   │   ├── dynasties.js
│   │   │   ├── players.js
│   │   │   ├── ocr.js
│   │   │   ├── depthChart.js
│   │   │   ├── recruiting.js
│   │   │   └── studScore.js
│   │   ├── services/                # Business logic
│   │   │   ├── ocrService.js        # Multi-provider OCR
│   │   │   ├── studScoreService.js  # Weighted scoring
│   │   │   ├── depthChartService.js
│   │   │   ├── recruitingService.js # ML predictions
│   │   │   ├── notificationService.js
│   │   │   └── exportService.js     # PDF/CSV export
│   │   ├── utils/                   # Helper functions
│   │   └── server.js                # Express app entry
│   ├── uploads/                     # Screenshot storage
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Layout.js
│   │   │   └── PrivateRoute.js
│   │   ├── pages/                   # Route pages
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── DynastyList.js
│   │   │   ├── RosterManagement.js
│   │   │   ├── DepthChart.js
│   │   │   ├── Recruiting.js
│   │   │   └── StudScoreConfig.js
│   │   ├── store/                   # Redux store
│   │   │   ├── index.js
│   │   │   └── slices/
│   │   │       ├── authSlice.js
│   │   │       ├── dynastySlice.js
│   │   │       ├── playerSlice.js
│   │   │       └── recruitingSlice.js
│   │   ├── services/                # API clients
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── dynastyService.js
│   │   │   ├── playerService.js
│   │   │   └── recruitingService.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── theme.js                 # MUI theme config
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── .env.example                     # Environment template
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (optional but recommended)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/rgwhitaker/dynasty-chaos-tracker.git
cd dynasty-chaos-tracker
```

2. **Configure environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET`, `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for OAuth)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (for Textract)
- `GOOGLE_APPLICATION_CREDENTIALS` (for Vision API)

### Running with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

### Running Locally (Development)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Database Setup

The database schema is automatically initialized via Docker. For manual setup:

```bash
psql -U dynasty_user -d dynasty_tracker -f backend/database/init.sql
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/twitter` - Twitter OAuth

### Dynasties
- `GET /api/dynasties` - List user's dynasties
- `POST /api/dynasties` - Create dynasty
- `PUT /api/dynasties/:id` - Update dynasty
- `DELETE /api/dynasties/:id` - Delete dynasty

### Roster Management
- `GET /api/dynasties/:id/players` - List players
- `POST /api/dynasties/:id/players` - Add player
- `PUT /api/dynasties/:id/players/:playerId` - Update player
- `DELETE /api/dynasties/:id/players/:playerId` - Delete player

### OCR Import
- `POST /api/dynasties/:id/ocr/upload` - Single screenshot
- `POST /api/dynasties/:id/ocr/upload-batch` - Multiple screenshots
- `GET /api/dynasties/:id/ocr/status/:uploadId` - Check status

### Depth Chart
- `GET /api/dynasties/:id/depth-chart` - Get depth chart
- `POST /api/dynasties/:id/depth-chart/generate` - Auto-generate
- `PUT /api/dynasties/:id/depth-chart` - Manual update
- `GET /api/dynasties/:id/depth-chart/export/pdf` - Export PDF
- `GET /api/dynasties/:id/depth-chart/export/csv` - Export CSV
- `POST /api/dynasties/:id/depth-chart/share` - Generate share link

### Recruiting
- `GET /api/dynasties/:id/recruiting` - List recruits
- `GET /api/dynasties/:id/recruiting/targets` - Get priority targets
- `POST /api/dynasties/:id/recruiting` - Add recruit

### Recruiter Hub
- `GET /api/dynasties/:id/recruiter-hub` - Analyze roster attrition risks and recruiting needs

### Stud Score
- `GET /api/stud-score/presets` - List weight presets
- `POST /api/stud-score/presets` - Create preset
- `GET /api/stud-score/weights` - Get weights
- `PUT /api/stud-score/weights` - Update weight

## Player Attributes

The Dynasty Chaos Tracker supports all 55 player ratings from College Football 26, plus physical attributes (Height & Weight) and Development Trait (Normal/Impact/Star/Elite).

For a comprehensive list of all player attributes, see [PLAYER_ATTRIBUTES.md](docs/PLAYER_ATTRIBUTES.md).

## Key Features Explained

### OCR Import Flow
1. User uploads screenshot(s)
2. System preprocesses images (grayscale, sharpen, threshold)
3. OCR engine extracts text (Tesseract/Textract/Vision)
4. Parser extracts player data
5. Validation checks for errors
6. Manual correction interface if needed
7. Bulk import to database

### Stud Score Calculation
```
StudScore = Σ(AttributeValue × Weight) / ΣWeights
```
- User defines weights per position per attribute
- System normalizes to 0-100 scale
- Multiple presets for different schemes
- Used for depth chart auto-generation

### Recruiting Predictions
- **Commitment Probability**: Based on stars, status, historical data
- **Dealbreaker Fit**: Matches recruit preferences to dynasty characteristics
- **Priority Score**: Combines need, quality, and fit
- **Gap Analysis**: Identifies positions needing recruits based on graduation

## Contributing

This is a demonstration project implementing comprehensive requirements for CFB 26 dynasty management. Feel free to fork and extend!

## License

MIT

## Acknowledgments

Built to address the need for powerful dynasty mode management tools for College Football 26 players.

