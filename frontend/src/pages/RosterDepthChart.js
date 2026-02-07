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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getPlayers, deletePlayer } from '../store/slices/playerSlice';
import { ATTRIBUTE_DISPLAY_NAMES, DEV_TRAIT_COLORS } from '../constants/playerAttributes';

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
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
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
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
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
    const { label, players: groupPlayers } = groupData;

    if (groupPlayers.length === 0) return null;

    return (
      <Box key={groupKey} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ 
          borderBottom: 2, 
          borderColor: 'primary.main',
          pb: 0.5,
          mb: 2
        }}>
          {label}
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 1.5, 
          flexWrap: 'wrap',
          alignItems: 'flex-start'
        }}>
          {groupPlayers.map(player => renderPlayerCard(player))}
        </Box>
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
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => navigate(`/dynasties/${dynastyId}/roster/manage`)}
        >
          Manage Roster
        </Button>
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
    </Container>
  );
};

export default RosterDepthChart;
