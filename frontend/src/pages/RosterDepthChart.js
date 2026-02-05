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
  Divider,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getPlayers, deletePlayer } from '../store/slices/playerSlice';
import { ATTRIBUTE_DISPLAY_NAMES } from '../constants/playerAttributes';

// Attribute categories for organized display
const ATTRIBUTE_CATEGORIES = {
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

// Key attributes to display on player cards based on position
const KEY_ATTRIBUTES_BY_POSITION = {
  'QB': ['SPD', 'AWR', 'THP', 'SAC', 'MAC', 'DAC'],
  'RB': ['SPD', 'ACC', 'CAR', 'BCV', 'BTK', 'CTH'],
  'FB': ['SPD', 'STR', 'CAR', 'RBK', 'PBK', 'CTH'],
  'WR': ['SPD', 'ACC', 'CTH', 'CIT', 'SRR', 'DRR'],
  'TE': ['SPD', 'CTH', 'CIT', 'RBK', 'PBK', 'SRR'],
  'OL': ['STR', 'AWR', 'PBK', 'PBP', 'RBK', 'RBP'],
  'C': ['STR', 'AWR', 'PBK', 'PBP', 'RBK', 'RBP'],
  'OG': ['STR', 'AWR', 'PBK', 'PBP', 'RBK', 'RBP'],
  'OT': ['STR', 'AWR', 'PBK', 'PBF', 'RBK', 'RBP'],
  'DL': ['STR', 'SPD', 'ACC', 'TAK', 'POW', 'BSH'],
  'DE': ['SPD', 'ACC', 'TAK', 'POW', 'FMV', 'PUR'],
  'DT': ['STR', 'TAK', 'POW', 'BSH', 'PMV', 'PUR'],
  'LB': ['SPD', 'ACC', 'TAK', 'PUR', 'MCV', 'ZCV'],
  'MLB': ['SPD', 'TAK', 'PUR', 'PRC', 'ZCV', 'BSH'],
  'OLB': ['SPD', 'ACC', 'TAK', 'PUR', 'MCV', 'FMV'],
  'CB': ['SPD', 'ACC', 'MCV', 'ZCV', 'PRS', 'CTH'],
  'S': ['SPD', 'ACC', 'TAK', 'MCV', 'ZCV', 'PUR'],
  'SS': ['SPD', 'TAK', 'MCV', 'ZCV', 'PUR', 'PRS'],
  'FS': ['SPD', 'ACC', 'MCV', 'ZCV', 'CTH', 'PUR'],
  'K': ['KPW', 'KAC', 'AWR'],
  'P': ['KPW', 'KAC', 'AWR'],
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

  useEffect(() => {
    dispatch(getPlayers(dynastyId));
  }, [dispatch, dynastyId]);

  // Sort players by Stud Score (fallback to Overall)
  const sortedPlayers = [...(players || [])].sort((a, b) => {
    const scoreA = a.stud_score ?? a.overall_rating ?? 0;
    const scoreB = b.stud_score ?? b.overall_rating ?? 0;
    return scoreB - scoreA;
  });

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

  const getKeyAttributes = (player) => {
    const attributes = KEY_ATTRIBUTES_BY_POSITION[player.position] || [];
    return attributes.map(attr => ({
      name: attr,
      value: player.attributes?.[attr] || '-'
    }));
  };

  const getDevTraitColor = (trait) => {
    switch (trait) {
      case 'Elite':
        return 'error';
      case 'Star':
        return 'warning';
      case 'Impact':
        return 'success';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

      {sortedPlayers.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" align="center">
              No players found. Use Manage Roster to add players.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {sortedPlayers.map((player) => (
            <Grid item xs={12} sm={6} md={4} key={player.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s'
                  }
                }}
                onClick={() => handlePlayerClick(player)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" component="div">
                        {player.first_name} {player.last_name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={`#${player.jersey_number}`} size="small" />
                        <Chip label={player.position} size="small" color="primary" />
                        <Chip label={player.year} size="small" />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Typography variant="h4" color="primary">
                        {player.stud_score ?? player.overall_rating}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {player.stud_score ? 'STUD' : 'OVR'}
                      </Typography>
                    </Box>
                  </Box>

                  {player.dev_trait && (
                    <Box sx={{ mb: 1 }}>
                      <Chip 
                        label={player.dev_trait} 
                        size="small" 
                        color={getDevTraitColor(player.dev_trait)}
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Grid container spacing={1}>
                    {getKeyAttributes(player).map(({ name, value }) => (
                      <Grid item xs={4} key={name}>
                        <Typography variant="caption" color="text.secondary">
                          {name}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
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
                  {selectedPlayer.stud_score && (
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
