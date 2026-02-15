import React, { useState, useEffect } from 'react';
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
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import studScoreService from '../services/studScoreService';
import { ROSTER_POSITIONS, POSITION_ARCHETYPES, ATTRIBUTE_DISPLAY_NAMES } from '../constants/playerAttributes';

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
  const [defaultWeights, setDefaultWeights] = useState({});
  const [devTraitWeight, setDevTraitWeight] = useState(0.15);
  const [potentialWeight, setPotentialWeight] = useState(0.15);
  const [archetypes, setArchetypes] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, []);

  // Load weights when preset/position/archetype changes
  useEffect(() => {
    if (selectedPreset && selectedPosition) {
      loadWeights();
    }
  }, [selectedPreset, selectedPosition, selectedArchetype, configLevel]);

  // Load archetypes when position changes
  useEffect(() => {
    if (selectedPosition) {
      loadArchetypes();
      setSelectedArchetype(null);
      setConfigLevel('position');
    }
  }, [selectedPosition]);

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

  const loadWeights = async () => {
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

      // If no custom weights, use defaults
      if (Object.keys(weightsObj).length === 0) {
        setWeights({ ...defaults });
      } else {
        setWeights(weightsObj);
      }
      
      setHasChanges(false);
    } catch (err) {
      setError('Failed to load weights: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadArchetypes = async () => {
    try {
      const data = await studScoreService.getArchetypes(selectedPosition);
      setArchetypes(data || []);
    } catch (err) {
      console.error('Failed to load archetypes:', err);
      setArchetypes(POSITION_ARCHETYPES[selectedPosition] || []);
    }
  };

  const handleWeightChange = (attribute, value) => {
    setWeights(prev => ({
      ...prev,
      [attribute]: value
    }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const archetype = configLevel === 'archetype' ? selectedArchetype : null;
      
      // Save attribute weights
      await studScoreService.batchUpdateWeights(
        selectedPreset.id,
        selectedPosition,
        archetype,
        weights
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
        <Typography variant="h6" gutterBottom>
          Weight Preset
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
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
              disabled={loading || !hasChanges || !isWeightValid}
            >
              Save Changes
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {Object.keys(weights).length === 0 && Object.keys(defaultWeights).length === 0 ? (
              <Grid item xs={12}>
                <Typography color="text.secondary" align="center">
                  No attributes configured for this position. Using overall rating as fallback.
                </Typography>
              </Grid>
            ) : (
              Object.entries(weights).map(([attr, weight]) => {
                const isDefault = weight === defaultWeights[attr];
                return (
                  <Grid item xs={12} sm={6} md={4} key={attr}>
                    <Card variant={isDefault ? "outlined" : "elevation"}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {ATTRIBUTE_DISPLAY_NAMES[attr] || attr}
                          </Typography>
                          {!isDefault && (
                            <Chip 
                              label="Custom" 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Slider
                          value={weight}
                          onChange={(e, value) => handleWeightChange(attr, value)}
                          min={0}
                          max={3}
                          step={0.1}
                          marks={[
                            { value: 0, label: '0' },
                            { value: 1.5, label: '1.5' },
                            { value: 3, label: '3' },
                          ]}
                          valueLabelDisplay="auto"
                        />
                        {defaultWeights[attr] && (
                          <Typography variant="caption" color="text.secondary">
                            Default: {defaultWeights[attr]}
                          </Typography>
                        )}
                      </CardContent>
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
    </Container>
  );
};

export default StudScoreConfig;
