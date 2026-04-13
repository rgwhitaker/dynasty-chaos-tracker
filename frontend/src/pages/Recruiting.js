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
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import recruitingService from '../services/recruitingService';
import recruiterHubService from '../services/recruiterHubService';
import playerService from '../services/playerService';
import { ATTRIBUTE_DISPLAY_NAMES, POSITION_ARCHETYPES } from '../constants/playerAttributes';
import AbilitySelector from '../components/AbilitySelector';
import { useStudScoreAttributes } from '../hooks/useStudScoreAttributes';
import useMobileDetect from '../hooks/useMobileDetect';

const POSITIONS = [
  'QB', 'HB', 'FB', 'WR', 'TE',
  'LT', 'LG', 'C', 'RG', 'RT',
  'LEDG', 'REDG', 'DT',
  'SAM', 'MIKE', 'WILL',
  'CB', 'FS', 'SS',
  'K', 'P'
];

const COMMITMENT_STATUSES = ['Committed', 'Considering', 'Not Interested', ''];
const RECRUIT_CLASSES = ['High School', 'Transfer'];
const GEM_STATUSES = ['Gem', 'Bust', 'Unknown'];
const DEV_TRAITS = ['Unknown', 'Normal', 'Impact', 'Star', 'Elite'];
const ATTRIBUTE_CATEGORIES = {
  Physical: ['SPD', 'ACC', 'AGI', 'COD', 'STR', 'JMP', 'STA', 'TGH', 'INJ'],
  Awareness: ['AWR', 'PRC'],
  'Ball Carrier': ['CAR', 'BCV', 'BTK', 'TRK', 'SFA', 'SPM', 'JKM'],
  Receiving: ['CTH', 'CIT', 'SPC', 'SRR', 'MRR', 'DRR', 'RLS'],
  Passing: ['THP', 'SAC', 'MAC', 'DAC', 'TUP', 'BSK', 'PAC'],
  Blocking: ['PBK', 'PBP', 'PBF', 'RBK', 'RBP', 'RBF', 'LBK', 'IBL', 'RUN'],
  Defense: ['TAK', 'POW', 'BSH', 'FMV', 'PMV', 'PUR'],
  Coverage: ['MCV', 'ZCV', 'PRS'],
  'Special Teams': ['RET', 'KPW', 'KAC', 'LSP'],
};

const EMPTY_RECRUIT = {
  first_name: '',
  last_name: '',
  position: '',
  stars: '',
  archetype: '',
  abilities: {},
  recruit_class: 'High School',
  gem_status: 'Unknown',
  dev_trait: 'Unknown',
  attributes: {},
  commitment_status: '',
};

