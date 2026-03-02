import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import recruitingService from '../services/recruitingService';
import recruiterHubService from '../services/recruiterHubService';
import { POSITION_ARCHETYPES } from '../constants/playerAttributes';
import AbilitySelector from '../components/AbilitySelector';

const POSITIONS = [
  'QB', 'HB', 'FB', 'WR', 'TE',
  'LT', 'LG', 'C', 'RG', 'RT',
  'LEDG', 'REDG', 'DT',
  'SAM', 'MIKE', 'WILL',
  'CB', 'FS', 'SS',
  'K', 'P'
];

const COMMITMENT_STATUSES = ['Committed', 'Considering', 'Not Interested', ''];

const EMPTY_RECRUIT = {
  first_name: '',
  last_name: '',
  position: '',
  archetype: '',
  abilities: {},
  stars: '',
  overall_rating: '',
  commitment_status: '',
  hometown: '',
  state: '',
};

const Recruiting = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const [recruits, setRecruits] = useState([]);
  const [positionAnalysis, setPositionAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRecruit, setNewRecruit] = useState({ ...EMPTY_RECRUIT });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [recruitsData, boardData] = await Promise.all([
        recruitingService.getRecruits(dynastyId),
        recruiterHubService.getRecruitingBoard(dynastyId),
      ]);
      setRecruits(recruitsData);
      setPositionAnalysis(boardData.positionAnalysis);
    } catch (err) {
      console.error('Failed to load recruiting data:', err);
      setError('Failed to load recruiting data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [dynastyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRecruit = async () => {
    try {
      setSaving(true);
      await recruitingService.createRecruit(dynastyId, {
        ...newRecruit,
        stars: newRecruit.stars ? parseInt(newRecruit.stars, 10) : null,
        overall_rating: newRecruit.overall_rating ? parseInt(newRecruit.overall_rating, 10) : null,
        archetype: newRecruit.archetype || undefined,
        abilities: Object.keys(newRecruit.abilities).length > 0 ? newRecruit.abilities : undefined,
      });
      setAddDialogOpen(false);
      setNewRecruit({ ...EMPTY_RECRUIT });
      setSnackbar({ open: true, message: 'Recruit added successfully.', severity: 'success' });
      await loadData();
    } catch (err) {
      console.error('Failed to add recruit:', err);
      setSnackbar({ open: true, message: 'Failed to add recruit.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecruit = async (recruitId) => {
    try {
      await recruitingService.deleteRecruit(dynastyId, recruitId);
      setSnackbar({ open: true, message: 'Recruit removed.', severity: 'success' });
      await loadData();
    } catch (err) {
      console.error('Failed to delete recruit:', err);
      setSnackbar({ open: true, message: 'Failed to remove recruit.', severity: 'error' });
    }
  };

  const getPositionNeedChip = (position) => {
    if (!positionAnalysis || !positionAnalysis[position]) return null;
    const analysis = positionAnalysis[position];
    if (analysis.status === 'CRITICAL') {
      return <Chip label={`Need ${analysis.needToRecruit}`} color="error" size="small" />;
    }
    if (analysis.status === 'WARNING') {
      return <Chip label="Warning" color="warning" size="small" />;
    }
    return <Chip label="OK" color="success" size="small" />;
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
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/recruiter-hub`)}
          >
            Recruiter Hub
          </Button>
          <Typography variant="h4" component="h1">
            Recruiting Board
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          Add Recruit
        </Button>
      </Box>

      {/* Position Needs Summary */}
      {positionAnalysis && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Position Needs Overview
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {(() => {
              const needPositions = POSITIONS.filter(pos => positionAnalysis[pos] && (positionAnalysis[pos].status === 'CRITICAL' || positionAnalysis[pos].status === 'WARNING'));
              if (needPositions.length === 0) {
                return <Typography color="textSecondary">All positions are adequately staffed.</Typography>;
              }
              return needPositions.map(pos => {
                const a = positionAnalysis[pos];
                return (
                  <Chip
                    key={pos}
                    label={`${pos}: Need ${a.needToRecruit} (${a.projectedCount}/${a.targetDepth})`}
                    color={a.status === 'CRITICAL' ? 'error' : 'warning'}
                    variant="outlined"
                  />
                );
              });
            })()}
          </Box>
        </Paper>
      )}

      {/* Recruiting Board Table */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Your Recruiting Board ({recruits.length} recruits)
            </Typography>
            {recruits.length === 0 ? (
              <Alert severity="info">
                No recruits on your board yet. Click &quot;Add Recruit&quot; to get started.
              </Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell align="center">Stars</TableCell>
                      <TableCell align="center">OVR</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Priority</TableCell>
                      <TableCell align="center">Position Need</TableCell>
                      <TableCell align="center">Location</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recruits.map((recruit) => (
                      <TableRow key={recruit.id} hover>
                        <TableCell>
                          <strong>{recruit.first_name} {recruit.last_name}</strong>
                        </TableCell>
                        <TableCell>{recruit.position}</TableCell>
                        <TableCell align="center">
                          {recruit.stars ? '★'.repeat(recruit.stars) : '-'}
                        </TableCell>
                        <TableCell align="center">{recruit.overall_rating || '-'}</TableCell>
                        <TableCell align="center">
                          {recruit.commitment_status ? (
                            <Chip
                              label={recruit.commitment_status}
                              color={
                                recruit.commitment_status === 'Committed' ? 'success' :
                                recruit.commitment_status === 'Considering' ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {recruit.priority_score != null ? Math.round(recruit.priority_score) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {getPositionNeedChip(recruit.position)}
                        </TableCell>
                        <TableCell align="center">
                          {recruit.hometown && recruit.state
                            ? `${recruit.hometown}, ${recruit.state}`
                            : recruit.state || recruit.hometown || '-'}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRecruit(recruit.id)}
                            aria-label="delete recruit"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Position Analysis Summary Cards */}
        {positionAnalysis && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Position Analysis
              </Typography>
              <Grid container spacing={1}>
                {POSITIONS.map(pos => {
                  const a = positionAnalysis[pos];
                  if (!a) return null;
                  const boardCount = recruits.filter(r => r.position === pos).length;
                  return (
                    <Grid item xs={6} sm={4} md={3} lg={2} key={pos}>
                      <Card variant="outlined" sx={{
                        borderColor: a.status === 'CRITICAL' ? 'error.main' : a.status === 'WARNING' ? 'warning.main' : 'success.main'
                      }}>
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="subtitle2">{pos}</Typography>
                          <Typography variant="caption" display="block" color="textSecondary">
                            Roster: {a.currentCount} | Target: {a.targetDepth}
                          </Typography>
                          <Typography variant="caption" display="block" color="textSecondary">
                            At Risk: {a.atRiskCount} | Need: {a.needToRecruit}
                          </Typography>
                          {boardCount > 0 && (
                            <Typography variant="caption" display="block" color="primary">
                              On Board: {boardCount}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add Recruit Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Recruit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                label="First Name"
                fullWidth
                required
                value={newRecruit.first_name}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, first_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Last Name"
                fullWidth
                required
                value={newRecruit.last_name}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, last_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Position"
                select
                fullWidth
                required
                value={newRecruit.position}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, position: e.target.value, archetype: '', abilities: {} }))}
              >
                {POSITIONS.map(pos => (
                  <MenuItem key={pos} value={pos}>
                    {pos}
                    {positionAnalysis && positionAnalysis[pos] && positionAnalysis[pos].status !== 'OK' && (
                      ` (Need ${positionAnalysis[pos].needToRecruit})`
                    )}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {newRecruit.position && POSITION_ARCHETYPES[newRecruit.position] && (
              <Grid item xs={6}>
                <TextField
                  label="Archetype"
                  select
                  fullWidth
                  value={newRecruit.archetype}
                  onChange={(e) => setNewRecruit(prev => ({ ...prev, archetype: e.target.value, abilities: {} }))}
                >
                  <MenuItem value="">Select an archetype</MenuItem>
                  {POSITION_ARCHETYPES[newRecruit.position].map(arch => (
                    <MenuItem key={arch} value={arch}>{arch}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={3}>
              <TextField
                label="Stars"
                type="number"
                fullWidth
                inputProps={{ min: 1, max: 5 }}
                value={newRecruit.stars}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, stars: e.target.value }))}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="OVR"
                type="number"
                fullWidth
                inputProps={{ min: 1, max: 99 }}
                value={newRecruit.overall_rating}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, overall_rating: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Commitment Status"
                select
                fullWidth
                value={newRecruit.commitment_status}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, commitment_status: e.target.value }))}
              >
                <MenuItem value="">None</MenuItem>
                {COMMITMENT_STATUSES.filter(s => s).map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Hometown"
                fullWidth
                value={newRecruit.hometown}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, hometown: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="State"
                fullWidth
                value={newRecruit.state}
                onChange={(e) => setNewRecruit(prev => ({ ...prev, state: e.target.value }))}
              />
            </Grid>
          </Grid>
          {newRecruit.position && newRecruit.archetype && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Abilities (Optional)
              </Typography>
              <AbilitySelector
                position={newRecruit.position}
                archetype={newRecruit.archetype}
                abilities={newRecruit.abilities}
                onChange={(newAbilities) => setNewRecruit(prev => ({ ...prev, abilities: newAbilities }))}
              />
            </Box>
          )}
          {newRecruit.position && positionAnalysis && positionAnalysis[newRecruit.position] && (
            <Alert
              severity={
                positionAnalysis[newRecruit.position].status === 'CRITICAL' ? 'error' :
                positionAnalysis[newRecruit.position].status === 'WARNING' ? 'warning' : 'success'
              }
              sx={{ mt: 2 }}
            >
              <strong>{newRecruit.position} Analysis:</strong>{' '}
              Current roster: {positionAnalysis[newRecruit.position].currentCount},{' '}
              Target: {positionAnalysis[newRecruit.position].targetDepth},{' '}
              At Risk: {positionAnalysis[newRecruit.position].atRiskCount},{' '}
              Need to Recruit: {positionAnalysis[newRecruit.position].needToRecruit}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddRecruit}
            variant="contained"
            disabled={saving || !newRecruit.first_name || !newRecruit.last_name || !newRecruit.position}
          >
            {saving ? 'Adding...' : 'Add Recruit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Container>
  );
};

export default Recruiting;
