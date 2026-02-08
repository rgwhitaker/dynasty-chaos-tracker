import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  TextField,
  MenuItem,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { getPlayers, deletePlayer } from '../store/slices/playerSlice';
import { ATTRIBUTE_DISPLAY_NAMES, DEV_TRAIT_COLORS, POSITIONS, YEARS, DEV_TRAITS } from '../constants/playerAttributes';
import { getStatCapSummary } from '../constants/statCaps';
import StatCapEditor from '../components/StatCapEditor';
import playerService from '../services/playerService';

// Common chip container styles
const CHIP_CONTAINER_STYLES = {
  display: 'flex',
  gap: 0.5,
  mt: 0.5,
  flexWrap: 'wrap'
};

// Attribute categories for organized display
const ATTRIBUTE_CATEGORIES = {
  'Overall': ['OVR'],
  'Physical': ['SPD', 'ACC', 'AGI', 'COD', 'STR', 'JMP', 'STA', 'TGH', 'INJ'],
  'Awareness': ['AWR', 'PRC'],
  'Ball Carrier': ['CAR', 'BCV', 'BTK', 'TRK', 'SFA', 'SPM', 'JKM'],
  'Receiving': ['CTH', 'CIT', 'SPC', 'SRR', 'MRR', 'DRR', 'RLS'],
  'Passing': ['THP', 'SAC', 'MAC', 'DAC', 'TUP', 'BSK', 'PAC'],
  'Blocking': ['PBK', 'PBP', 'PBF', 'RBK', 'RBP', 'RBF', 'LBK', 'IBL', 'RUN'],
  'Defense': ['TAK', 'POW', 'BSH', 'FMV', 'PMV', 'PUR'],
  'Coverage': ['MCV', 'ZCV', 'PRS'],
  'Special Teams': ['RET', 'KPW', 'KAC', 'LSP'],
};

// Position groups by unit
const POSITION_GROUPS = {
  offense: {
    'QB': { positions: ['QB'], label: 'Quarterback', order: 1 },
    'RB': { positions: ['HB', 'FB'], label: 'Running Backs', order: 2 },
    'WR': { positions: ['WR'], label: 'Wide Receivers', order: 3 },
    'TE': { positions: ['TE'], label: 'Tight Ends', order: 4 },
    'OL': { positions: ['LT', 'LG', 'C', 'RG', 'RT'], label: 'Offensive Line', order: 5 },
  },
  defense: {
    'DL': { positions: ['LEDG', 'REDG', 'DT'], label: 'Defensive Line', order: 1 },
    'LB': { positions: ['SAM', 'MIKE', 'WILL'], label: 'Linebackers', order: 2 },
    'DB': { positions: ['CB', 'FS', 'SS'], label: 'Defensive Backs', order: 3 },
  },
  specialTeams: {
    'K': { positions: ['K'], label: 'Kicker', order: 1 },
    'P': { positions: ['P'], label: 'Punter', order: 2 },
  },
};

