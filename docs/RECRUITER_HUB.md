# Recruiter Hub Feature

## Overview

The Recruiter Hub is a comprehensive dashboard that analyzes roster retention risks and provides recruiting recommendations. It helps dynasty managers identify which players are likely to leave the team and suggests how many recruits to target at each position and archetype.

## Features

### 1. Attrition Risk Analysis

The Recruiter Hub analyzes three types of player departure risks:

- **Dealbreaker Risk**: Players with dealbreaker flags indicating dissatisfaction (e.g., Conference Prestige C+, Playing Time C)
- **Draft Risk**: High-rated upperclassmen likely to declare for the NFL/CFL Draft (OVR >= 87 and class of JR, SR, RS SR, or GRAD)
- **Graduation Risk**: Players who will graduate (SR, RS SR, GRAD)

### 2. Depth Chart Mapping-Driven Demand

Recruiting demand is generated from configurable in-game depth chart slot mappings:

- Each game slot has a fixed slot count (e.g., QB=3, WR=6, KR=5).
- Each slot has ordered matching rules using website positions and optional archetypes.
- Rules are evaluated top-to-bottom for deterministic priority-fill demand allocation.
- Position+archetype rules feed specific archetype demand buckets.
- Position-only rules feed generic position demand buckets.
- Current roster + committed recruits are applied after translation, and at-risk players are subtracted.

### 3. Position-by-Position Analysis

The dashboard displays a comprehensive table showing:

- **Current Count**: Number of players currently at each position
- **At Risk**: Number of players likely to leave
- **Projected Count**: Expected roster count after departures
- **Target Depth**: Recommended minimum depth for each position
- **Need to Recruit**: How many players should be recruited to maintain depth
- **Status**: Visual indicator (CRITICAL, WARNING, or OK)

### 4. Dealbreaker Risk Breakdown

A dedicated section shows:

- Count of players at risk for each dealbreaker type
- Player names and details for each dealbreaker category
- Quick identification of systemic program issues

### 5. Drilldown View

Click any position in the table to see:

- Individual players at risk in that position
- Why each player is flagged (dealbreaker, draft risk, or graduating)
- Player details (name, year, overall rating, specific dealbreakers)
- Recruiting recommendations specific to that position

### 6. Overview Cards

Quick stats displayed at the top:

- Total Players on the roster
- Total Players at Risk (with percentage)
- Number of Critical Positions
- Number of Draft Prospects

## How to Use

### Accessing the Recruiter Hub

You can access the Recruiter Hub in two ways:

1. **From Dashboard**: Click the "Recruiter Hub" button on any dynasty card
2. **From Roster Page**: Click the "Recruiter Hub" button in the top-right corner of the Roster Depth Chart page

### Understanding the Status Indicators

- **CRITICAL** (Red): Position needs immediate recruiting attention (below target depth)
- **WARNING** (Yellow): Position may need attention (at target depth but has risk)
- **OK** (Green): Position is adequately staffed

### Making Recruiting Decisions

1. Review positions marked as CRITICAL first
2. Click on a position to see which specific players are at risk
3. Note the "Need to Recruit" number for that position
4. Click "Go to Recruiting" to start your recruiting search
5. Target recruits at positions with the highest need

## Technical Details

### Backend API

**Endpoint**: `GET /api/dynasties/:dynastyId/recruiter-hub`

**Response Structure**:
```json
{
  "positionAnalysis": {
    "QB": {
      "position": "QB",
      "currentCount": 4,
      "atRiskCount": 2,
      "projectedCount": 2,
      "targetDepth": 3,
      "needToRecruit": 1,
      "status": "WARNING",
      "risks": {
        "dealbreakersCount": 1,
        "draftRiskCount": 1,
        "graduatingCount": 1,
        "totalAtRisk": 2,
        "players": {
          "dealbreakers": [...],
          "draftRisk": [...],
          "graduating": [...]
        }
      }
    },
    ...
  },
  "overallStats": {
    "totalPlayers": 85,
    "totalAtRisk": 15,
    "totalDealbreakers": 5,
    "totalDraftRisk": 6,
    "totalGraduating": 8,
    "criticalPositions": 3,
    "warningPositions": 5
  },
  "dealbreakerBreakdown": [
    {
      "type": "Playing Time C+",
      "count": 3,
      "players": [...]
    },
    ...
  ]
}
```

### Risk Detection Logic

**Draft Risk**:
- Overall Rating >= 87
- Year is one of: JR, SR, RS SR, GRAD

**Graduation Risk**:
- Year is one of: SR, RS SR, GRAD

**Dealbreaker Risk**:
- Player has non-empty dealbreakers array

### Mapping Configuration Notes

- Use `GET /api/dynasties/:dynastyId/recruiter-hub/config` to retrieve active mapping + defaults.
- Use `PUT /api/dynasties/:dynastyId/recruiter-hub/config` to save rule overrides.
- Use `DELETE /api/dynasties/:dynastyId/recruiter-hub/config` to reset to defaults.
- Rule precedence is strictly ordered; first matching rule wins during priority-fill simulation.

## Future Enhancements

- ML-driven transfer risk scores per player based on historical data
- Integration with actual recruiting board
- Historical trend analysis across seasons
- Customizable target depth settings per position
- Export functionality for recruiting plans
- Notifications when positions become critical

## Development

### Running Tests

```bash
node backend/test-recruiter-hub.js
```

All tests should pass with 100% success rate.

### Files Modified/Added

**Backend**:
- `backend/src/services/recruiterHubService.js` - Core analysis logic
- `backend/src/controllers/recruiterHubController.js` - API controller
- `backend/src/routes/recruiterHub.js` - Route definition
- `backend/src/server.js` - Added route registration
- `backend/test-recruiter-hub.js` - Unit tests

**Frontend**:
- `frontend/src/pages/RecruiterHub.js` - Main UI component
- `frontend/src/services/recruiterHubService.js` - API service
- `frontend/src/App.js` - Route registration
- `frontend/src/pages/Dashboard.js` - Added navigation button
- `frontend/src/pages/RosterDepthChart.js` - Added navigation button

## Support

For issues or feature requests, please create a GitHub issue with the "Recruiter Hub" label.
