import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Snackbar,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import depthChartService from '../services/depthChartService';

const DepthChart = () => {
  const { id: dynastyId } = useParams();
  const navigate = useNavigate();
  const [configOpen, setConfigOpen] = useState(false);
  const [configValues, setConfigValues] = useState({});
  const [configDefaults, setConfigDefaults] = useState({});
  const [configSaving, setConfigSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const getErrorMessage = (err, fallbackMessage) => err?.response?.data?.error || fallbackMessage;

  const handleOpenConfig = async () => {
    try {
      const data = await depthChartService.getMappingConfig(dynastyId);
      const defaults = data.defaults || {};
      const activeConfig = data.depthChartMapping || defaults;
      setConfigDefaults(defaults);
      setConfigValues(
        Object.fromEntries(
          Object.entries(activeConfig.slots || {}).map(([slot, slotConfig]) => [
            slot,
            (slotConfig.rules || [])
              .map(rule => `${rule.position}${rule.archetype ? ` | ${rule.archetype}` : ''}`)
              .join('\n')
          ])
        )
      );
      setConfigOpen(true);
    } catch (err) {
      console.error('Failed to load config:', err);
      setSnackbar({ open: true, message: 'Failed to load configuration.', severity: 'error' });
    }
  };

  const handleConfigChange = (slot, value) => {
    setConfigValues(prev => ({
      ...prev,
      [slot]: value
    }));
  };

  const handleResetDefaults = () => {
    setConfigValues(
      Object.fromEntries(
        Object.entries(configDefaults.slots || {}).map(([slot, slotConfig]) => [
          slot,
          (slotConfig.rules || [])
            .map(rule => `${rule.position}${rule.archetype ? ` | ${rule.archetype}` : ''}`)
            .join('\n')
        ])
      )
    );
  };

  const handleSaveConfig = async () => {
    try {
      setConfigSaving(true);
      const parsedSlots = {};
      Object.entries(configValues).forEach(([slot, rawRules]) => {
        const rules = String(rawRules || '')
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => {
            const [positionPart, archetypePart] = line.split('|').map(value => value.trim());
            return {
              position: positionPart,
              archetype: archetypePart || undefined
            };
          });
        parsedSlots[slot] = { rules };
      });

      await depthChartService.saveMappingConfig(dynastyId, { slots: parsedSlots });
      setConfigOpen(false);
      setSnackbar({ open: true, message: 'Depth chart mapping configuration saved.', severity: 'success' });
    } catch (err) {
      console.error('Failed to save config:', err);
      const errorMessage = getErrorMessage(err, 'Failed to save configuration.');
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setConfigSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      await depthChartService.resetMappingConfig(dynastyId);
      handleResetDefaults();
      setSnackbar({ open: true, message: 'Defaults restored.', severity: 'success' });
    } catch (err) {
      console.error('Failed to reset config:', err);
      const errorMessage = getErrorMessage(err, 'Failed to reset configuration.');
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/dynasties/${dynastyId}/roster`)}
          >
            Back to Roster
          </Button>
          <Typography variant="h4" component="h1">Depth Chart</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={handleOpenConfig}
        >
          Configure Slot Mapping
        </Button>
      </Box>

      <Typography>View and manage your depth chart.</Typography>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onClose={() => setConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Configure Depth Chart Slot Mapping</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Ordered rules are evaluated top-to-bottom for each slot entry. Use one rule per line in the format
            <strong> POSITION</strong> or <strong>POSITION | Archetype</strong>.
            These mappings drive both depth chart auto-generation and recruiting demand analysis.
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Slot</TableCell>
                  <TableCell align="center">Count</TableCell>
                  <TableCell>Ordered Rules</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.keys(configDefaults.slots || {}).map(slot => (
                  <TableRow key={slot}>
                    <TableCell><strong>{slot}</strong></TableCell>
                    <TableCell align="center">{configDefaults.slots[slot].count}</TableCell>
                    <TableCell>
                      <TextField
                        multiline
                        minRows={2}
                        fullWidth
                        size="small"
                        placeholder="Example: SAM | Thumper"
                        value={configValues[slot] !== undefined ? configValues[slot] : ''}
                        onChange={(e) => handleConfigChange(slot, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetToDefaults}>Reset to Defaults</Button>
          <Button onClick={() => setConfigOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained" disabled={configSaving}>
            {configSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Container>
  );
};

export default DepthChart;
