import React from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Divider,
} from '@mui/material';
import { ABILITY_LEVELS, getAbilitiesForArchetype } from '../constants/playerAttributes';

/**
 * AbilitySelector Component
 * Renders ability level dropdowns based on position and archetype.
 *
 * Props:
 * - position: Player position (required)
 * - archetype: Player archetype (required)
 * - abilities: Current abilities object { abilityName: level }
 * - onChange: Callback with updated abilities object
 */
const AbilitySelector = ({ position, archetype, abilities = {}, onChange }) => {
  const archetypeAbilities = getAbilitiesForArchetype(position, archetype);

  if (!archetypeAbilities) return null;

  const { physical, mental } = archetypeAbilities;
  const allAbilities = [...physical, ...mental];

  if (allAbilities.length === 0) return null;

  const handleChange = (abilityName, level) => {
    const updated = { ...abilities };
    if (level === 'None' || level === '') {
      delete updated[abilityName];
    } else {
      updated[abilityName] = level;
    }
    onChange(updated);
  };

  const renderAbilityRow = (abilityName) => (
    <Grid item xs={6} sm={4} md={3} key={abilityName}>
      <TextField
        fullWidth
        select
        label={abilityName}
        value={abilities[abilityName] || 'None'}
        onChange={(e) => handleChange(abilityName, e.target.value)}
        SelectProps={{ native: true }}
        size="small"
      >
        {ABILITY_LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </TextField>
    </Grid>
  );

  return (
    <Box>
      {physical.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>
            Physical Abilities
          </Typography>
          <Grid container spacing={2}>
            {physical.map(renderAbilityRow)}
          </Grid>
        </>
      )}
      {mental.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Mental Abilities
          </Typography>
          <Grid container spacing={2}>
            {mental.map(renderAbilityRow)}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default AbilitySelector;
