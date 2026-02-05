import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { getPlayers } from '../store/slices/playerSlice';
import playerService from '../services/playerService';
import { POSITIONS, YEARS, DEV_TRAITS } from '../constants/playerAttributes';

const RosterManagement = () => {
  const { id: dynastyId } = useParams();
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
  });
  const [manualError, setManualError] = useState(null);
  const [manualSuccess, setManualSuccess] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    dispatch(getPlayers(dynastyId));
  }, [dispatch, dynastyId]);

  const onDrop = useCallback((acceptedFiles) => {
    setUploadFiles(acceptedFiles);
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
    setManualFormData({
      ...manualFormData,
      [e.target.name]: e.target.value,
    });
    if (manualError) setManualError(null);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualError(null);
    setManualSuccess(null);
    setManualLoading(true);

    try {
      const playerData = {
        ...manualFormData,
        jersey_number: manualFormData.jersey_number ? parseInt(manualFormData.jersey_number) : null,
        overall_rating: manualFormData.overall_rating ? parseInt(manualFormData.overall_rating) : null,
        weight: manualFormData.weight ? parseInt(manualFormData.weight) : null,
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Roster Management
        </Typography>

        {/* Upload Section */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload Screenshots for OCR Import
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload screenshots of your roster from the game. Our OCR system will automatically extract player data.
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
              or click to select files (PNG, JPG, JPEG)
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
                      value={manualFormData.overall_rating}
                      onChange={handleManualChange}
                      inputProps={{ min: 40, max: 99 }}
                      helperText="Overall rating (40-99)"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Height"
                      name="height"
                      value={manualFormData.height}
                      onChange={handleManualChange}
                      placeholder="6'2&quot;"
                      helperText="e.g., 6'2&quot;"
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
                    >
                      {DEV_TRAITS.map((trait) => (
                        <MenuItem key={trait} value={trait}>
                          {trait}
                        </MenuItem>
                      ))}
                    </TextField>
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
                        <Typography variant="body2" color="text.secondary">
                          Dev Trait: {player.dev_trait}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default RosterManagement;
