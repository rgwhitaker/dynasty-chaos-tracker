import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  PersonSearch as PersonSearchIcon,
  School as SchoolIcon,
  EmojiEvents as TrophyIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as TransferIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import recruiterHubService from '../services/recruiterHubService';

const RecruiterHub = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPosition, setExpandedPosition] = useState(null);

  useEffect(() => {
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynastyId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recruiterHubService.getRecruiterHubAnalysis(dynastyId);
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to load recruiter hub analysis:', err);
      setError('Failed to load analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL':
        return 'error';
      case 'WARNING':
        return 'warning';
      case 'OK':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'CRITICAL':
        return <ErrorIcon />;
      case 'WARNING':
        return <WarningIcon />;
      case 'OK':
        return <CheckCircleIcon />;
      default:
        return null;
    }
  };

  const handlePositionExpand = (position) => {
    setExpandedPosition(expandedPosition === position ? null : position);
  };

  const handleNavigateToRecruiting = () => {
    navigate(`/dynasties/${dynastyId}/recruiting`);
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!analysis) {
    return (
      <Container>
        <Alert severity="info" sx={{ mt: 2 }}>
          No analysis data available.
        </Alert>
      </Container>
    );
  }

  const { positionAnalysis, overallStats, dealbreakerBreakdown } = analysis;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/roster`)}
          >
            Back to Roster
          </Button>
          <Typography variant="h4" component="h1">
            Recruiter Hub
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PersonSearchIcon />}
          onClick={handleNavigateToRecruiting}
        >
          Go to Recruiting
        </Button>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <SchoolIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Total Players
                </Typography>
              </Box>
              <Typography variant="h4">{overallStats.totalPlayers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingDownIcon color="error" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Players at Risk
                </Typography>
              </Box>
              <Typography variant="h4" color="error.main">
                {overallStats.totalAtRisk}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {((overallStats.totalAtRisk / overallStats.totalPlayers) * 100).toFixed(1)}% of roster
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <ErrorIcon color="error" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Critical Positions
                </Typography>
              </Box>
              <Typography variant="h4">{overallStats.criticalPositions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrophyIcon color="warning" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Draft Prospects
                </Typography>
              </Box>
              <Typography variant="h4">{overallStats.totalDraftRisk}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risk Breakdown */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Position-by-Position Analysis
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell align="center">Current</TableCell>
                    <TableCell align="center">At Risk</TableCell>
                    <TableCell align="center">Projected</TableCell>
                    <TableCell align="center">Target</TableCell>
                    <TableCell align="center">Need to Recruit</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.values(positionAnalysis)
                    .filter(pos => pos.currentCount > 0 || pos.needToRecruit > 0)
                    .sort((a, b) => {
                      // Sort by status (CRITICAL first, then WARNING, then OK)
                      const statusOrder = { CRITICAL: 0, WARNING: 1, OK: 2 };
                      return statusOrder[a.status] - statusOrder[b.status];
                    })
                    .map((pos) => (
                      <TableRow
                        key={pos.position}
                        hover
                        onClick={() => handlePositionExpand(pos.position)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <strong>{pos.position}</strong>
                        </TableCell>
                        <TableCell align="center">{pos.currentCount}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={pos.atRiskCount}
                            color={pos.atRiskCount > 0 ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">{pos.projectedCount}</TableCell>
                        <TableCell align="center">{pos.targetDepth}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={pos.needToRecruit}
                            color={pos.needToRecruit > 0 ? 'warning' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(pos.status)}
                            label={pos.status}
                            color={getStatusColor(pos.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Position Details Accordion */}
          {expandedPosition && positionAnalysis[expandedPosition] && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {expandedPosition} - Player Details
              </Typography>
              
              {positionAnalysis[expandedPosition].risks.players.dealbreakers.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Dealbreaker Risks ({positionAnalysis[expandedPosition].risks.dealbreakersCount})
                  </Typography>
                  <List dense>
                    {positionAnalysis[expandedPosition].risks.players.dealbreakers.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemText
                          primary={player.name}
                          secondary={`${player.year} | OVR: ${player.overall} | Dealbreakers: ${player.dealbreakers.join(', ')}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {positionAnalysis[expandedPosition].risks.players.transferIntent && positionAnalysis[expandedPosition].risks.players.transferIntent.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    <TransferIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                    Transfer Intent ({positionAnalysis[expandedPosition].risks.transferIntentCount})
                  </Typography>
                  <List dense>
                    {positionAnalysis[expandedPosition].risks.players.transferIntent.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemText
                          primary={player.name}
                          secondary={`${player.year} | OVR: ${player.overall}${player.dealbreakers ? ` | Dealbreakers: ${player.dealbreakers.join(', ')}` : ''}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {positionAnalysis[expandedPosition].risks.players.draftRisk.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    Draft Risk ({positionAnalysis[expandedPosition].risks.draftRiskCount})
                  </Typography>
                  <List dense>
                    {positionAnalysis[expandedPosition].risks.players.draftRisk.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemText
                          primary={player.name}
                          secondary={`${player.year} | OVR: ${player.overall} (Draft Eligible)`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {positionAnalysis[expandedPosition].risks.players.graduating.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="info.main" gutterBottom>
                    Graduating ({positionAnalysis[expandedPosition].risks.graduatingCount})
                  </Typography>
                  <List dense>
                    {positionAnalysis[expandedPosition].risks.players.graduating.map((player) => (
                      <ListItem key={player.id}>
                        <ListItemText
                          primary={player.name}
                          secondary={`${player.year} | OVR: ${player.overall}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {positionAnalysis[expandedPosition].needToRecruit > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Recommendation:</strong> You need to recruit{' '}
                  <strong>{positionAnalysis[expandedPosition].needToRecruit}</strong> more{' '}
                  {expandedPosition}(s) to maintain adequate depth.
                </Alert>
              )}
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Dealbreaker Risk Breakdown
            </Typography>
            {dealbreakerBreakdown.length === 0 ? (
              <Typography color="textSecondary">
                No dealbreaker risks detected.
              </Typography>
            ) : (
              <List>
                {dealbreakerBreakdown.map((dealbreaker, index) => (
                  <React.Fragment key={dealbreaker.type}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1">{dealbreaker.type}</Typography>
                            <Chip label={dealbreaker.count} color="error" size="small" />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            {dealbreaker.players.slice(0, 3).map((player) => (
                              <Typography key={player.id} variant="caption" display="block">
                                {player.name} ({player.position}, {player.year})
                              </Typography>
                            ))}
                            {dealbreaker.players.length > 3 && (
                              <Typography variant="caption" color="textSecondary">
                                +{dealbreaker.players.length - 3} more
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Dealbreaker Risks"
                  secondary={overallStats.totalDealbreakers}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Transfer Intent"
                  secondary={overallStats.totalTransferIntent}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Draft Prospects"
                  secondary={overallStats.totalDraftRisk}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Graduating Players"
                  secondary={overallStats.totalGraduating}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default RecruiterHub;