const Recruiting = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useMobileDetect();
  const [recruits, setRecruits] = useState([]);
  const [positionAnalysis, setPositionAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecruit, setEditingRecruit] = useState(null);
  const [newRecruit, setNewRecruit] = useState({ ...EMPTY_RECRUIT });
  const [saving, setSaving] = useState(false);
  const [advancingSeason, setAdvancingSeason] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const addFormStudScoreAttrs = useStudScoreAttributes(dynastyId, newRecruit.position, newRecruit.archetype);
  const editFormStudScoreAttrs = useStudScoreAttributes(dynastyId, editingRecruit?.position, editingRecruit?.archetype);

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

  const buildRecruitPayload = (recruitData) => {
    const filteredAttributes = Object.entries(recruitData.attributes || {})
      .reduce((acc, [key, value]) => {
        if (value === '' || value === null || value === undefined) return acc;
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) return acc;
        return { ...acc, [key]: numericValue };
      }, {});

    return {
      ...recruitData,
      stars: recruitData.stars ? parseInt(recruitData.stars, 10) : null,
      attributes: filteredAttributes,
      overall_rating: filteredAttributes.OVR ?? null,
      dev_trait: recruitData.dev_trait || 'Unknown',
      abilities: recruitData.abilities && Object.keys(recruitData.abilities).length > 0 ? recruitData.abilities : undefined,
    };
  };

  const handleRecruitFieldChange = (setter) => (field, value) => {
    setter((prev) => {
      const updates = { ...prev, [field]: value };
      if (field === 'position') {
        updates.archetype = '';
        updates.abilities = {};
      }
      if (field === 'archetype') {
        updates.abilities = {};
      }
      return updates;
    });
  };

  const handleRecruitAttributeChange = (setter) => (attribute, value) => {
    setter((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [attribute]: value,
      },
    }));
  };

  const handleAddRecruit = async () => {
    try {
      setSaving(true);
      await recruitingService.createRecruit(dynastyId, buildRecruitPayload(newRecruit));
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

  const handleOpenEditRecruit = (recruit) => {
    setEditingRecruit({
      ...EMPTY_RECRUIT,
      ...recruit,
      stars: recruit.stars || '',
      attributes: recruit.attributes || {},
      abilities: recruit.abilities || {},
      recruit_class: recruit.recruit_class || 'High School',
      gem_status: recruit.gem_status || 'Unknown',
      dev_trait: recruit.dev_trait || 'Unknown',
    });
    setEditDialogOpen(true);
  };

  const handleSaveRecruit = async () => {
    if (!editingRecruit) return;
    try {
      setSaving(true);
      await recruitingService.updateRecruit(dynastyId, editingRecruit.id, buildRecruitPayload(editingRecruit));
      setEditDialogOpen(false);
      setEditingRecruit(null);
      setSnackbar({ open: true, message: 'Recruit updated successfully.', severity: 'success' });
      await loadData();
    } catch (err) {
      console.error('Failed to update recruit:', err);
      setSnackbar({ open: true, message: 'Failed to update recruit.', severity: 'error' });
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

  const handleAdvanceSeason = async () => {
    const confirmed = window.confirm(
      'Advance to the next season? This will move committed recruits to the roster, progress player years, process redshirts, and move graduates off the depth chart.'
    );

    if (!confirmed) return;

    try {
      setAdvancingSeason(true);
      const result = await playerService.advanceSeason(dynastyId);
      const summary = result?.summary || {};
      setSnackbar({
        open: true,
        message: `Season advanced: ${summary.recruitsMoved || 0} recruits moved, ${summary.graduatesMoved || 0} graduates, ${summary.redshirtsProcessed || 0} redshirts processed.`,
        severity: 'success',
      });
      await loadData();
    } catch (err) {
      console.error('Failed to advance season:', err);
      setSnackbar({ open: true, message: 'Failed to advance season.', severity: 'error' });
    } finally {
      setAdvancingSeason(false);
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

  const renderAttributeFields = (recruitData, setRecruitData, relevantAttributes) => (
    Object.entries(ATTRIBUTE_CATEGORIES).map(([category, categoryAttributes]) => {
      const filteredAttrs = relevantAttributes
        ? categoryAttributes.filter(attr => relevantAttributes.has(attr))
        : categoryAttributes;

      if (filteredAttrs.length === 0) return null;

      return (
        <Grid item xs={12} key={category}>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>{category}</Typography>
          <Grid container spacing={1}>
            {filteredAttrs.map(attr => (
              <Grid item xs={6} sm={4} md={3} key={attr}>
                <TextField
                  label={ATTRIBUTE_DISPLAY_NAMES[attr] || attr}
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, max: 99 }}
                  value={recruitData.attributes?.[attr] ?? ''}
                  onChange={(e) => handleRecruitAttributeChange(setRecruitData)(attr, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
      );
    })
  );

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
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
        <Box display="flex" gap={1} flexWrap="wrap" width={{ xs: '100%', sm: 'auto' }}>
          <Button
            variant="outlined"
            color="warning"
            onClick={handleAdvanceSeason}
            disabled={advancingSeason}
            fullWidth={isMobile}
          >
            {advancingSeason ? 'Advancing...' : 'Advance Season'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            fullWidth={isMobile}
          >
            Add Recruit
          </Button>
        </Box>
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
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Stars</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Class</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>Archetype</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Gem/Bust</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Dev Trait</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Priority</TableCell>
                      <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Position Need</TableCell>
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
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {recruit.stars ? '★'.repeat(recruit.stars) : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{recruit.recruit_class || '-'}</TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', md: 'table-cell' } }}>{recruit.archetype || '-'}</TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{recruit.gem_status || '-'}</TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{recruit.dev_trait || 'Unknown'}</TableCell>
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
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {recruit.priority_score != null ? Math.round(recruit.priority_score) : '-'}
                        </TableCell>
                        <TableCell align="center" sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {getPositionNeedChip(recruit.position)}
                        </TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditRecruit(recruit)}
                            aria-label="edit recruit"
                            sx={{ minWidth: 44, minHeight: 44 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRecruit(recruit.id)}
                            aria-label="delete recruit"
                            sx={{ minWidth: 44, minHeight: 44 }}
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
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('position', e.target.value)}
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
            <Grid item xs={3}>
              <TextField
                label="Stars"
                type="number"
                fullWidth
                inputProps={{ min: 1, max: 5 }}
                value={newRecruit.stars}
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('stars', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Class"
                select
                fullWidth
                value={newRecruit.recruit_class}
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('recruit_class', e.target.value)}
              >
                {RECRUIT_CLASSES.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Archetype"
                select
                fullWidth
                value={newRecruit.archetype}
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('archetype', e.target.value)}
                disabled={!newRecruit.position || !POSITION_ARCHETYPES[newRecruit.position]}
              >
                <MenuItem value="">None</MenuItem>
                {(POSITION_ARCHETYPES[newRecruit.position] || []).map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Gem/Bust"
                select
                fullWidth
                value={newRecruit.gem_status}
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('gem_status', e.target.value)}
              >
                {GEM_STATUSES.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Dev Trait"
                select
                fullWidth
                value={newRecruit.dev_trait}
                onChange={(e) => handleRecruitFieldChange(setNewRecruit)('dev_trait', e.target.value)}
              >
                {DEV_TRAITS.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
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
            {newRecruit.position && newRecruit.archetype && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Abilities (Optional)
                </Typography>
                <AbilitySelector
                  position={newRecruit.position}
                  archetype={newRecruit.archetype}
                  abilities={newRecruit.abilities}
                  onChange={(newAbilities) => setNewRecruit(prev => ({ ...prev, abilities: newAbilities }))}
                />
              </Grid>
            )}
            {renderAttributeFields(newRecruit, setNewRecruit, addFormStudScoreAttrs)}
          </Grid>
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

      {/* Edit Recruit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>Edit Recruit</DialogTitle>
        <DialogContent>
          {editingRecruit && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  value={editingRecruit.first_name}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('first_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  value={editingRecruit.last_name}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('last_name', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Position"
                  select
                  fullWidth
                  required
                  value={editingRecruit.position}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('position', e.target.value)}
                >
                  {POSITIONS.map(pos => (
                    <MenuItem key={pos} value={pos}>{pos}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Stars"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1, max: 5 }}
                  value={editingRecruit.stars}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('stars', e.target.value)}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Class"
                  select
                  fullWidth
                  value={editingRecruit.recruit_class}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('recruit_class', e.target.value)}
                >
                  {RECRUIT_CLASSES.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Archetype"
                  select
                  fullWidth
                  value={editingRecruit.archetype}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('archetype', e.target.value)}
                  disabled={!editingRecruit.position || !POSITION_ARCHETYPES[editingRecruit.position]}
                >
                  <MenuItem value="">None</MenuItem>
                  {(POSITION_ARCHETYPES[editingRecruit.position] || []).map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Gem/Bust"
                  select
                  fullWidth
                  value={editingRecruit.gem_status}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('gem_status', e.target.value)}
                >
                  {GEM_STATUSES.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Dev Trait"
                  select
                  fullWidth
                  value={editingRecruit.dev_trait}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('dev_trait', e.target.value)}
                >
                  {DEV_TRAITS.map(option => (
                    <MenuItem key={option} value={option}>{option}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Commitment Status"
                  select
                  fullWidth
                  value={editingRecruit.commitment_status}
                  onChange={(e) => handleRecruitFieldChange(setEditingRecruit)('commitment_status', e.target.value)}
                >
                  <MenuItem value="">None</MenuItem>
                  {COMMITMENT_STATUSES.filter(s => s).map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              {editingRecruit.position && editingRecruit.archetype && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Abilities (Optional)
                  </Typography>
                  <AbilitySelector
                    position={editingRecruit.position}
                    archetype={editingRecruit.archetype}
                    abilities={editingRecruit.abilities || {}}
                    onChange={(newAbilities) => setEditingRecruit(prev => ({ ...prev, abilities: newAbilities }))}
                  />
                </Grid>
              )}
              {renderAttributeFields(editingRecruit, setEditingRecruit, editFormStudScoreAttrs)}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveRecruit}
            variant="contained"
            disabled={saving || !editingRecruit?.first_name || !editingRecruit?.last_name || !editingRecruit?.position}
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
