import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import studScoreService from '../services/studScoreService';
import { POSITION_ARCHETYPES, ATTRIBUTE_DISPLAY_NAMES, PLAYER_RATINGS } from '../constants/playerAttributes';

// Weight range constants
const MIN_WEIGHT = 0;
const MAX_WEIGHT = 3;
const WEIGHT_STEP = 0.1;

// Position groups for better organization
const POSITION_GROUPS = {
  'Offense - Skill': ['QB', 'HB', 'FB', 'WR', 'TE'],
  'Offense - Line': ['LT', 'LG', 'C', 'RG', 'RT'],
  'Defense - Line': ['LEDG', 'REDG', 'DT'],
  'Defense - LB': ['SAM', 'MIKE', 'WILL'],
  'Defense - Secondary': ['CB', 'FS', 'SS'],
  'Special Teams': ['K', 'P'],
};

const StudScoreConfig = () => {
  // State
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('QB');
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [configLevel, setConfigLevel] = useState('position'); // 'position' or 'archetype'
  const [weights, setWeights] = useState({});
  const [enabledAttributes, setEnabledAttributes] = useState({});
  const [defaultWeights, setDefaultWeights] = useState({});
  const [devTraitWeight, setDevTraitWeight] = useState(0.15);
  const [potentialWeight, setPotentialWeight] = useState(0.15);
  const [archetypes, setArchetypes] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasPresetWeightChanges, setHasPresetWeightChanges] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const loadPresets = async () => {
    try {
      setLoading(true);
      const data = await studScoreService.getPresets();
      setPresets(data);
      
      // Select default preset or first one
      const defaultPreset = data.find(p => p.is_default) || data[0];
      if (defaultPreset) {
        setSelectedPreset(defaultPreset);
        setDevTraitWeight(defaultPreset.dev_trait_weight || 0.15);
        setPotentialWeight(defaultPreset.potential_weight || 0.15);
      }
    } catch (err) {
      setError('Failed to load presets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWeights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load default weights for reference
      const defaults = await studScoreService.getDefaultWeights(selectedPosition);
      setDefaultWeights(defaults || {});

      // Load user's custom weights
      const archetype = configLevel === 'archetype' ? selectedArchetype : null;
      const data = await studScoreService.getWeights(
        selectedPreset.id,
        selectedPosition,
        archetype
      );

      // Convert array to object
      const weightsObj = {};
      data.forEach(w => {
        weightsObj[w.attribute_name] = parseFloat(w.weight);
      });

      // Determine active weights (custom or defaults)
      const activeWeights = Object.keys(weightsObj).length === 0 ? { ...defaults } : weightsObj;

      // Build full weights and enabled state for all attributes
      const fullWeights = {};
      const enabled = {};
      // Exclude OVR from config - it's a computed rating, not a raw attribute
      const configurableRatings = PLAYER_RATINGS.filter(r => r !== 'OVR');
      configurableRatings.forEach(attr => {
        if (activeWeights[attr] !== undefined) {
          fullWeights[attr] = activeWeights[attr];
          enabled[attr] = true;
        } else {
          fullWeights[attr] = 1;
          enabled[attr] = false;
        }
      });

      setWeights(fullWeights);
      setEnabledAttributes(enabled);
      setHasChanges(false);
      setHasPresetWeightChanges(false);
    } catch (err) {
      setError('Failed to load weights: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPosition, configLevel, selectedArchetype, selectedPreset]);

  const loadArchetypes = useCallback(async () => {
    try {
      const data = await studScoreService.getArchetypes(selectedPosition);
      setArchetypes(data || []);
    } catch (err) {
      console.error('Failed to load archetypes:', err);
      setArchetypes(POSITION_ARCHETYPES[selectedPosition] || []);
    }
  }, [selectedPosition]);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  // Load weights when preset/position/archetype changes
  useEffect(() => {
    if (selectedPreset && selectedPosition) {
      loadWeights();
    }
  }, [selectedPreset, selectedPosition, selectedArchetype, configLevel, loadWeights]);

  // Load archetypes when position changes
  useEffect(() => {
    if (selectedPosition) {
      loadArchetypes();
      setSelectedArchetype(null);
      setConfigLevel('position');
    }
  }, [selectedPosition, loadArchetypes]);

  const handleWeightChange = (attribute, value) => {
    setWeights(prev => ({
      ...prev,
      [attribute]: value
    }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleToggleAttribute = (attribute) => {
    setEnabledAttributes(prev => ({
      ...prev,
      [attribute]: !prev[attribute]
    }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const archetype = configLevel === 'archetype' ? selectedArchetype : null;
      
      // Only save enabled attributes
      const enabledWeights = {};
      Object.entries(weights).forEach(([attr, weight]) => {
        if (enabledAttributes[attr]) {
          enabledWeights[attr] = weight;
        }
      });

      // Save attribute weights
      await studScoreService.batchUpdateWeights(
        selectedPreset.id,
        selectedPosition,
        archetype,
        enabledWeights
      );

      // Save preset-level weights if they changed
      if (
        devTraitWeight !== selectedPreset.dev_trait_weight ||
        potentialWeight !== selectedPreset.potential_weight
      ) {
        await studScoreService.updatePreset(selectedPreset.id, {
          devTraitWeight,
          potentialWeight
        });
      }

      setSuccess('Configuration saved successfully!');
      setHasChanges(false);
      setHasPresetWeightChanges(false);
      
      // Reload presets to get updated values
      await loadPresets();
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset to default weights? This will discard your custom configuration.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const archetype = configLevel === 'archetype' ? selectedArchetype : null;
      await studScoreService.resetWeights(
        selectedPreset.id,
        selectedPosition,
        archetype
      );

      setSuccess('Weights reset to defaults!');
      await loadWeights();
    } catch (err) {
      setError('Failed to reset: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigLevelChange = (level) => {
    setConfigLevel(level);
    if (level === 'position') {
      setSelectedArchetype(null);
    } else if (level === 'archetype' && archetypes.length > 0) {
      setSelectedArchetype(archetypes[0]);
    }
  };

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const newPreset = await studScoreService.createPreset({
        preset_name: newPresetName.trim(),
        description: newPresetDescription.trim() || null,
      });
      setCreateDialogOpen(false);
      setNewPresetName('');
      setNewPresetDescription('');
      setSuccess('Preset created successfully!');
      await loadPresets();
      setSelectedPreset(newPreset);
      setDevTraitWeight(newPreset.dev_trait_weight || 0.15);
      setPotentialWeight(newPreset.potential_weight || 0.15);
    } catch (err) {
      setError('Failed to create preset: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;
    if (!window.confirm(`Delete preset "${selectedPreset.preset_name}"? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await studScoreService.deletePreset(selectedPreset.id);
      setSuccess('Preset deleted successfully!');
      await loadPresets();
    } catch (err) {
      setError('Failed to delete preset: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Calculate attribute weight (what's left after dev trait and potential)
  const attributeWeight = (1 - devTraitWeight - potentialWeight) * 100;
  const totalWeight = devTraitWeight + potentialWeight;
  const isWeightValid = totalWeight <= 1;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          STUD Score Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure how player attributes, development traits, and potential affect STUD scores.
          Set weights at the position level or customize for specific archetypes.
        </Typography>
      </Box>

      {/* Alerts */}
      {!isWeightValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Dev Trait and Potential weights cannot exceed 100% combined. 
          Current total: {(totalWeight * 100).toFixed(0)}%
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Preset Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ mb: 0 }}>
            Weight Preset
          </Typography>
          <Tooltip title="Weight presets allow you to save different configurations for evaluating players. You can create multiple presets to compare different evaluation strategies.">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a preset to configure how player attributes are weighted in STUD score calculations.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Preset</InputLabel>
          <Select
            value={selectedPreset?.id || ''}
            onChange={(e) => {
              const preset = presets.find(p => p.id === e.target.value);
              setSelectedPreset(preset);
              setDevTraitWeight(preset.dev_trait_weight || 0.15);
              setPotentialWeight(preset.potential_weight || 0.15);
              setHasChanges(false);
              setHasPresetWeightChanges(false);
            }}
            label="Preset"
          >
            {presets.map(preset => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.preset_name}
                {preset.is_default && <Chip label="Default" size="small" sx={{ ml: 1 }} />}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setCreateDialogOpen(true)}
          >
            New Preset
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            variant="outlined"
            color="error"
            onClick={handleDeletePreset}
            disabled={!selectedPreset || presets.length <= 1}
          >
            Delete Preset
          </Button>
        </Box>
      </Paper>

      {/* STUD Score Components */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          STUD Score Components
          <Tooltip title="Configure how much each factor impacts the final STUD score">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Attributes: {attributeWeight.toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Based on weighted player attributes below
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Dev Trait Impact: {(devTraitWeight * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={devTraitWeight}
              onChange={(e, value) => {
                setDevTraitWeight(value);
                setHasChanges(true);
                setHasPresetWeightChanges(true);
              }}
              min={0}
              max={0.5}
              step={0.05}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.25, label: '25%' },
                { value: 0.5, label: '50%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Typography variant="caption" color="text.secondary">
              Elite=100, Star=85, Impact=70, Normal=55
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              Potential Impact: {(potentialWeight * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={potentialWeight}
              onChange={(e, value) => {
                setPotentialWeight(value);
                setHasChanges(true);
                setHasPresetWeightChanges(true);
              }}
              min={0}
              max={0.5}
              step={0.05}
              marks={[
                { value: 0, label: '0%' },
                { value: 0.25, label: '25%' },
                { value: 0.5, label: '50%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Typography variant="caption" color="text.secondary">
              Based on remaining stat cap blocks
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Position and Archetype Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Position</InputLabel>
              <Select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                label="Position"
              >
                {Object.entries(POSITION_GROUPS).map(([group, positions]) => [
                  <MenuItem disabled key={group} sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}>
                    {group}
                  </MenuItem>,
                  ...positions.map(pos => (
                    <MenuItem key={pos} value={pos} sx={{ pl: 3 }}>
                      {pos}
                    </MenuItem>
                  ))
                ])}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <FormControl fullWidth>
                <InputLabel>Configure</InputLabel>
                <Select
                  value={configLevel}
                  onChange={(e) => handleConfigLevelChange(e.target.value)}
                  label="Configure"
                >
                  <MenuItem value="position">Position Default</MenuItem>
                  <MenuItem value="archetype" disabled={archetypes.length === 0}>
                    Archetype Override
                  </MenuItem>
                </Select>
              </FormControl>

              {configLevel === 'archetype' && (
                <FormControl fullWidth>
                  <InputLabel>Archetype</InputLabel>
                  <Select
                    value={selectedArchetype || ''}
                    onChange={(e) => setSelectedArchetype(e.target.value)}
                    label="Archetype"
                  >
                    {archetypes.map(arch => (
                      <MenuItem key={arch} value={arch}>
                        {arch}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Grid>
        </Grid>

        {configLevel === 'archetype' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Configuring archetype-specific weights will override the position default for players with this archetype.
          </Alert>
        )}
      </Paper>

      {/* Attribute Weights */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            Attribute Weights
          </Typography>
          <Box>
            <Button
              startIcon={<ResetIcon />}
              onClick={handleReset}
              disabled={loading || Object.keys(weights).length === 0}
              sx={{ mr: 1 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading || !hasChanges || (hasPresetWeightChanges && !isWeightValid)}
            >
              Save Changes
            </Button>
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click an attribute to include or exclude it from the STUD score. Adjust the weight below each to increase or decrease its importance.
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {Object.keys(weights).length === 0 ? (
              <Grid item xs={12}>
                <Typography color="text.secondary" align="center">
                  No attributes available for this position.
                </Typography>
              </Grid>
            ) : (
              Object.entries(weights).map(([attr, weight]) => {
                const isEnabled = enabledAttributes[attr];
                const isDefault = defaultWeights[attr] !== undefined;
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={attr}>
                    <Card
                      variant={isEnabled ? "elevation" : "outlined"}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: isEnabled ? 'primary.main' : 'action.disabledBackground',
                        color: isEnabled ? 'primary.contrastText' : 'text.disabled',
                        opacity: isEnabled ? 1 : 0.6,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          opacity: isEnabled ? 0.9 : 0.8,
                          transform: 'scale(1.02)',
                        },
                      }}
                    >
                      <CardContent
                        sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}
                        onClick={() => handleToggleAttribute(attr)}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {ATTRIBUTE_DISPLAY_NAMES[attr] || attr}
                          </Typography>
                          {isDefault && isEnabled && (
                            <Chip
                              label="Default"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.6rem',
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'inherit',
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.2 }}>
                          {attr}
                        </Typography>
                      </CardContent>
                      {isEnabled && (
                        <Box
                          sx={{
                            px: 1.5,
                            pb: 1.5,
                            pt: 0,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.3)' }} />
                          <Typography variant="caption" sx={{ color: 'primary.contrastText', display: 'block', mb: 0.5 }}>
                            Weight
                          </Typography>
                          <TextField
                            type="number"
                            value={weight}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= MIN_WEIGHT && val <= MAX_WEIGHT) {
                                handleWeightChange(attr, val);
                              }
                            }}
                            inputProps={{
                              min: MIN_WEIGHT,
                              max: MAX_WEIGHT,
                              step: WEIGHT_STEP,
                              style: {
                                textAlign: 'center',
                                padding: '4px 8px',
                                color: 'inherit',
                              },
                            }}
                            size="small"
                            sx={{
                              width: '100%',
                              '& .MuiOutlinedInput-root': {
                                color: 'inherit',
                                '& fieldset': {
                                  borderColor: 'rgba(255,255,255,0.4)',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'rgba(255,255,255,0.6)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: 'rgba(255,255,255,0.8)',
                                },
                              },
                            }}
                          />
                        </Box>
                      )}
                    </Card>
                  </Grid>
                );
              })
            )}
          </Grid>
        )}
      </Paper>

      {hasChanges && (
        <Alert severity="warning">
          You have unsaved changes. Click "Save Changes" to apply your configuration.
        </Alert>
      )}

      {/* Create Preset Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Preset Name"
            fullWidth
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={2}
            value={newPresetDescription}
            onChange={(e) => setNewPresetDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialogOpen(false); setNewPresetName(''); setNewPresetDescription(''); }}>
            Cancel
          </Button>
          <Button onClick={handleCreatePreset} variant="contained" disabled={!newPresetName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudScoreConfig;