const RosterDepthChart = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { players, isLoading } = useSelector((state) => state.player);

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [unit, setUnit] = useState('offense');

  // Add player dialog state
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [addPlayerFormData, setAddPlayerFormData] = useState({
    first_name: '',
    last_name: '',
    position: '',
    jersey_number: '',
    year: '',
    overall_rating: '',
    height: '',
    weight: '',
    dev_trait: '',
    attributes: {},
    stat_caps: {},
  });
  const [addPlayerError, setAddPlayerError] = useState(null);
  const [addPlayerLoading, setAddPlayerLoading] = useState(false);

  useEffect(() => {
    dispatch(getPlayers(dynastyId));
  }, [dispatch, dynastyId]);

  const handleUnitChange = (event, newUnit) => {
    if (newUnit !== null) {
      setUnit(newUnit);
    }
  };

  const handlePlayerClick = (player) => {
    setSelectedPlayer(player);
    setDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedPlayer(null);
  };

  const handleEditPlayer = () => {
    if (selectedPlayer) {
      navigate(`/dynasties/${dynastyId}/roster/manage?editPlayer=${selectedPlayer.id}`);
    }
  };

  const handleDeleteClick = (player) => {
    setDeletingPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlayer) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await dispatch(deletePlayer({ 
        dynastyId, 
        playerId: deletingPlayer.id 
      })).unwrap();
      
      setDeleteDialogOpen(false);
      setDeletingPlayer(null);
      
      // If we're viewing the deleted player, close the detail dialog
      if (selectedPlayer?.id === deletingPlayer.id) {
        setDetailDialogOpen(false);
        setSelectedPlayer(null);
      }
    } catch (error) {
      setDeleteError(error || 'Failed to delete player');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setDeletingPlayer(null);
    setDeleteError(null);
  };

  // Add player dialog handlers
  const handleOpenAddPlayer = (position) => {
    setSelectedPosition(position);
    setAddPlayerFormData({
      first_name: '',
      last_name: '',
      position: position,
      jersey_number: '',
      year: '',
      overall_rating: '',
      height: '',
      weight: '',
      dev_trait: '',
      attributes: {},
      stat_caps: {},
    });
    setAddPlayerError(null);
    setAddPlayerDialogOpen(true);
  };

  const handleCloseAddPlayer = () => {
    setAddPlayerDialogOpen(false);
    setAddPlayerFormData({
      first_name: '',
      last_name: '',
      position: '',
      jersey_number: '',
      year: '',
      overall_rating: '',
      height: '',
      weight: '',
      dev_trait: '',
      attributes: {},
      stat_caps: {},
    });
    setAddPlayerError(null);
  };

  const handleAddPlayerChange = (e) => {
    setAddPlayerFormData({
      ...addPlayerFormData,
      [e.target.name]: e.target.value,
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerAttributeChange = (e) => {
    const { name, value } = e.target;
    setAddPlayerFormData({
      ...addPlayerFormData,
      attributes: {
        ...addPlayerFormData.attributes,
        [name]: value ? parseInt(value) : null,
      },
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerStatCapsChange = (newStatCaps) => {
    setAddPlayerFormData({
      ...addPlayerFormData,
      stat_caps: newStatCaps,
    });
    if (addPlayerError) setAddPlayerError(null);
  };

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    setAddPlayerError(null);
    setAddPlayerLoading(true);

    try {
      // Filter out null/empty attribute values before sending
      const filteredAttributes = Object.entries(addPlayerFormData.attributes)
        .filter(([_, value]) => value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const playerData = {
        ...addPlayerFormData,
        jersey_number: addPlayerFormData.jersey_number ? parseInt(addPlayerFormData.jersey_number) : null,
        overall_rating: addPlayerFormData.overall_rating ? parseInt(addPlayerFormData.overall_rating) : null,
        weight: addPlayerFormData.weight ? parseInt(addPlayerFormData.weight) : null,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        stat_caps: addPlayerFormData.position && Object.keys(addPlayerFormData.stat_caps).length > 0 ? addPlayerFormData.stat_caps : undefined,
      };

      await playerService.createPlayer(dynastyId, playerData);
      
      // Refresh the player list
      dispatch(getPlayers(dynastyId));
      
      // Close the dialog
      handleCloseAddPlayer();
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add player. Please try again.';
      setAddPlayerError(errorMessage);
      console.error('Add player error:', error);
    } finally {
      setAddPlayerLoading(false);
    }
  };

  const getDevTraitColor = (trait) => {
    return DEV_TRAIT_COLORS[trait] || 'default';
  };

  // Group players by position for the current unit
  const groupedPlayers = React.useMemo(() => {
    const groups = POSITION_GROUPS[unit];
    const result = {};

    Object.entries(groups).forEach(([groupKey, groupInfo]) => {
      const groupPlayers = (players || []).filter(p => 
        groupInfo.positions.includes(p.position)
      );
      
      // Sort by stud_score or overall_rating
      groupPlayers.sort((a, b) => {
        const scoreA = a.stud_score ?? a.overall_rating ?? 0;
        const scoreB = b.stud_score ?? b.overall_rating ?? 0;
        return scoreB - scoreA;
      });

      result[groupKey] = {
        ...groupInfo,
        players: groupPlayers,
      };
    });

    return result;
  }, [players, unit]);

  // Render a compact player card
  const renderPlayerCard = (player) => {
    if (!player) return null;

    return (
      <Card 
        key={player.id}
        onClick={() => handlePlayerClick(player)}
        sx={{ 
          cursor: 'pointer',
          minWidth: 140,
          maxWidth: 180,
          '&:hover': { 
            boxShadow: 4,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s'
          },
          transition: 'all 0.2s',
        }}
      >
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {player.first_name} {player.last_name}
              </Typography>
              <Box sx={CHIP_CONTAINER_STYLES}>
                <Chip label={`#${player.jersey_number}`} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                <Chip label={player.position} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                <Chip label={player.year} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
              </Box>
            </Box>
            <Box sx={{ textAlign: 'right', ml: 1 }}>
              <Typography variant="h6" color="primary" lineHeight={1}>
                {player.stud_score ?? player.overall_rating ?? '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" lineHeight={1}>
                {player.stud_score != null ? 'STUD' : 'OVR'}
              </Typography>
            </Box>
          </Box>

          {player.dev_trait && (
            <Chip 
              label={player.dev_trait} 
              size="small" 
              color={getDevTraitColor(player.dev_trait)}
              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 'bold', mt: 0.5 }}
            />
          )}

          {/* Physical Attributes */}
          {(player.height || player.weight) && (
            <Box sx={CHIP_CONTAINER_STYLES}>
              {player.height && (
                <Chip 
                  label={player.height} 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
              {player.weight && (
                <Chip 
                  label={`${player.weight} lbs`} 
                  size="small" 
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render position group section
  const renderPositionGroup = (groupKey, groupData) => {
    const { label, players: groupPlayers, positions } = groupData;

    return (
      <Box key={groupKey} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ 
            borderBottom: 2, 
            borderColor: 'primary.main',
            pb: 0.5,
          }}>
            {label}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenAddPlayer(positions[0])}
          >
            Add Player
          </Button>
        </Box>
        {groupPlayers.length > 0 ? (
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5, 
            flexWrap: 'wrap',
            alignItems: 'flex-start'
          }}>
            {groupPlayers.map(player => renderPlayerCard(player))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', ml: 2 }}>
            No players at this position
          </Typography>
        )}
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasPlayers = players && players.length > 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1">
          Roster Depth Chart
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/roster/manage`)}
          >
            Manage Roster
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate(`/dynasties/${dynastyId}/recruiter-hub`)}
          >
            Recruiter Hub
          </Button>
        </Box>
      </Box>

      {hasPlayers && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={unit}
            exclusive
            onChange={handleUnitChange}
            aria-label="unit selection"
            color="primary"
          >
            <ToggleButton value="offense">
              Offense
            </ToggleButton>
            <ToggleButton value="defense">
              Defense
            </ToggleButton>
            <ToggleButton value="specialTeams">
              Special Teams
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {!hasPlayers ? (
        <Card>
          <CardContent>
            <Typography variant="body1" align="center">
              No players found. Use Manage Roster to add players.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Paper elevation={2} sx={{ p: 3, bgcolor: 'background.default' }}>
          {Object.entries(groupedPlayers)
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([groupKey, groupData]) => renderPositionGroup(groupKey, groupData))}
        </Paper>
      )}

      {/* Player Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5">
                {selectedPlayer?.first_name} {selectedPlayer?.last_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip label={`#${selectedPlayer?.jersey_number}`} size="small" />
                <Chip label={selectedPlayer?.position} size="small" color="primary" />
                <Chip label={selectedPlayer?.year} size="small" />
                {selectedPlayer?.dev_trait && (
                  <Chip 
                    label={selectedPlayer.dev_trait} 
                    size="small" 
                    color={getDevTraitColor(selectedPlayer.dev_trait)}
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </Box>
            <IconButton onClick={handleCloseDetail}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedPlayer && (
            <>
              {/* Overall Stats */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Overall
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {selectedPlayer.overall_rating ?? '-'}
                    </Typography>
                  </Grid>
                  {selectedPlayer.stud_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Stud Score
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {selectedPlayer.stud_score}
                      </Typography>
                    </Grid>
                  )}
                  {selectedPlayer.potential_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Potential
                      </Typography>
                      <Typography variant="h4" color="secondary">
                        {selectedPlayer.potential_score}%
                      </Typography>
                    </Grid>
                  )}
                  {selectedPlayer.adjusted_stud_score != null && (
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        Adjusted Score
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {selectedPlayer.adjusted_stud_score}
                      </Typography>
                    </Grid>
                  )}
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Height
                    </Typography>
                    <Typography variant="h6">
                      {selectedPlayer.height ?? '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">
                      Weight
                    </Typography>
                    <Typography variant="h6">
                      {selectedPlayer.weight ?? '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Stat Caps Section */}
              {selectedPlayer.stat_caps && Object.keys(selectedPlayer.stat_caps).length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" color="primary" gutterBottom>
                    Stat Caps Summary
                  </Typography>
                  {(() => {
                    const summary = getStatCapSummary(selectedPlayer.stat_caps, selectedPlayer.position);
                    return (
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Purchased Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.purchasedBlocks} / {summary.totalBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Capped Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.cappedBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Available Blocks
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {summary.availableBlocks}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            p: 1.5, 
                            border: '1px solid',
                            borderColor: 'primary.main',
                            borderRadius: 1,
                            textAlign: 'center',
                            bgcolor: 'primary.50'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              Potential Score
                            </Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary">
                              {summary.potentialScore}%
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    );
                  })()}
                  <Box sx={{ mt: 2 }}>
                    <StatCapEditor
                      position={selectedPlayer.position}
                      statCaps={selectedPlayer.stat_caps}
                      readOnly={true}
                    />
                  </Box>
                </Box>
              )}

              {/* Attributes by Category */}
              {Object.entries(ATTRIBUTE_CATEGORIES).map(([category, attributes]) => {
                const relevantAttributes = attributes.filter(
                  attr => selectedPlayer.attributes?.[attr] !== undefined && 
                         selectedPlayer.attributes?.[attr] !== null
                );
                
                if (relevantAttributes.length === 0) return null;

                return (
                  <Box key={category} sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      {category}
                    </Typography>
                    <Grid container spacing={1}>
                      {relevantAttributes.map(attr => (
                        <Grid item xs={6} sm={4} md={3} key={attr}>
                          <Box sx={{ 
                            p: 1, 
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            textAlign: 'center'
                          }}>
                            <Typography variant="caption" color="text.secondary">
                              {ATTRIBUTE_DISPLAY_NAMES[attr] || attr}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {selectedPlayer.attributes[attr]}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                );
              })}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDeleteClick(selectedPlayer)}
          >
            Delete Player
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEditPlayer}
          >
            Edit Player
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete {deletingPlayer?.first_name} {deletingPlayer?.last_name}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Player Dialog */}
      <Dialog 
        open={addPlayerDialogOpen} 
        onClose={handleCloseAddPlayer}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              Add New Player
            </Typography>
            <IconButton onClick={handleCloseAddPlayer}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {addPlayerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {addPlayerError}
            </Alert>
          )}

          <form onSubmit={handleAddPlayerSubmit} id="add-player-form">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={addPlayerFormData.first_name}
                  onChange={handleAddPlayerChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={addPlayerFormData.last_name}
                  onChange={handleAddPlayerChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Position"
                  name="position"
                  value={addPlayerFormData.position}
                  onChange={handleAddPlayerChange}
                  required
                >
                  {POSITIONS.map((pos) => (
                    <MenuItem key={pos} value={pos}>
                      {pos}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Jersey Number"
                  name="jersey_number"
                  type="number"
                  value={addPlayerFormData.jersey_number}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 0, max: 99 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Year"
                  name="year"
                  value={addPlayerFormData.year}
                  onChange={handleAddPlayerChange}
                >
                  {YEARS.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Overall Rating"
                  name="overall_rating"
                  type="number"
                  value={addPlayerFormData.overall_rating}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 40, max: 99 }}
                  helperText="Overall rating (40-99)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Height"
                  name="height"
                  value={addPlayerFormData.height}
                  onChange={handleAddPlayerChange}
                  placeholder={`6'2"`}
                  helperText={`e.g., 6'2"`}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Weight"
                  name="weight"
                  type="number"
                  value={addPlayerFormData.weight}
                  onChange={handleAddPlayerChange}
                  inputProps={{ min: 150, max: 400 }}
                  helperText="Weight in pounds"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Dev Trait"
                  name="dev_trait"
                  value={addPlayerFormData.dev_trait}
                  onChange={handleAddPlayerChange}
                >
                  {DEV_TRAITS.map((trait) => (
                    <MenuItem key={trait} value={trait}>
                      {trait}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              {/* Player Attributes Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Player Attributes (Optional)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter individual player ratings. All fields are optional. Values should be between 40-99.
                </Typography>
                
                {Object.entries(ATTRIBUTE_CATEGORIES).map(([category, attributes]) => (
                  <Accordion key={category} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>{category} Attributes</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        {attributes.map((attr) => (
                          <Grid item xs={6} sm={4} md={3} key={attr}>
                            <TextField
                              fullWidth
                              label={`${attr} - ${ATTRIBUTE_DISPLAY_NAMES[attr]}`}
                              name={attr}
                              type="number"
                              value={addPlayerFormData.attributes[attr] || ''}
                              onChange={handleAddPlayerAttributeChange}
                              inputProps={{ min: 40, max: 99 }}
                              size="small"
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>
              
              {/* Stat Caps Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                {addPlayerFormData.position && (
                  <StatCapEditor
                    position={addPlayerFormData.position}
                    statCaps={addPlayerFormData.stat_caps}
                    onChange={handleAddPlayerStatCapsChange}
                  />
                )}
                {!addPlayerFormData.position && (
                  <Alert severity="info">
                    Select a position above to configure stat caps
                  </Alert>
                )}
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAddPlayer}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-player-form"
            variant="contained"
            disabled={addPlayerLoading}
            startIcon={addPlayerLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {addPlayerLoading ? 'Adding...' : 'Add Player'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RosterDepthChart;
