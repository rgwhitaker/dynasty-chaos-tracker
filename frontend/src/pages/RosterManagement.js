import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CardActions,
  Chip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { getPlayers, updatePlayer, deletePlayer } from '../store/slices/playerSlice';
import playerService from '../services/playerService';
import { POSITIONS, YEARS, DEV_TRAITS, DEV_TRAIT_COLORS, ATTRIBUTE_DISPLAY_NAMES, POSITION_ARCHETYPES } from '../constants/playerAttributes';
import StatCapEditor from '../components/StatCapEditor';
import HeightInput from '../components/HeightInput';

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

const RosterManagement = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { players, isLoading } = useSelector((state) => state.player);

  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    last_name: '',
    position: '',
    jersey_number: '',
    year: '',
    overall_rating: '',
    height: '',
    weight: '',
    dev_trait: '',
    archetype: '',
    attributes: {},
    dealbreakers: [],
    stat_caps: {},
  });
  const [manualError, setManualError] = useState(null);
  const [manualSuccess, setManualSuccess] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  // Edit player state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editError, setEditError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    dispatch(getPlayers(dynastyId));
  }, [dispatch, dynastyId]);

  // Handle paste events for clipboard images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            // Create a File object with a timestamp-based name
            const timestamp = new Date().getTime();
            const file = new File([blob], `pasted-screenshot-${timestamp}.png`, { type: blob.type });
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        setUploadFiles(prevFiles => [...prevFiles, ...imageFiles]);
        setUploadError(null);
        setUploadSuccess(null);
      }
    };

    // Add paste event listener to the window
    window.addEventListener('paste', handlePaste);

    // Cleanup
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [setUploadFiles, setUploadError, setUploadSuccess]);

  const onDrop = useCallback((acceptedFiles) => {
    setUploadFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    setUploadError(null);
    setUploadSuccess(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true,
  });

  const handleRemoveFile = (index) => {
    setUploadFiles(uploadFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setUploadError('Please select at least one file to upload');
      return;
    }

    setUploadLoading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await playerService.uploadScreenshots(dynastyId, uploadFiles, 'tesseract');
      setUploadSuccess(`Successfully uploaded ${uploadFiles.length} screenshot(s). OCR processing may take a few moments. Refresh the page to see new players.`);
      setUploadFiles([]);
      // Note: OCR processing is asynchronous. Users should refresh to see results.
      // Consider implementing polling or websocket notifications for real-time updates.
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to upload screenshots. Please try again.';
      setUploadError(errorMessage);
      console.error('Upload error:', error);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleManualChange = (e) => {
    const updates = { [e.target.name]: e.target.value };
    // Reset archetype when position changes
    if (e.target.name === 'position') {
      updates.archetype = '';
    }
    setManualFormData({
      ...manualFormData,
      ...updates,
    });
    if (manualError) setManualError(null);
  };

  const handleAttributeChange = (e) => {
    const { name, value } = e.target;
    setManualFormData({
      ...manualFormData,
      attributes: {
        ...manualFormData.attributes,
        [name]: value ? parseInt(value) : null,
      },
    });
    if (manualError) setManualError(null);
  };

  const handleStatCapsChange = (newStatCaps) => {
    setManualFormData({
      ...manualFormData,
      stat_caps: newStatCaps,
    });
    if (manualError) setManualError(null);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualError(null);
    setManualSuccess(null);
    setManualLoading(true);

    try {
      // Filter out null/empty attribute values before sending
      const filteredAttributes = Object.entries(manualFormData.attributes)
        .filter(([_, value]) => value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const playerData = {
        ...manualFormData,
        jersey_number: manualFormData.jersey_number ? parseInt(manualFormData.jersey_number) : null,
        overall_rating: manualFormData.overall_rating ? parseInt(manualFormData.overall_rating) : null,
        weight: manualFormData.weight ? parseInt(manualFormData.weight) : null,
        // Only include attributes if any were filled in
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        // Only include dealbreakers if any were added
        dealbreakers: manualFormData.dealbreakers.length > 0 ? manualFormData.dealbreakers : undefined,
        // Only include stat_caps if position is set and any caps were entered
        stat_caps: manualFormData.position && Object.keys(manualFormData.stat_caps).length > 0 ? manualFormData.stat_caps : undefined,
      };

      await playerService.createPlayer(dynastyId, playerData);
      setManualSuccess('Player added successfully!');
      setManualFormData({
        first_name: '',
        last_name: '',
        position: '',
        jersey_number: '',
        year: '',
        overall_rating: '',
        height: '',
        weight: '',
        dev_trait: '',
        archetype: '',
        attributes: {},
        dealbreakers: [],
        stat_caps: {},
      });
      // Refresh the player list immediately since manual entry is synchronous
      dispatch(getPlayers(dynastyId));
      // Keep form open so user can add another player if needed
      // Success message will help confirm the action completed
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add player. Please try again.';
      setManualError(errorMessage);
      console.error('Manual add error:', error);
    } finally {
      setManualLoading(false);
    }
  };

  const handleEditClick = (player) => {
    setEditingPlayer(player);
    setEditFormData({
      first_name: player.first_name || '',
      last_name: player.last_name || '',
      position: player.position || '',
      jersey_number: player.jersey_number || '',
      year: player.year || '',
      overall_rating: player.overall_rating || '',
      height: player.height || '',
      weight: player.weight || '',
      dev_trait: player.dev_trait || '',
      archetype: player.archetype || '',
      attributes: player.attributes || {},
      dealbreakers: player.dealbreakers || [],
      stat_caps: player.stat_caps || {},
      transfer_intent: player.transfer_intent || false,
    });
    setEditDialogOpen(true);
    setEditError(null);
  };

  const handleEditChange = (e) => {
    const updates = { [e.target.name]: e.target.value };
    // Reset archetype when position changes
    if (e.target.name === 'position') {
      updates.archetype = '';
    }
    setEditFormData({
      ...editFormData,
      ...updates,
    });
    if (editError) setEditError(null);
  };

  const handleEditAttributeChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      attributes: {
        ...editFormData.attributes,
        [name]: value ? parseInt(value) : null,
      },
    });
    if (editError) setEditError(null);
  };

  const handleEditStatCapsChange = (newStatCaps) => {
    setEditFormData({
      ...editFormData,
      stat_caps: newStatCaps,
    });
    if (editError) setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    setEditLoading(true);

    try {
      const filteredAttributes = Object.entries(editFormData.attributes)
        .filter(([_, value]) => value !== null && value !== '')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const playerData = {
        ...editFormData,
        jersey_number: editFormData.jersey_number ? parseInt(editFormData.jersey_number) : null,
        overall_rating: editFormData.overall_rating ? parseInt(editFormData.overall_rating) : null,
        weight: editFormData.weight ? parseInt(editFormData.weight) : null,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        dealbreakers: editFormData.dealbreakers.length > 0 ? editFormData.dealbreakers : undefined,
        stat_caps: editFormData.position && Object.keys(editFormData.stat_caps).length > 0 ? editFormData.stat_caps : undefined,
        transfer_intent: editFormData.transfer_intent || false,
      };

      await dispatch(updatePlayer({ 
        dynastyId, 
        playerId: editingPlayer.id, 
        playerData 
      })).unwrap();
      
      setEditDialogOpen(false);
      setEditingPlayer(null);
      setEditFormData({});
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update player. Please try again.';
      setEditError(errorMessage);
      console.error('Update player error:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (player) => {
    setDeletingPlayer(player);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await dispatch(deletePlayer({ 
        dynastyId, 
        playerId: deletingPlayer.id 
      })).unwrap();
      
      setDeleteDialogOpen(false);
      setDeletingPlayer(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete player. Please try again.';
      console.error('Delete player error:', error);
      alert(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDeletingPlayer(null);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1">
            Roster Management
          </Typography>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/roster`)}
          >
            Back to Roster
          </Button>
        </Box>

        {/* Upload Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload Screenshots for OCR Import
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload screenshots of your roster from the game. Our OCR system will automatically extract player data.
            You can also paste images directly from your clipboard (Ctrl+V or Cmd+V).
          </Typography>

          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}

          {uploadSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {uploadSuccess}
            </Alert>
          )}

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.400',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.default',
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the files here' : 'Drag & drop screenshots here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to select files • Press Ctrl+V (Cmd+V) to paste from clipboard
            </Typography>
          </Box>

          {uploadFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Files ({uploadFiles.length}):
              </Typography>
              <List>
                {uploadFiles.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(2)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={uploadLoading}
                startIcon={uploadLoading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              >
                {uploadLoading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </Box>
          )}
        </Paper>

        {/* Manual Entry Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Manual Player Entry
            </Typography>
            {!showManualForm && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowManualForm(true)}
              >
                Add Player Manually
              </Button>
            )}
          </Box>

          {!showManualForm && (
            <Typography variant="body2" color="text.secondary">
              Add players manually if you prefer to enter data by hand or if OCR didn't capture all information correctly.
            </Typography>
          )}

          {showManualForm && (
            <>
              {manualError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {manualError}
                </Alert>
              )}

              {manualSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {manualSuccess}
                </Alert>
              )}

              <form onSubmit={handleManualSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      name="first_name"
                      value={manualFormData.first_name}
                      onChange={handleManualChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      name="last_name"
                      value={manualFormData.last_name}
                      onChange={handleManualChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="Position"
                      name="position"
                      value={manualFormData.position}
                      onChange={handleManualChange}
                      required
                      SelectProps={{ native: true }}
                    >
                      <option value="" disabled>Select a position</option>
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {pos}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Jersey Number"
                      name="jersey_number"
                      type="number"
                      value={manualFormData.jersey_number}
                      onChange={handleManualChange}
                      inputProps={{ min: 0, max: 99 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="Year"
                      name="year"
                      value={manualFormData.year}
                      onChange={handleManualChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Select a year</option>
                      {YEARS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Overall Rating"
                      name="overall_rating"
                      type="number"
                      value={manualFormData.overall_rating}
                      onChange={handleManualChange}
                      inputProps={{ min: 40, max: 99 }}
                      helperText="Overall rating (40-99)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <HeightInput
                      value={manualFormData.height}
                      onChange={handleManualChange}
                      name="height"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Weight"
                      name="weight"
                      type="number"
                      value={manualFormData.weight}
                      onChange={handleManualChange}
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
                      value={manualFormData.dev_trait}
                      onChange={handleManualChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Select a dev trait</option>
                      {DEV_TRAITS.map((trait) => (
                        <option key={trait} value={trait}>
                          {trait}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  {manualFormData.position && POSITION_ARCHETYPES[manualFormData.position] && (
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        select
                        label="Archetype"
                        name="archetype"
                        value={manualFormData.archetype}
                        onChange={handleManualChange}
                        SelectProps={{ native: true }}
                      >
                        <option value="">Select an archetype</option>
                        {POSITION_ARCHETYPES[manualFormData.position].map((arch) => (
                          <option key={arch} value={arch}>
                            {arch}
                          </option>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                  
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
                                  value={manualFormData.attributes[attr] || ''}
                                  onChange={handleAttributeChange}
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
                    {manualFormData.position && (
                      <StatCapEditor
                        position={manualFormData.position}
                        archetype={manualFormData.archetype || undefined}
                        statCaps={manualFormData.stat_caps}
                        onChange={handleStatCapsChange}
                      />
                    )}
                    {!manualFormData.position && (
                      <Alert severity="info">
                        Select a position above to configure stat caps
                      </Alert>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setShowManualForm(false);
                          setManualFormData({
                            first_name: '',
                            last_name: '',
                            position: '',
                            jersey_number: '',
                            year: '',
                            overall_rating: '',
                            height: '',
                            weight: '',
                            dev_trait: '',
                            archetype: '',
                            attributes: {},
                            dealbreakers: [],
                            stat_caps: {},
                          });
                          setManualError(null);
                          setManualSuccess(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={manualLoading}
                        startIcon={manualLoading ? <CircularProgress size={20} /> : <AddIcon />}
                      >
                        {manualLoading ? 'Adding...' : 'Add Player'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </>
          )}
        </Paper>

        {/* Current Roster Section */}
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Current Roster ({players.length} players)
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : players.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              No players in roster yet. Upload screenshots or add players manually to get started.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {players.map((player) => (
                <Grid item xs={12} sm={6} md={4} key={player.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6">
                        {player.first_name} {player.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {player.position} #{player.jersey_number || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Year: {player.year || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall: {player.overall_rating || 'N/A'}
                      </Typography>
                      {player.height && (
                        <Typography variant="body2" color="text.secondary">
                          Height: {player.height}
                        </Typography>
                      )}
                      {player.weight && (
                        <Typography variant="body2" color="text.secondary">
                          Weight: {player.weight} lbs
                        </Typography>
                      )}
                      {player.dev_trait && (
                        <Box sx={{ mt: 1 }}>
                          <Chip 
                            label={player.dev_trait} 
                            size="small" 
                            color={DEV_TRAIT_COLORS[player.dev_trait] || 'default'}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => handleEditClick(player)}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="small" 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteClick(player)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Edit Player Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Edit Player</DialogTitle>
          <DialogContent>
            {editError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {editError}
              </Alert>
            )}

            <form onSubmit={handleEditSubmit} id="edit-player-form">
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="first_name"
                    value={editFormData.first_name || ''}
                    onChange={handleEditChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="last_name"
                    value={editFormData.last_name || ''}
                    onChange={handleEditChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Position"
                    name="position"
                    value={editFormData.position || ''}
                    onChange={handleEditChange}
                    required
                    SelectProps={{ native: true }}
                  >
                    <option value="" disabled>Select a position</option>
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Jersey Number"
                    name="jersey_number"
                    type="number"
                    value={editFormData.jersey_number || ''}
                    onChange={handleEditChange}
                    inputProps={{ min: 0, max: 99 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    select
                    label="Year"
                    name="year"
                    value={editFormData.year || ''}
                    onChange={handleEditChange}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select a year</option>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Overall Rating"
                    name="overall_rating"
                    type="number"
                    value={editFormData.overall_rating || ''}
                    onChange={handleEditChange}
                    inputProps={{ min: 40, max: 99 }}
                    helperText="Overall rating (40-99)"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <HeightInput
                    value={editFormData.height || ''}
                    onChange={handleEditChange}
                    name="height"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Weight"
                    name="weight"
                    type="number"
                    value={editFormData.weight || ''}
                    onChange={handleEditChange}
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
                    value={editFormData.dev_trait || ''}
                    onChange={handleEditChange}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select a dev trait</option>
                    {DEV_TRAITS.map((trait) => (
                      <option key={trait} value={trait}>
                        {trait}
                      </option>
                    ))}
                  </TextField>
                </Grid>
                {editFormData.position && POSITION_ARCHETYPES[editFormData.position] && (
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      select
                      label="Archetype"
                      name="archetype"
                      value={editFormData.archetype || ''}
                      onChange={handleEditChange}
                      SelectProps={{ native: true }}
                    >
                      <option value="">Select an archetype</option>
                      {POSITION_ARCHETYPES[editFormData.position].map((arch) => (
                        <option key={arch} value={arch}>
                          {arch}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                )}
                
                {/* Transfer Intent */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={editFormData.transfer_intent || false}
                        onChange={(e) => {
                          setEditFormData({
                            ...editFormData,
                            transfer_intent: e.target.checked,
                          });
                          if (editError) setEditError(null);
                        }}
                        name="transfer_intent"
                        color="error"
                      />
                    }
                    label="Transfer Intent (dealbreaker not being met)"
                  />
                </Grid>
                
                {/* Player Attributes Section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Player Attributes (Optional)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Update individual player ratings. Values should be between 40-99.
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
                                value={editFormData.attributes?.[attr] || ''}
                                onChange={handleEditAttributeChange}
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
                  {editFormData.position && (
                    <StatCapEditor
                      position={editFormData.position}
                      archetype={editFormData.archetype || undefined}
                      statCaps={editFormData.stat_caps || {}}
                      onChange={handleEditStatCapsChange}
                      dynastyId={dynastyId}
                      playerId={editingPlayer?.id}
                    />
                  )}
                  {!editFormData.position && (
                    <Alert severity="info">
                      Select a position above to configure stat caps
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit"
              form="edit-player-form"
              variant="contained"
              disabled={editLoading}
              startIcon={editLoading ? <CircularProgress size={20} /> : null}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete {deletingPlayer?.first_name} {deletingPlayer?.last_name}?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RosterManagement;
